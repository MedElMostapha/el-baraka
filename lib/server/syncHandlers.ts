import { db } from '@/db';
import {
  batches,
  clients,
  dailyLogs,
  debts,
  expenses,
  inventory,
  payments,
  sales,
  syncMutations,
  appSettings,
} from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { OfflineOperation, SyncResult, SyncResultStatus } from '@/lib/offline/types';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class SyncError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const createClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

const createDailyLogSchema = z.object({
  id: z.string().min(1),
  batchId: z.string().min(1),
  date: z.string().min(1),
  mortality: z.number().min(0),
  feedConsumedBags: z.number().min(0),
  waterConsumed: z.number().min(0),
  medications: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const recordSaleSchema = z.object({
  id: z.string().min(1),
  batchId: z.string().min(1),
  clientId: z.string().nullable().optional(),
  date: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  feedConsumedBags: z.number().min(0),
  amountPaid: z.number().min(0),
  type: z.enum(['wholesale', 'retail']),
});

const addExpenseSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  amount: z.number().min(0).optional(),
  unitPrice: z.number().min(0).nullable().optional(),
  quantity: z.number().min(0).nullable().optional(),
  category: z.enum(['feed', 'medication', 'transport', 'utilities', 'salaries', 'other']),
  description: z.string().nullable().optional(),
  batchId: z.string().nullable().optional(),
});

const addInventoryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['feed', 'medicine', 'packaging', 'other']),
  quantity: z.number().min(0),
  unit: z.string().min(1),
});

const addDebtSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  personName: z.string().min(1),
  amount: z.number().min(0.01),
  type: z.enum(['borrowing', 'lending']),
  description: z.string().nullable().optional(),
});

const schemas: Record<string, z.ZodType> = {
  createClient: createClientSchema,
  createDailyLog: createDailyLogSchema,
  recordSale: recordSaleSchema,
  addExpense: addExpenseSchema,
  addInventoryItem: addInventoryItemSchema,
  addDebt: addDebtSchema,
};

type MutationOutcome = {
  entityIds: string[];
  invoiceNumber?: string;
};

async function getKgPerSac(tx: DbTx): Promise<number> {
  const row = await tx.select().from(appSettings).where(eq(appSettings.key, 'kg_per_sac'));
  return row.length > 0 ? parseFloat(row[0].value) || 0 : 0;
}

async function getFeedPricePerSac(tx: DbTx): Promise<number> {
  const row = await tx.select().from(appSettings).where(eq(appSettings.key, 'feed_price_per_sac'));
  return row.length > 0 ? parseFloat(row[0].value) || 0 : 0;
}

function toKg(quantity: number, unit: string, kgPerSac: number): number {
  if ((unit === 'sac' || unit === 'bag') && kgPerSac > 0) return quantity * kgPerSac;
  if (unit === 'g') return quantity / 1000;
  return quantity;
}

function fromKg(kg: number, unit: string, kgPerSac: number): number {
  if ((unit === 'sac' || unit === 'bag') && kgPerSac > 0) return kg / kgPerSac;
  if (unit === 'g') return kg * 1000;
  return kg;
}

async function consumeFeedStock(tx: DbTx, bags: number): Promise<void> {
  if (bags <= 0) return;
  const kgPerSac = await getKgPerSac(tx);
  if (kgPerSac <= 0) throw new SyncError('feed_config_missing', 'kg per sac is not configured');
  const feedItem = (await tx.select().from(inventory).where(eq(inventory.category, 'feed')))[0];
  if (!feedItem) throw new SyncError('feed_stock_missing', 'no feed inventory item exists');
  const amountKg = bags * kgPerSac;
  const existingKg = toKg(feedItem.quantity, feedItem.unit, kgPerSac);
  if (amountKg > existingKg + 0.000001) throw new SyncError('feed_stock_insufficient', 'not enough feed stock');
  const nextQuantity = fromKg(existingKg - amountKg, feedItem.unit, kgPerSac);
  await tx.update(inventory)
    .set({ quantity: nextQuantity, lastUpdated: new Date() })
    .where(eq(inventory.id, feedItem.id));
}

