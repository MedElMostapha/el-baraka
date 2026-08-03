# Offline Feature Implementation Plan

## Objective

Allow a farm worker to continue recording essential operations when the internet connection is unavailable, then synchronize those operations safely when the connection returns.

The offline feature must not silently lose data, create duplicate sales, or hide synchronization conflicts.

## Current Architecture

The application currently has these constraints:

- Next.js 16 with React 19 and TypeScript.
- Server-rendered pages read directly from Turso/libSQL through Drizzle.
- Client forms call server actions directly.
- PWA support is configured in `next.config.ts` through `@ducanh2912/next-pwa`.
- PWA generation is disabled during development and must be tested with a production build.
- There is no IndexedDB layer, offline queue, sync endpoint, or authentication.
- Database mutations generate many IDs and timestamps on the server.
- There is no authentication or farm tenant boundary yet.

The offline implementation must use IndexedDB for local data and an HTTP sync endpoint for queued operations. Do not use the service worker as the primary database.

## Scope

### MVP offline capabilities

The MVP must support these operations while offline:

- View the most recently synchronized batches, clients, inventory, sales, expenses, debts, and daily logs.
- Create a daily log.
- Record a sale.
- Create a client while recording a sale.
- Add an expense.
- Add inventory stock.
- Add a manual debt.
- See newly created offline records immediately with a pending status.
- Synchronize pending operations automatically after reconnecting.
- Start synchronization manually from the status control.
- See failed operations and understandable conflict messages.

### MVP operations that remain online-only

Do not queue these operations in the first version:

- Edit or delete sales.
- Mark a sale paid or unpaid.
- Edit or delete expenses.
- Edit or delete inventory.
- Edit or delete debts.
- Create, edit, close, or reopen batches.
- Change application settings.
- Download or share invoices before synchronization.

For these actions, show a localized message explaining that an internet connection is required. Add support for them only after the create-operation flow is stable.

### Important behavior

- Offline invoice numbers must use a visible placeholder such as `PENDING-XXXXXXXX`.
- An offline sale must be saved locally even if invoice generation is unavailable.
- Once the sale synchronizes, replace the placeholder with the real invoice number.
- WhatsApp sharing and PDF download must be offered again after successful synchronization.
- Local data is a cache, not a replacement for the server database.
- The server remains the authority for stock, bird counts, batch status, payments, and invoice numbers.

## Recommended Design

Use these layers:

1. **IndexedDB local store** for cached records and the outbox.
2. **Offline repository** for reading cached data and queueing mutations.
3. **Sync manager** for retrying queued operations and merging server results.
4. **Sync API** for bootstrap snapshots and idempotent mutation processing.
5. **Offline-aware client pages** for reading local data and showing pending states.
6. **PWA runtime caching** for the application shell and static assets.

Use the `idb` package rather than writing raw IndexedDB wrappers. Keep all browser-only code under `lib/offline/` or client components. Never import IndexedDB code into a server component, server action, or route handler.

## Data Model

### Server sync table

Add a `sync_mutations` table to `db/schema.ts`:

```ts
export const syncMutations = sqliteTable('sync_mutations', {
  operationId: text('operation_id').primaryKey(),
  deviceId: text('device_id').notNull(),
  operationType: text('operation_type').notNull(),
  status: text('status', { enum: ['processing', 'applied', 'rejected'] }).notNull(),
  result: text('result'),
  errorCode: text('error_code'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
});
```

The `operationId` primary key provides idempotency. Retrying the same operation must never create a second sale, client, expense, inventory update, debt, or daily log.

Generate a Drizzle migration after changing the schema. Do not edit existing migration files.

### IndexedDB stores

Create an IndexedDB database named `el-baraka-offline` with versioned stores:

- `metadata`: `deviceId`, `schemaVersion`, `lastBootstrapAt`, `lastSyncAt`.
- `batches`: cached batch records keyed by `id`.
- `dailyLogs`: cached daily-log records keyed by `id`.
- `inventory`: cached inventory records keyed by `id`.
- `clients`: cached client records keyed by `id`.
- `sales`: cached sale records keyed by `id`.
- `payments`: cached payment records keyed by `id`.
- `expenses`: cached expense records keyed by `id`.
- `debts`: cached debt records keyed by `id`.
- `restocks`: cached restock records keyed by `id`.
- `settings`: cached setting values keyed by `key`.
- `outbox`: queued mutation envelopes keyed by `operationId`.
- `syncConflicts`: rejected operations keyed by `operationId`.

