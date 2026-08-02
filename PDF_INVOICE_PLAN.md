# PDF Invoice Generation Plan

## Goal

Generate a downloadable PDF invoice immediately after a sale is successfully recorded, while also allowing the user to download the invoice again from the sales list.

The invoice must be based on the persisted sale, not on values still in the form, so the PDF always matches the database transaction.

## Current Sale Flow

- `components/SalesForm.tsx` collects the batch, optional client, quantity, unit price, payment, and sale type.
- `actions/sales.ts` creates the sale inside a transaction, generates the sale UUID, records an optional payment, and updates stock and batch status.
- `db/schema.ts` stores client contact details, sale totals, amount paid, and the sale date.
- `app/[locale]/sales/page.tsx` joins sales with batch and client names before passing them to `SalesListClient`.
- `appSettings` is already used for application-level values and can store the seller's invoice information.
- The application currently supports French (`fr`) and Arabic (`ar`), including RTL layout.

## Recommended Architecture

Use a server-generated PDF rather than browser print-to-PDF.

1. Keep sale creation and invoice identity in the sale transaction.
2. Return the new `saleId` from `recordSale`.
3. Add a route handler such as `app/[locale]/sales/[id]/invoice/route.ts`.
4. The route handler loads the sale, batch, client, and seller settings by ID.
5. Render the invoice with a Node-compatible PDF library and return it with:
   - `Content-Type: application/pdf`
   - `Content-Disposition: attachment; filename="invoice-<invoice-number>.pdf"`
6. After `recordSale` succeeds, `SalesForm` starts the download using the returned sale ID.
7. Add a download action to each existing sale card so previously created invoices remain accessible.

The route should use the Node.js runtime because PDF libraries and font loading may not be compatible with the Edge runtime. Follow the current Next.js 16 route-handler parameter conventions when implementing it.

## Implementation Steps

### 1. Confirm invoice requirements

Before coding, confirm the business decisions below:

- Seller/business name, phone, address, and optional tax or registration number.
- Whether the invoice should be called `Invoice`, `Receipt`, or both.
- Whether invoice numbering must be strictly sequential for legal purposes.
- Whether an unpaid or partially paid sale should be marked `Credit`, `Partially paid`, or `Balance due`.
- Whether the invoice needs a signature area, payment method, notes, or a due date.
- Whether feed consumption is internal-only. It should not appear on the customer invoice by default.

For the first version, use a stable invoice number generated when the sale is created. A collision-safe number such as `INV-2026-<short-sale-id>` avoids concurrent numbering races. If local regulations require sequential numbering, use a dedicated yearly sequence table and increment it inside the same transaction instead.

### 2. Extend the data model

Update `db/schema.ts` and create a Drizzle migration.

Add an `invoiceNumber` field to `sales`:

- Text value.
- Unique index or constraint.
- Generated once during sale creation and never changed by `updateSale`.

Existing databases need a safe migration path:

1. Add the field as nullable if the database requires it for existing rows.
2. Backfill an invoice number for all existing sales.
3. Add the unique constraint.
4. Treat the field as required for all newly created sales.

Do not store the PDF binary in SQLite for the initial implementation. Regenerate the PDF from the sale data so there is no file-storage lifecycle to manage.

### 3. Add seller invoice settings

Extend the existing settings flow in `actions/settings.ts` and the settings UI in `components/SettingsClient.tsx`.

Recommended `appSettings` keys:

- `invoice_business_name`
- `invoice_business_phone`
- `invoice_business_address`
- `invoice_tax_number` (optional)
- `invoice_footer` (optional)

Show sensible defaults when settings are empty, but do not put fake business information into generated invoices. The invoice route should safely handle missing optional values.

### 4. Update sale creation

Modify `recordSale` in `actions/sales.ts`:

- Generate the invoice number alongside the existing `saleId`.
- Persist it in the same `sales` insert as the sale date and totals.
- Return `{ success: true, saleId, invoiceNumber }`.
- Keep all existing stock, payment, expense, and batch-closing behavior unchanged.

Update `updateSale` so it cannot overwrite `invoiceNumber`.

If the sale transaction fails, no invoice download should be started. If the transaction succeeds but PDF rendering fails, the sale must remain saved and the user must be able to retry from the sales list.

### 5. Build the invoice PDF route

Create `app/[locale]/sales/[id]/invoice/route.ts` and a small server-only invoice rendering module, for example `lib/invoices/renderInvoice.ts`.

The route should:

- Accept the locale and sale ID from the URL.
- Query the sale with its batch and optional client.
- Query seller invoice settings.
- Return `404` for a missing sale.
- Use the requested locale for labels, dates, and number formatting.
- Set a safe filename based on the persisted invoice number.
- Avoid exposing unrelated internal fields such as feed consumption or inventory details.

Use a PDF library that works in the Next.js Node runtime. `@react-pdf/renderer` is the preferred first option because the invoice can be described as a React-like document. Run an Arabic/RTL rendering spike before finalizing the library. If Arabic shaping or RTL alignment is not correct, switch to a renderer with reliable Arabic font shaping rather than shipping unreadable Arabic PDFs.

