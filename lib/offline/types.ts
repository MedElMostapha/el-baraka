export const OFFLINE_DB_NAME = 'el-baraka-offline';
export const OFFLINE_SCHEMA_VERSION = 1;

export const STORE_NAMES = {
  metadata: 'metadata',
  batches: 'batches',
  dailyLogs: 'dailyLogs',
  inventory: 'inventory',
  clients: 'clients',
  sales: 'sales',
  payments: 'payments',
  expenses: 'expenses',
  debts: 'debts',
  restocks: 'restocks',
  settings: 'settings',
  outbox: 'outbox',
  syncConflicts: 'syncConflicts',
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

export type LocalSyncState = 'synced' | 'pending' | 'conflict';

export interface LocalRecordMeta {
  id: string;
  _syncState?: LocalSyncState;
  _operationId?: string;
  _localUpdatedAt?: string;
}

export type OfflineOperationType =
  | 'createClient'
  | 'createDailyLog'
  | 'recordSale'
  | 'addExpense'
  | 'addInventoryItem'
  | 'addDebt';

export type OfflineOperationStatus = 'pending' | 'sending' | 'conflict';

export interface OfflineOperation {
  operationId: string;
  deviceId: string;
  type: OfflineOperationType;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  dependsOn: string[];
  attempts: number;
  status: OfflineOperationStatus;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}

export interface CachedBatch extends LocalRecordMeta {
  id: string;
  name: string;
  breed: string | null;
  arrivalDate: string;
  initialQuantity: number;
  costPerChick: number;
  feedStock: number;
  status: 'active' | 'closed';
}

export interface CachedDailyLog extends LocalRecordMeta {
  id: string;
  batchId: string;
  date: string;
  mortality: number;
  feedConsumed: number;
  waterConsumed: number;
  medications: string | null;
  notes: string | null;
}

export interface CachedInventoryItem extends LocalRecordMeta {
  id: string;
  name: string;
  category: 'feed' | 'medicine' | 'packaging' | 'other';
  quantity: number;
  unit: string;
  lastUpdated: string | null;
}

export interface CachedClient extends LocalRecordMeta {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export interface CachedSale extends LocalRecordMeta {
  id: string;
  batchId: string;
  clientId: string | null;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  amountPaid: number;
  feedConsumedBags: number;
  type: 'wholesale' | 'retail';
  invoiceNumber: string | null;
}

export interface CachedPayment extends LocalRecordMeta {
  id: string;
  clientId: string;
  saleId: string | null;
  date: string;
  amount: number;
  method: string;
}

export interface CachedExpense extends LocalRecordMeta {
  id: string;
  date: string;
  amount: number;
  unitPrice: number | null;
  quantity: number | null;
  category: 'feed' | 'medication' | 'transport' | 'utilities' | 'salaries' | 'other';
  description: string | null;
  batchId: string | null;
  saleId: string | null;
}

export interface CachedDebt extends LocalRecordMeta {
  id: string;
  personName: string;
  amount: number;
  type: 'borrowing' | 'lending';
  description: string | null;
  date: string;
  isPaid: boolean;
  paidDate: string | null;
}

export interface CachedRestock extends LocalRecordMeta {
  id: string;
  batchId: string;
  quantity: number;
  costPerChick: number;
  date: string;
}

export interface SyncSnapshotData {
  batches: CachedBatch[];
  dailyLogs: CachedDailyLog[];
  inventory: CachedInventoryItem[];
  clients: CachedClient[];
  sales: CachedSale[];
  payments: CachedPayment[];
  expenses: CachedExpense[];
  debts: CachedDebt[];
  restocks: CachedRestock[];
  settings: Record<string, string>;
}

export interface SyncSnapshot {
  schemaVersion: number;
  serverTime: string;
  data: SyncSnapshotData;
}

export type CachedData = SyncSnapshotData;

export type SyncResultStatus = 'applied' | 'duplicate' | 'conflict' | 'rejected';

export interface SyncResult {
  operationId: string;
  status: SyncResultStatus;
  entityIds: string[];
  invoiceNumber?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface SyncRequest {
  deviceId: string;
  operations: OfflineOperation[];
}

export interface SyncResponse {
  serverTime: string;
  results: SyncResult[];
}

export const MAX_OPERATIONS_PER_REQUEST = 20;

export const OFFLINE_INVOICE_PLACEHOLDER = 'PENDING-XXXXXXXX';