async function createFeedExpense(tx: DbTx, saleId: string | null, batchId: string, bags: number, eventDate: Date): Promise<void> {
  if (bags <= 0) return;
  const unitPrice = await getFeedPricePerSac(tx);
  const existingExpense = saleId
    ? (await tx.select({ id: expenses.id }).from(expenses).where(eq(expenses.saleId, saleId)))[0]
    : undefined;
  const data = {
    date: eventDate,
    amount: bags * unitPrice,
    unitPrice,
    quantity: bags,
    category: 'feed' as const,
    batchId,
    saleId,
  };
  if (existingExpense) {
    await tx.update(expenses).set(data).where(eq(expenses.id, existingExpense.id));
  } else {
    await tx.insert(expenses).values({ id: crypto.randomUUID(), ...data });
  }
}

async function remainingBirds(tx: DbTx, batchId: string, excludeDailyLogId?: string, excludeSaleId?: string): Promise<number> {
  const batch = await tx.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!batch) return 0;
  const mortalityCond = excludeDailyLogId ? sql`${dailyLogs.batchId} = ${batchId} and ${dailyLogs.id} != ${excludeDailyLogId}` : sql`${dailyLogs.batchId} = ${batchId}`;
  const soldCond = excludeSaleId ? sql`${sales.batchId} = ${batchId} and ${sales.id} != ${excludeSaleId}` : sql`${sales.batchId} = ${batchId}`;
  const mortalityResult = await tx.select({ sum: sql<number>`sum(${dailyLogs.mortality})` }).from(dailyLogs).where(mortalityCond);
  const soldResult = await tx.select({ sum: sql<number>`sum(${sales.quantity})` }).from(sales).where(soldCond);
  const mortality = mortalityResult[0]?.sum ?? 0;
  const sold = soldResult[0]?.sum ?? 0;
  return Math.max(0, batch.initialQuantity - mortality - sold);
}

async function maybeCloseBatch(tx: DbTx, batchId: string): Promise<void> {
  const batch = await tx.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!batch) return;
  if ((await remainingBirds(tx, batchId)) <= 0) {
    await tx.update(batches).set({ status: 'closed' }).where(eq(batches.id, batchId));
  }
}

async function handleCreateClient(tx: DbTx, payload: z.infer<typeof createClientSchema>): Promise<MutationOutcome> {
  await tx.insert(clients).values({
    id: payload.id,
    name: payload.name,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
  });
  return { entityIds: [payload.id] };
}

async function handleCreateDailyLog(tx: DbTx, payload: z.infer<typeof createDailyLogSchema>): Promise<MutationOutcome> {
  const batch = await tx.query.batches.findFirst({ where: eq(batches.id, payload.batchId) });
  if (!batch) throw new SyncError('batch_not_found', 'referenced batch does not exist');
  if (batch.status !== 'active') throw new SyncError('batch_closed', 'referenced batch is closed');

  const remaining = await remainingBirds(tx, payload.batchId, payload.id);
  if (payload.mortality > remaining) throw new SyncError('insufficient_birds', 'mortality is greater than the remaining bird count');

  let feedConsumedKg = 0;
  if (payload.feedConsumedBags > 0) {
    const kgPerSac = await getKgPerSac(tx);
    if (kgPerSac <= 0) throw new SyncError('feed_config_missing', 'kg per sac is not configured');
    const feedItem = (await tx.select().from(inventory).where(eq(inventory.category, 'feed')))[0];
    if (!feedItem) throw new SyncError('feed_stock_missing', 'no feed inventory item exists');
    feedConsumedKg = payload.feedConsumedBags * kgPerSac;
    const existingKg = toKg(feedItem.quantity, feedItem.unit, kgPerSac);
    if (feedConsumedKg > existingKg + 0.000001) throw new SyncError('feed_stock_insufficient', 'not enough feed stock');
    await tx.update(inventory)
      .set({ quantity: fromKg(existingKg - feedConsumedKg, feedItem.unit, kgPerSac), lastUpdated: new Date() })
      .where(eq(inventory.id, feedItem.id));
    await createFeedExpense(tx, null, payload.batchId, payload.feedConsumedBags, new Date(payload.date));
  }

  await tx.insert(dailyLogs).values({
    id: payload.id,
    batchId: payload.batchId,
    date: new Date(payload.date),
    mortality: payload.mortality,
    feedConsumed: feedConsumedKg,
    waterConsumed: payload.waterConsumed,
    medications: payload.medications ?? null,
    notes: payload.notes ?? null,
  });

  await maybeCloseBatch(tx, payload.batchId);
  return { entityIds: [payload.id] };
}