Embed a licensed Arabic-capable font in the PDF. The web font loaded through `next/font` is not automatically available to a server-side PDF renderer. Keep the PDF font files in a server-accessible static asset location and include regular and bold weights.

### 6. Define the invoice layout

Use a clean one-page A4 layout for the initial version:

#### Header

- Business name and contact information.
- Invoice title.
- Invoice number.
- Sale date.
- Optional tax or registration number.

#### Customer section

- Client name.
- Phone and address when a registered client exists.
- Cash-client label when no client is selected.

#### Items table

- Description: batch name or poultry sale.
- Sale type: wholesale or retail.
- Quantity.
- Unit price.
- Line total.

#### Totals section

- Subtotal/total.
- Amount paid.
- Remaining balance.
- Payment status.
- Currency (`MRU` / localized Arabic currency label).

#### Footer

- Optional configured footer message.
- A short thank-you message if desired.

Do not calculate totals independently in the PDF. Use the persisted `totalPrice` and `amountPaid`, and only calculate the displayed balance as `max(0, totalPrice - amountPaid)` for presentation.

### 7. Trigger the download after a sale

Update `components/SalesForm.tsx`:

- Read the active locale with `useLocale()`.
- On a successful new sale, build the invoice route URL from the returned `saleId`.
- Start a download without blocking the existing form reset and revalidation behavior.
- Show a localized error if the sale was saved but the browser could not start the download.
- Do not automatically download a second invoice when editing an existing sale unless that behavior is explicitly requested.

Update `components/SalesListClient.tsx`:

- Add a download icon/button to desktop and mobile sale actions.
- Link directly to the invoice route so retries do not require a new server action.
- Keep edit, mark-paid, and delete behavior unchanged.

### 8. Add translations

Add invoice-specific translations to both `messages/fr.json` and `messages/ar.json`.

Include labels for:

- Invoice title.
- Invoice number.
- Issue date.
- Seller and customer.
- Description, quantity, unit price, and total.
- Amount paid.
- Balance due.
- Paid, partially paid, and unpaid statuses.
- Cash client.
- Download invoice.
- Invoice generation/download errors.
- Optional footer and thank-you text.

The PDF renderer should receive translated strings rather than containing hardcoded French or Arabic text.

### 9. Handle localization and RTL

- Render French invoices left-to-right and Arabic invoices right-to-left.
- Use an embedded Arabic-capable font for Arabic output.
- Format dates with `Intl.DateTimeFormat(locale)`.
- Format currency and numeric values with `Intl.NumberFormat(locale)` while preserving the MRU currency requirement.
- Verify that mixed Arabic, Latin, invoice numbers, phone numbers, and currency values do not reorder incorrectly.
- Use logical layout directions instead of assuming left/right coordinates where the PDF library supports it.

### 10. Add automated and manual verification

Automated checks:

- TypeScript compilation passes.
- ESLint passes for changed files.
- Production build passes.
- The invoice route returns a PDF for a valid sale.
- The invoice route returns `404` for an unknown sale ID.
- Response headers include the correct content type and download filename.
- The generated PDF contains the invoice number, batch name, quantity, total, paid amount, and balance.
- A failed PDF render does not roll back or corrupt the saved sale.

Manual scenarios:

- New fully paid sale with a registered client.
- New partially paid sale with a registered client.
- New unpaid sale with no client.
- Wholesale and retail sale types.
- Sale with client phone and address.
- Re-download from the sales list.
- Edit a sale, then download the updated invoice while keeping the same invoice number.
- Delete a sale, then confirm its invoice route no longer returns a document.
- French and Arabic invoices.
- Desktop and mobile download behavior.
- Long business names, long client names, long addresses, large quantities, and multi-line footer text.
- Missing optional seller settings.

Run the repository checks used by the existing plans:

```bash
npx tsc --noEmit
npm run build
git diff --check
```

Also verify the migration against a copy of the existing local database before applying it to a shared Turso database.

## Acceptance Criteria

- Every newly recorded sale receives a stable invoice number.
- A successful new sale starts a PDF invoice download using the saved sale ID.
- Every sale can be downloaded again from the sales list.
- The PDF contains correct persisted sale, client, seller, payment, and balance information.
- French and Arabic PDFs are readable, correctly localized, and correctly aligned for their text direction.
- Existing inventory, payment, debt, expense, batch, edit, and delete behavior continues to work.
- PDF failures can be retried without creating a duplicate sale or duplicate invoice number.
- No PDF binary storage is introduced unless a later requirement demands immutable invoice archives.

## Future Enhancements

- Immutable invoice snapshots for legal/accounting requirements.
- Multiple invoice line items if one sale can contain products from different batches.
- Payment method and payment history on the invoice.
- Email or WhatsApp sharing.
- Invoice archive and date-range reporting.
- Credit notes or cancellation documents instead of deleting finalized invoices.
