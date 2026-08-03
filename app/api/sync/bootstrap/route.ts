import { db } from '@/db';
import { batches, dailyLogs, inventory, clients, sales, payments, expenses, debts, restocks, appSettings } from '@/db/schema';
import type { SyncSnapshot } from '@/lib/offline/types';

export const dynamic = 'force-dynamic';

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function isoString(value: Date | null | undefined): string {
  return value ? value.toISOString() : '';
}

export async function GET() {
  try {
    const [
      batchesRows,
      dailyLogsRows,
      inventoryRows,
      clientsRows,
      salesRows,
      paymentsRows,
      expensesRows,
      debtsRows,
      restocksRows,
      settingsRows,
    ] = await Promise.all([
      db.select().from(batches),
      db.select().from(dailyLogs),
      db.select().from(inventory),
      db.select().from(clients),
      db.select().from(sales),
      db.select().from(payments),
      db.select().from(expenses),
      db.select().from(debts),
      db.select().from(restocks),
      db.select().from(appSettings),
    ]);

    const snapshot: SyncSnapshot = {
      schemaVersion: 1,
      serverTime: new Date().toISOString(),
      data: {
        batches: batchesRows.map((row) => ({
          id: row.id,
          name: row.name,
          breed: row.breed,
          arrivalDate: isoString(row.arrivalDate),
          initialQuantity: row.initialQuantity,
          costPerChick: row.costPerChick,
          feedStock: row.feedStock,
          status: row.status,
        })),
        dailyLogs: dailyLogsRows.map((row) => ({
          id: row.id,
          batchId: row.batchId,
          date: isoString(row.date),
          mortality: row.mortality,
          feedConsumed: row.feedConsumed,
          waterConsumed: row.waterConsumed,
          medications: row.medications,
          notes: row.notes,
        })),
        inventory: inventoryRows.map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          quantity: row.quantity,
          unit: row.unit,
          lastUpdated: iso(row.lastUpdated),
        })),
        clients: clientsRows.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          address: row.address,
        })),
        sales: salesRows.map((row) => ({
          id: row.id,
          batchId: row.batchId,
          clientId: row.clientId,
          date: isoString(row.date),
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          totalPrice: row.totalPrice,
          amountPaid: row.amountPaid,
          feedConsumedBags: row.feedConsumedBags,
          type: row.type,
          invoiceNumber: row.invoiceNumber,
        })),
        payments: paymentsRows.map((row) => ({
          id: row.id,
          clientId: row.clientId,
          saleId: row.saleId,
          date: isoString(row.date),
          amount: row.amount,
          method: row.method,
        })),
        expenses: expensesRows.map((row) => ({
          id: row.id,
          date: isoString(row.date),
          amount: row.amount,
          unitPrice: row.unitPrice,
          quantity: row.quantity,
          category: row.category,
          description: row.description,
          batchId: row.batchId,
          saleId: row.saleId,
        })),
        debts: debtsRows.map((row) => ({
          id: row.id,
          personName: row.personName,
          amount: row.amount,
          type: row.type,
          description: row.description,
          date: isoString(row.date),
          isPaid: row.isPaid,
          paidDate: iso(row.paidDate),
        })),
        restocks: restocksRows.map((row) => ({
          id: row.id,
          batchId: row.batchId,
          quantity: row.quantity,
          costPerChick: row.costPerChick,
          date: isoString(row.date),
        })),
        settings: Object.fromEntries(settingsRows.map((row) => [row.key, row.value])),
      },
    };

    return Response.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Bootstrap sync failed:', error);
    return Response.json({ error: 'Failed to read database' }, { status: 500 });
  }
}