Store dates as ISO strings in IndexedDB and convert them at the UI boundary. This keeps local records and API payloads JSON-compatible.

### Local record metadata

Cached records may include local-only fields that are not sent to the server:

```ts
type LocalSyncState = 'synced' | 'pending' | 'conflict';

type LocalRecordMeta = {
  _syncState?: LocalSyncState;
  _operationId?: string;
  _localUpdatedAt?: string;
};
```

Do not add these fields to the server database tables.

### Outbox envelope

Create a discriminated union for supported operations:

```ts
type OfflineOperationType =
  | 'createClient'
  | 'createDailyLog'
  | 'recordSale'
  | 'addExpense'
  | 'addInventoryItem'
  | 'addDebt';

type OfflineOperation = {
  operationId: string;
  deviceId: string;
  type: OfflineOperationType;
  entityId: string;
  payload: unknown;
  createdAt: string;
  dependsOn: string[];
  attempts: number;
  status: 'pending' | 'sending' | 'conflict';
  lastErrorCode?: string;
  lastErrorMessage?: string;
};
```

Every queued operation must have a client-generated UUID for both `operationId` and `entityId`.

## File Plan

### New files

Create these files with small, focused responsibilities:

- `lib/offline/types.ts`: IndexedDB records, operation types, API response types, and sync state types.
- `lib/offline/db.ts`: `idb` database definition, store names, migrations, and typed access.
- `lib/offline/repository.ts`: read/write cached entities, replace snapshots, merge operation results, and count pending records.
- `lib/offline/outbox.ts`: enqueue, list, mark sending, mark applied, mark conflict, retry, and clear operations.
- `lib/offline/sync.ts`: `bootstrap()`, `syncPendingOperations()`, retry policy, and online event integration.
- `lib/offline/useOfflineStatus.ts`: client hook exposing `online`, `syncing`, `pendingCount`, `conflictCount`, and `lastSyncAt`.
- `components/OfflineProvider.tsx`: initializes IndexedDB and starts synchronization after hydration.
- `components/OfflineStatus.tsx`: displays connection and synchronization state with a manual sync action.
- `components/OfflineBanner.tsx`: displays a compact offline warning without blocking form entry.
- `app/api/sync/bootstrap/route.ts`: returns the current server snapshot.
- `app/api/sync/mutations/route.ts`: accepts and processes queued operations.
- `lib/server/syncHandlers.ts`: server-side operation dispatcher and reusable mutation handlers.

### Existing files to update

- `package.json`: add `idb` and test scripts/dependencies if needed.
- `db/schema.ts`: add `syncMutations`.
- `app/[locale]/layout.tsx`: mount `OfflineProvider`, `OfflineStatus`, and `OfflineBanner`.
- `next.config.ts`: configure PWA runtime caching without caching mutation requests.
- `actions/sales.ts`: extract reusable server mutation logic and accept explicit IDs/date values for sync operations.
- `actions/daily-log.ts`: extract reusable server mutation logic and accept the event date.
- `actions/expenses.ts`: extract reusable server mutation logic and accept explicit IDs/date values.
- `actions/inventory.ts`: extract reusable server mutation logic and accept explicit IDs/date values.
- `actions/debts.ts`: extract reusable server mutation logic and accept explicit IDs/date values.
- `components/SalesForm.tsx`: choose online server action or offline queue, support temporary invoice status, and show sync state.
- `components/DailyLogForm.tsx`: choose online server action or offline queue.
- `components/ExpenseForm.tsx`: choose online server action or offline queue.
- `components/InventoryForm.tsx`: choose online server action or offline queue.
- `components/DebtForm.tsx`: choose online server action or offline queue.
- `app/[locale]/sales/page.tsx`: use an offline-aware client container for cached sales, batches, and clients.
- `app/[locale]/expenses/page.tsx`: use cached expenses and batches when offline.
- `app/[locale]/inventory/page.tsx`: use cached inventory when offline.
- `app/[locale]/debts/page.tsx`: use cached debts and receivables when offline.
- `app/[locale]/page.tsx`: use cached dashboard values when offline and show when data was last synchronized.
- `messages/fr.json`: add all offline and sync translations.
- `messages/ar.json`: add the same translation keys in Arabic.

## Server API

### Bootstrap endpoint

Implement `GET /api/sync/bootstrap`.

The endpoint must:

1. Read batches, daily logs, inventory, clients, sales, payments, expenses, debts, restocks, and app settings.
2. Serialize every date to an ISO string.
3. Return a single consistent snapshot.
4. Return `serverTime` as an ISO string.
5. Return a `schemaVersion` number.
6. Return an error with a non-200 response if the database cannot be read.

