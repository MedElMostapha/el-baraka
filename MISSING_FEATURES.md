# Missing Features

El Baraka already covers the core farm workflows: poultry batches, daily logs, inventory, sales, invoices, expenses, debts, French and Arabic localization, and PWA installation.

The following features would remove the most manual work and reduce errors for farm owners, sales staff, and bookkeepers.

## Priority Guide

- **P0**: Essential for data safety, reliability, or a shared production app.
- **P1**: High-value operational improvements.
- **P2**: Useful planning and collaboration improvements.
- **P3**: Later convenience features.

## P0 Features

### Offline mode and synchronization

Allow users to record sales, mortality, feed usage, and expenses without an internet connection. Queue changes locally and synchronize them when connectivity returns.

The current PWA can be installed, but database operations still require a connection to Turso/libSQL.

### User accounts and farm roles

Add authentication and farm workspaces with roles such as:

- Owner
- Manager
- Farm worker
- Accountant

Restrict access to sensitive actions such as deleting sales, changing settings, or editing historical records. The current server actions do not authenticate users or separate farms.

### Backup, restore, and data export

Provide:

- Automatic database backups
- Manual backup download
- Restore from a backup
- CSV export for sales, expenses, inventory, debts, and daily logs
- PDF reports for accounting

This protects the farm's historical data and makes it easier to share information with accountants or authorities.

### Server-side validation and data integrity

Validate all important rules inside server actions, not only in browser forms:

- Do not sell more birds than remain in a batch.
- Do not record mortality greater than the remaining birds.
- Do not use negative quantities or prices.
- Do not create sales for closed batches.
- Do not allow inventory to become negative.
- Reconcile payments when a sale is edited or deleted.

This is especially important because server actions can currently receive invalid values independently of the client UI.

## P1 Features

### Daily log history and corrections

Add a daily operations history where users can:

- View logs by batch and date
- Edit an incorrect log
- Delete a duplicate log
- Enter a missed log for a previous date
- Repeat or copy the previous day's values

Daily logs can currently be created, but there is no complete correction workflow.

### Daily task reminders

Add reminders for:

- Missing daily logs
- Feeding
- Water checks
- Vaccinations
- Medication schedules
- Low feed or medicine stock
- Overdue customer payments

Show reminders in the dashboard and optionally send browser, SMS, or WhatsApp notifications.

### Customer management

Create a dedicated customer section with:

- Customer search
- Name, phone, and address
- Complete purchase history
- Current balance
- Payment history
- Customer statement
- Edit and delete customer records
- One-click WhatsApp contact

Customers currently exist mainly as an inline option during sale creation.

### Payment history and payment methods

Support multiple payments for one sale and record each payment separately:

- Cash
- Bank transfer
- Mobile money
- Cheque
- Other methods

Show payment date, amount, method, remaining balance, and receipt. Replace the current basic paid/unpaid workflow with a complete payment ledger.

### Inventory movement history

Add an inventory ledger showing:

- Purchases and restocks
- Feed consumed by daily operations
- Feed consumed by sales
- Medicine usage
- Packaging usage
- Manual adjustments
- Supplier information
- Purchase price
- Expiry date

Each quantity change should have a reason and a timestamp. This will make stock discrepancies easier to find.

### Configurable low-stock alerts

Allow a reorder level for every inventory item. Alert users when an item reaches its threshold and show the estimated number of days of stock remaining.

The current dashboard uses a fixed feed threshold of 5 kg.

### Reports and consistent date filters

Add reports for selectable date ranges:

- Profit and loss
- Cash flow
- Sales by customer
- Sales by batch
- Expenses by category
- Outstanding receivables
- Mortality rate
- Feed consumption and feed conversion
- Batch profitability

The dashboard currently has date-range charts, but its headline financial values are lifetime totals rather than values for the selected range.

### Complete multiple-batch support

Make all batch screens consistently support multiple active batches:

- Show every active batch on the batches page.
- Filter activity by batch.
- Compare active batches.
- Show batch-specific stock and performance.
- Make the default batch selection explicit in daily logs and sales.

The sales page supports multiple active batches, while the batches overview prominently displays only one.

## P2 Features

### Production planning and forecasting

Help users plan the next cycle with:

- Expected harvest or selling date
- Projected feed requirement
- Expected revenue
- Break-even selling price
- Projected profit
- Recommended reorder date
- Cost comparison between batches

### Medicine and vaccination management

Add structured treatment records with:

- Medicine name
- Dosage
- Administration date
- Next scheduled date
- Supplier
- Expiry date
- Cost
- Batch treatment history

This is more reliable than storing medication as free-text daily notes.

### Quick actions and reusable templates

Reduce repetitive entry with:

- Repeat yesterday's daily log
- Saved expense templates
- Common feed purchase presets
- Default prices by customer or sale type
- Quick sale from a batch detail page
- One-tap payment recording

### Staff activity history

Record who created, edited, deleted, or paid each record. Include an audit trail for important financial and operational changes.

### Supplier management

Track feed, chick, medicine, and packaging suppliers with contact details, purchase history, prices, and balances owed.

### Attachments and farm documents

Allow users to attach photos or documents to records such as:

- Supplier invoices
- Medicine labels
- Delivery notes
- Expense receipts
- Customer payment proof

## P3 Features

### Barcode and QR scanning

Use the phone camera to identify inventory items, record purchases, or open a batch and invoice quickly.

### Voice notes and voice entry

Allow field workers to dictate notes or daily values in French or Arabic when typing is inconvenient.

### Customer-facing invoice links

Give customers a secure link to view their invoice, payment status, and outstanding balance without requiring a full account.

### Multi-farm management

Allow one owner or organization to manage multiple farms, locations, warehouses, or production sites.

## Recommended Implementation Order

1. Add server-side validation for birds, batches, stock, and payments.
2. Add daily-log history with edit, delete, and backdate support.
3. Build customer management and a complete payment ledger.
4. Add inventory movements and configurable reorder alerts.
5. Add reports, exports, and automated backups.
6. Add daily reminders and medication or vaccination schedules.
7. Add offline synchronization.
8. Add authentication, roles, and audit history before onboarding multiple staff or farms.
9. Add forecasting, supplier management, attachments, and scanning.

For a single-user farm, prioritize daily operations, reminders, inventory, offline support, and reports. For a cloud or multi-employee product, authentication, permissions, backups, and audit history should be treated as P0 features.
