import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 1. Batches / Flock Management
export const batches = sqliteTable('batches', {
  id: text('id').primaryKey(), // Using cuid2 or similar
  name: text('name').notNull(),
  breed: text('breed'),
  arrivalDate: integer('arrival_date', { mode: 'timestamp' }).notNull(),
  initialQuantity: integer('initial_quantity').notNull(),
  costPerChick: real('cost_per_chick').notNull(),
  status: text('status', { enum: ['active', 'closed'] }).default('active').notNull(),
});

// 2. Daily Tracking
export const dailyLogs = sqliteTable('daily_logs', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').references(() => batches.id, { onDelete: 'cascade' }).notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  mortality: integer('mortality').default(0).notNull(),
  feedConsumed: real('feed_consumed').default(0).notNull(), // e.g., in kg or bags
  waterConsumed: real('water_consumed').default(0).notNull(), // in liters
  medications: text('medications'), // Administered meds/vaccines
  notes: text('notes'),
});

// 3. Inventory Management
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', { enum: ['feed', 'medicine', 'packaging', 'other'] }).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(), // 'kg', 'bag', 'ml', etc.
  lastUpdated: integer('last_updated', { mode: 'timestamp' }),
});

// 4. Client Registry
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
});

// 5. Sales Management
export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').references(() => batches.id).notNull(),
  clientId: text('client_id').references(() => clients.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  amountPaid: real('amount_paid').default(0).notNull(),
  type: text('type', { enum: ['wholesale', 'retail'] }).notNull(),
});

// 6. Debt & Credit Management (Payments)
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  clientId: text('client_id').references(() => clients.id).notNull(),
  saleId: text('sale_id').references(() => sales.id), // Optional: link to specific sale
  date: integer('date', { mode: 'timestamp' }).notNull(),
  amount: real('amount').notNull(),
  method: text('method').default('cash').notNull(),
});

// 7. Expense Management
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  amount: real('amount').notNull(),
  category: text('category', { enum: ['feed', 'medication', 'transport', 'utilities', 'salaries', 'other'] }).notNull(),
  description: text('description'),
  batchId: text('batch_id').references(() => batches.id), // Optional link to a specific batch
});