async function handleRecordSale(tx: DbTx, payload: z.infer<typeof recordSaleSchema>): Promise<MutationOutcome> {
  const batch = await tx.query.batches.findFirst({ where: eq(batches.id, payload.batchId) });
  if (!batch) throw new SyncError('batch_not_found', 'referenced batch does not exist');
  if (batch.status !== 'active') throw new SyncError('batch_closed', 'referenced batch is closed');

  if (payload.clientId) {
    const client = await tx.query.clients.findFirst({ where: eq(clients.id, payload.clientId) });
    if (!client) throw new SyncError('client_not_found', 'referenced client does not exist');
  }

  const remaining = await remainingBirds(tx, payload.batchId, undefined, payload.id);
  if (payload.quantity > remaining) throw new SyncError('insufficient_birds', 'sale quantity is greater than the remaining bird count');

  if (payload.feedConsumedBags > 0) {
    await consumeFeedStock(tx, payload.feedConsumedBags);
  }

  const totalPrice = payload.quantity * payload.unitPrice;
  const amountPaid = Math.min(Math.max(payload.amountPaid, 0), totalPrice);
  const invoiceNumber = `INV-${new Date(payload.date).getFullYear()}-${payload.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  await tx.insert(sales).values({
    id: payload.id,
    batchId: payload.batchId,
    clientId: payload.clientId ?? null,
    date: new Date(payload.date),
    quantity: payload.quantity,
    unitPrice: payload.unitPrice,
    totalPrice,
    amountPaid,
    feedConsumedBags: payload.feedConsumedBags,
    type: payload.type,
    invoiceNumber,
  });

  await createFeedExpense(tx, payload.id, payload.batchId, payload.feedConsumedBags, new Date(payload.date));

  if (amountPaid > 0 && payload.clientId) {
    await tx.insert(payments).values({
      id: crypto.randomUUID(),
      clientId: payload.clientId,
      saleId: payload.id,
      amount: amountPaid,
      date: new Date(payload.date),
      method: 'cash',
    });
  }

  await maybeCloseBatch(tx, payload.batchId);
  return { entityIds: [payload.id], invoiceNumber };
}

async function handleAddExpense(tx: DbTx, payload: z.infer<typeof addExpenseSchema>): Promise<MutationOutcome> {
  if (payload.batchId) {
    const batch = await tx.query.batches.findFirst({ where: eq(batches.id, payload.batchId) });
    if (!batch) throw new SyncError('batch_not_found', 'referenced batch does not exist');
  }
  const amount = payload.amount ?? (payload.unitPrice && payload.quantity ? payload.unitPrice * payload.quantity : undefined);
  if (amount === undefined || amount <= 0) throw new SyncError('validation_failed', 'expense amount must be greater than zero');

  await tx.insert(expenses).values({
    id: payload.id,
    date: new Date(payload.date),
    amount,
    unitPrice: payload.unitPrice ?? null,
    quantity: payload.quantity ?? null,
    category: payload.category,
    description: payload.description ?? null,
    batchId: payload.batchId ?? null,
    saleId: null,
  });
  return { entityIds: [payload.id] };
}

async function handleAddInventoryItem(tx: DbTx, payload: z.infer<typeof addInventoryItemSchema>): Promise<MutationOutcome> {
  const existing = (await tx.select().from(inventory).where(
    sql`${inventory.name} = ${payload.name} and ${inventory.category} = ${payload.category}`
  ))[0];

  if (existing) {
    const kgPerSac = await getKgPerSac(tx);
    const existingKg = toKg(existing.quantity, existing.unit, kgPerSac);
    const addedKg = toKg(payload.quantity, payload.unit, kgPerSac);
    await tx.update(inventory)
      .set({ quantity: fromKg(existingKg + addedKg, existing.unit, kgPerSac), lastUpdated: new Date() })
      .where(eq(inventory.id, existing.id));
    return { entityIds: [existing.id] };
  }

  await tx.insert(inventory).values({
    id: payload.id,
    name: payload.name,
    category: payload.category,
    quantity: payload.quantity,
    unit: payload.unit,
    lastUpdated: new Date(),
  });
  return { entityIds: [payload.id] };
}

async function handleAddDebt(tx: DbTx, payload: z.infer<typeof addDebtSchema>): Promise<MutationOutcome> {
  await tx.insert(debts).values({
    id: payload.id,
    personName: payload.personName,
    amount: payload.amount,
    type: payload.type,
    description: payload.description ?? null,
    date: new Date(payload.date),
    isPaid: false,
    paidDate: null,
  });
  return { entityIds: [payload.id] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<string, (tx: DbTx, payload: any) => Promise<MutationOutcome>> = {
  createClient: handleCreateClient,
  createDailyLog: handleCreateDailyLog,
  recordSale: handleRecordSale,
  addExpense: handleAddExpense,
  addInventoryItem: handleAddInventoryItem,
  addDebt: handleAddDebt,
};

function parseStoredResult(result: string | null): { entityIds: string[]; invoiceNumber?: string } {
  try {
    if (result) {
      const parsed = JSON.parse(result);
      return { entityIds: Array.isArray(parsed.entityIds) ? parsed.entityIds : [], invoiceNumber: parsed.invoiceNumber };
    }
  } catch {
    // fall through
  }
  return { entityIds: [] };
}

function buildResult(operationId: string, status: SyncResultStatus, outcome: { entityIds: string[]; invoiceNumber?: string }, errorCode?: string, errorMessage?: string): SyncResult {
  const result: SyncResult = { operationId, status, entityIds: outcome.entityIds };
  if (outcome.invoiceNumber) result.invoiceNumber = outcome.invoiceNumber;
  if (errorCode) result.errorCode = errorCode;
  if (errorMessage) result.errorMessage = errorMessage;
  return result;
}

async function readExistingOperation(operationId: string): Promise<SyncResult | null> {
  const row = (await db.select().from(syncMutations).where(eq(syncMutations.operationId, operationId)))[0];
  if (!row) return null;
  const outcome = parseStoredResult(row.result);
  if (row.status === 'applied') {
    return buildResult(operationId, 'duplicate', outcome);
  }
  return buildResult(operationId, 'rejected', { entityIds: [] }, row.errorCode ?? 'rejected', row.result ?? undefined);
}

export async function applyOperation(deviceId: string, operation: OfflineOperation): Promise<SyncResult> {
  const schema = schemas[operation.type];
  if (!schema) {
    return buildResult(operation.operationId, 'rejected', { entityIds: [] }, 'unsupported_type', `Unsupported operation type: ${operation.type}`);
  }

  const parsed = schema.safeParse(operation.payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return buildResult(operation.operationId, 'rejected', { entityIds: [] }, 'validation_failed', first ? first.message : 'Invalid payload');
  }

  const handler = handlers[operation.type];
  if (!handler) {
    return buildResult(operation.operationId, 'rejected', { entityIds: [] }, 'unsupported_type', `Unsupported operation type: ${operation.type}`);
  }

  try {
    const result = await db.transaction(async (tx) => {
      const existing = (await tx.select().from(syncMutations).where(eq(syncMutations.operationId, operation.operationId)))[0];
      if (existing) {
        const outcome = parseStoredResult(existing.result);
        if (existing.status === 'applied') {
          return buildResult(operation.operationId, 'duplicate', outcome);
        }
        return buildResult(operation.operationId, 'rejected', { entityIds: [] }, existing.errorCode ?? 'rejected', existing.result ?? undefined);
      }

      await tx.insert(syncMutations).values({
        operationId: operation.operationId,
        deviceId,
        operationType: operation.type,
        status: 'processing',
        createdAt: new Date(operation.createdAt),
      });

      try {
        const outcome = await handler(tx, parsed.data);
        await tx.update(syncMutations)
          .set({ status: 'applied', result: JSON.stringify(outcome), processedAt: new Date() })
          .where(eq(syncMutations.operationId, operation.operationId));
        return buildResult(operation.operationId, 'applied', outcome);
      } catch (error) {
        const code = error instanceof SyncError ? error.code : 'internal_error';
        const message = error instanceof Error ? error.message : String(error);
        await tx.update(syncMutations)
          .set({ status: 'rejected', errorCode: code, result: message, processedAt: new Date() })
          .where(eq(syncMutations.operationId, operation.operationId));
        const status: SyncResultStatus = code === 'validation_failed' || code === 'unsupported_type' ? 'rejected' : 'conflict';
        return buildResult(operation.operationId, status, { entityIds: [] }, code, message);
      }
    });
    return result;
  } catch (error) {
    const existing = await readExistingOperation(operation.operationId);
    if (existing) return existing;
    const code = error instanceof Error ? 'internal_error' : 'internal_error';
    return buildResult(operation.operationId, 'conflict', { entityIds: [] }, code, error instanceof Error ? error.message : 'Unknown error');
  }
}