Response shape:

```json
{
  "schemaVersion": 1,
  "serverTime": "2026-08-03T12:00:00.000Z",
  "data": {
    "batches": [],
    "dailyLogs": [],
    "inventory": [],
    "clients": [],
    "sales": [],
    "payments": [],
    "expenses": [],
    "debts": [],
    "restocks": [],
    "settings": {}
  }
}
```

For the MVP, use a complete snapshot instead of incremental synchronization. The farm is currently small and this is simpler and safer. Add cursor-based incremental sync only after measuring snapshot size.

### Mutation endpoint

Implement `POST /api/sync/mutations`.

Request shape:

```json
{
  "deviceId": "device-uuid",
  "operations": [
    {
      "operationId": "operation-uuid",
      "type": "createDailyLog",
      "entityId": "daily-log-uuid",
      "payload": {},
      "createdAt": "2026-08-03T12:00:00.000Z",
      "dependsOn": []
    }
  ]
}
```

Response shape:

```json
{
  "serverTime": "2026-08-03T12:00:00.000Z",
  "results": [
    {
      "operationId": "operation-uuid",
      "status": "applied",
      "entityIds": ["daily-log-uuid"]
    }
  ]
}
```

Allowed result statuses:

- `applied`: operation was committed.
- `duplicate`: operation was already committed earlier; return the stored result.
- `conflict`: operation is valid locally but cannot be applied to current server state.
- `rejected`: payload is invalid or unsupported.

Process operations in dependency order. A request may contain at most 20 operations. Return a result for every operation even if one operation fails.

## Server Mutation Rules

### Idempotency

For every operation:

1. Start a database transaction.
2. Look up `operationId` in `sync_mutations`.
3. If it is already `applied`, return the stored result without running the mutation again.
4. If it is already `rejected`, return the stored error.
5. Insert a `processing` record.
6. Run the domain mutation in the same transaction.
7. Store the result as `applied` or `rejected`.
8. Commit the transaction.

If a unique constraint occurs while inserting the operation, read the existing record and return its stored result. This handles two tabs retrying the same operation.

### Explicit IDs and timestamps

The sync handler must use the client-supplied `entityId` and `createdAt` values. Do not generate a new ID or replace the event date with `new Date()` for offline operations.

Keep existing online behavior compatible by allowing the existing server actions to generate IDs and dates when those values are not supplied.

### Supported operation payloads

Use the existing form payloads, adding only the fields required for offline operation:

- `createClient`: `id`, `name`, `phone`, `address`, `createdAt`.
- `createDailyLog`: `id`, `batchId`, `date`, `mortality`, `feedConsumedBags`, `waterConsumed`, `medications`, `notes`.
- `recordSale`: `id`, `batchId`, `clientId`, `date`, `quantity`, `unitPrice`, `feedConsumedBags`, `amountPaid`, `type`.
- `addExpense`: `id`, `date`, `amount`, `unitPrice`, `quantity`, `category`, `description`, `batchId`.
- `addInventoryItem`: `id`, `name`, `category`, `quantity`, `unit`.
- `addDebt`: `id`, `date`, `personName`, `amount`, `type`, `description`.

Validate each payload with a shared Zod schema on the server. Do not trust form validation or values from IndexedDB.

### Dependency handling

When a user creates a client offline and then uses that client in an offline sale:

- Generate the client ID locally.
- Add the client operation ID to the sale operation's `dependsOn` list.
- Send the client operation before the sale operation.
- Do not send a dependent sale while its client operation is pending or conflicted.

Cash sales do not need a client dependency.

### Conflict rules

The server must reject an operation with a stable error code when:

- The referenced batch does not exist.
- The referenced batch is closed.
- The sale quantity is greater than the current remaining bird count.
- Mortality is greater than the current remaining bird count.
- Feed stock is insufficient.
- The referenced client does not exist after dependency processing.
- The payload fails validation.

Never silently reduce a sale quantity, mortality value, or feed quantity to make an operation pass.

## Local Repository Behavior

### Bootstrap

On first app load:

1. Open the IndexedDB database.
2. Create a stable `deviceId` if one does not exist.
3. If online, fetch `/api/sync/bootstrap`.
4. Replace cached server stores atomically.
5. Preserve local pending records and reapply their optimistic state after the replacement.
6. Set `lastBootstrapAt` and `lastSyncAt`.

If offline and cached data exists, render the cached data immediately. If no cache exists, show a clear first-use message asking the user to connect once before using offline mode.

### Queueing a mutation

The form workflow must be:

1. Validate the form locally for immediate feedback.
2. Build a payload with an explicit entity ID and event timestamp.
3. If online, call the normal server action.
4. If the action fails because of a network error, enqueue the operation instead of showing a generic failure.
5. If offline, enqueue the operation immediately.
6. Apply the record optimistically to IndexedDB with `_syncState: 'pending'`.
7. Update the visible list without requiring a full page refresh.
8. Show a pending sync indicator.

Do not enqueue operations when the server explicitly returns a validation or business-rule error. Only network failures should automatically move an online request into the outbox.

### Synchronization

Trigger synchronization on:

- `window` `online` event.
- Provider initialization when `navigator.onLine` is true.
- App visibility returning to the foreground.
- Manual `Sync now` action.
- A low-frequency timer while the app is open and online.

Sync behavior:

1. Do nothing if already synchronizing.
2. Read pending operations ordered by creation time.
3. Skip operations whose dependencies are not applied.
4. Send at most 20 operations per request.
5. Mark sent operations as `sending` before the request.
6. On network failure, return them to `pending` and schedule retry.
7. On `applied` or `duplicate`, mark the operation complete and clear its local pending flag.
8. On `conflict` or `rejected`, move it to `syncConflicts` and mark its local record as `conflict`.
9. Fetch a fresh bootstrap snapshot after at least one operation succeeds.
10. Broadcast the updated status to all open tabs.

Use exponential retry delays such as 5 seconds, 30 seconds, 2 minutes, and 10 minutes. Do not retry a conflict indefinitely.

## UI Requirements

### Global status control

Add the status control to `app/[locale]/layout.tsx` so it is visible on every route.

States to display:

- `Offline`: no network connection; new records will be saved on this device.
- `Syncing`: operations are being uploaded.
- `Pending`: number of queued operations.
- `Up to date`: no pending operations and a successful recent sync.
- `Needs attention`: one or more operations need user review.

The control must include:

- A localized label.
- Pending count.
- Last synchronized time.
- `Sync now` action.
- Link or modal to view conflicts.

Do not use color alone to communicate status. Include text and an icon.

### Offline form feedback

After saving while offline, show a message such as:

> Saved on this device. It will sync automatically when the connection returns.

Each pending list item should show a small `Pending sync` label. Conflict items should show `Needs attention` and provide the error explanation.

### Unsupported actions

Disable or guard online-only edit/delete/payment actions while offline. The user must understand why the action is unavailable.

### Cached-data warning

When data is being displayed from IndexedDB, show the last synchronization time. Do not present stale cached financial values as live values.

### Localization

Add translations to both `messages/fr.json` and `messages/ar.json` for:

- Offline status
- Online status
- Syncing
- Pending sync
- Up to date
- Needs attention
- Saved locally
- Sync now
- Last synchronized
- No offline data yet
- Connection required
- Sync conflict
- Batch no longer exists
- Batch is closed
- Not enough birds remaining
- Not enough feed stock
- Retry
- Discard local operation

Verify the status control and banner in Arabic RTL mode.

## Page Refactor Strategy

The current pages query Turso in server components, so they cannot load fresh data while offline. Refactor in this order:

1. Build and test the offline repository independently.
2. Add the provider and global status UI without changing page data.
3. Add local cache hydration to the sales page.
4. Add local cache hydration to daily dashboard operations.
5. Add local cache hydration to expenses, inventory, and debts.
6. Add cached dashboard calculations.
7. Add service-worker shell caching and offline navigation fallback.

Prefer client containers that receive translations and static configuration from the server while reading operational data from the offline repository. Do not duplicate business calculations in multiple pages. Extract shared calculations into `lib/offline/derivedStats.ts` or reuse a shared pure utility.

For the first version, it is acceptable to keep server-rendered pages as the online fallback while client containers take over after hydration. The app must not claim full offline navigation until the core routes can render from IndexedDB without a server request.

## PWA and Caching

Update `next.config.ts` carefully:

- Keep PWA disabled in development if that is required by the current workflow.
- Cache static JavaScript, CSS, fonts, icons, and images.
- Use a network-first strategy with a cache fallback for application shell navigation.
- Never cache `POST /api/sync/mutations` as a successful mutation response.
- Do not cache sensitive server responses indefinitely.
- Keep IndexedDB as the source for offline operational data.

Verify the generated service worker in a production build. Do not create a second hand-written service worker unless the PWA package requires it.

## Security and Privacy Notes

The current app has no authentication. Offline data stored in IndexedDB can be read by anyone with access to the device profile.

For this implementation:

- Do not store database credentials, auth tokens, or passwords in IndexedDB.
- Do not expose Turso credentials to browser code.
- Add a `Clear local data` action in settings.
- Warn the user before clearing pending operations.
- When authentication is introduced, partition local data by farm and user, and clear it on logout according to the product policy.
- Do not describe the MVP as multi-user secure offline storage until authentication and encryption requirements are implemented.

## Testing Plan

There is currently no test script. Add a test setup before implementing the sync manager:

- Add Vitest for unit tests.
- Add `fake-indexeddb` for repository and outbox tests.
- Add a `test` script using `vitest run`.

### Unit tests

Test:

- Database initialization and upgrades.
- Stable device ID creation.
- Enqueue and dequeue behavior.
- Operation ordering by creation time.
- Dependency blocking.
- Retry behavior after network failure.
- Conflict persistence.
- Optimistic local record status.
- Snapshot replacement without losing pending operations.
- Duplicate operation handling.
- Date serialization and deserialization.

### Server tests

Test:

- A daily log operation is applied once.
- Repeating the same operation ID does not create a duplicate.
- A sale with insufficient birds is rejected.
- A sale with insufficient feed stock is rejected.
- A closed batch sale is rejected.
- A dependent sale waits for its client operation.
- A rejected operation is stored and returned consistently.
- A successful operation returns affected entity IDs.

### Browser acceptance tests

Run against a production build, not only `next dev`:

1. Open the app online and allow the initial bootstrap to finish.
2. Confirm the status says `Up to date`.
3. Switch the browser to offline mode.
4. Open the sales, dashboard, expenses, inventory, and debts routes.
5. Create a daily log, sale, expense, inventory item, debt, and client.
6. Confirm every record appears immediately with `Pending sync`.
7. Confirm invoice download and WhatsApp actions explain that they require synchronization.
8. Restore network access.
9. Confirm synchronization starts automatically.
10. Confirm pending labels disappear after success.
11. Repeat a request or refresh during synchronization and confirm no duplicate records appear.
12. Force a conflict by selling more birds than remain and confirm the operation is visible under `Needs attention`.
13. Verify French, Arabic, and Arabic RTL layouts.
14. Reload while offline and confirm cached data remains available.

## Verification Commands

The implementation is not complete until these commands pass:

```bash
npm run lint
npm test
npm run build
```

Also run the production server and perform the browser acceptance tests:

```bash
npm run build
npm run start
```

Do not mark the feature complete based only on `navigator.onLine`. The real acceptance test must disable network requests and verify that data entry, persistence, retry, conflict handling, and duplicate protection work.

## Implementation Order

1. Add `idb`, Vitest, and `fake-indexeddb` dependencies and scripts.
2. Add typed offline records and the IndexedDB schema.
3. Add the outbox repository and unit tests.
4. Add `sync_mutations` to the Drizzle schema and generate its migration.
5. Extract reusable server mutation handlers from the existing server actions.
6. Add explicit IDs, timestamps, Zod payload validation, and idempotency handling.
7. Implement `/api/sync/bootstrap`.
8. Implement `/api/sync/mutations`.
9. Implement the sync manager with retry and dependency ordering.
10. Add `OfflineProvider`, status UI, banner, translations, and conflict display.
11. Integrate daily logs and sales first.
12. Integrate expenses, inventory, debts, and client creation.
13. Add local cache reads to the affected pages.
14. Add PWA runtime caching and offline navigation fallback.
15. Run unit, server, lint, build, and browser acceptance tests.
16. Only after the MVP is stable, plan offline edits, deletes, payments, batch changes, and conflict resolution workflows.

## Definition of Done

The offline feature is complete when:

- A user can use the app after an initial successful online bootstrap with no connection.
- Core create operations persist after a browser refresh while offline.
- Every queued operation has a visible status.
- Reconnecting synchronizes operations automatically.
- Retrying the same operation never creates duplicates.
- Business-rule conflicts are rejected clearly and remain recoverable.
- Local pending operations survive a bootstrap refresh.
- The UI clearly distinguishes live data from cached data.
- French and Arabic translations are complete.
- Arabic RTL layout remains usable.
- `npm run lint`, `npm test`, and `npm run build` pass.
- Production PWA behavior has been tested with actual network interruption.
