# Free WhatsApp Invoice Sharing Plan

## Goal

When the user checks **Send invoice via WhatsApp** while creating a sale, generate the invoice from the saved sale and open the device share sheet with the PDF ready to share to WhatsApp.

This must use no WhatsApp API, no WhatsApp access token, no paid provider, and no new database table.

## Important Product Limitation

The browser cannot silently send a PDF to a specific WhatsApp number. WhatsApp does not expose a free URL that both selects a recipient and attaches a local PDF.

The free supported behavior is:

1. Save the sale.
2. Generate/fetch the persisted invoice PDF.
3. Open the native share sheet with the PDF and a short message.
4. The user selects WhatsApp and confirms the recipient/send action.

On browsers without file sharing support, download the PDF and open a pre-filled WhatsApp chat using `https://wa.me/<phone>?text=<message>`. The user must attach the downloaded PDF manually.

Do not describe this as fully automatic sending in the UI. Use wording such as **Share invoice via WhatsApp**.

## Existing Code To Reuse

- `components/SalesForm.tsx` records new sales through `recordSale()` and currently starts an invoice download after success.
- `actions/sales.ts` returns `{ success: true, saleId, invoiceNumber }` from `recordSale()`.
- `app/[locale]/sales/[id]/invoice/route.ts` generates a PDF from persisted sale, client, and seller data.
- `app/[locale]/sales/page.tsx` loads sales and clients and passes them to the client components.
- `components/SalesListClient.tsx` already provides invoice download actions for existing sales.
- `db/schema.ts` already has an optional `clients.phone` field.
- `messages/fr.json` and `messages/ar.json` contain the existing sales and invoice translations.

## Explicit Non-Goals

- Do not integrate Meta WhatsApp Cloud API.
- Do not integrate Twilio or another messaging provider.
- Do not automate WhatsApp Web with Playwright, Puppeteer, or a persistent browser session.
- Do not add WhatsApp credentials or secrets to the database or Settings UI.
- Do not add a delivery-status table. The browser cannot reliably know whether the user completed the WhatsApp send.
- Do not change the existing sale transaction or make sale creation depend on sharing success.
- Do not automatically share when an existing sale is edited.

## Implementation Steps

### 1. Extend client data passed to the sale form

Update `app/[locale]/sales/page.tsx` and `components/SalesForm.tsx`.

- Include `phone` in the client option type.
- Pass each existing client's phone number to `SalesForm`.
- Add `clientPhone` to the sales list query and the `Sale` type in `SalesListClient.tsx`.
- Keep the phone optional for normal sales that do not use WhatsApp sharing.

The current `allClients` query already returns the phone column at runtime, but the component types currently only declare `id` and `name`. Update the types explicitly.

### 2. Support a phone number for new clients

Update `components/SalesForm.tsx`.

- Add an optional `newClientPhone` field to the form schema and `FormValues`.
- When `showNewClient` is true, render a phone input below or beside the new client name input.
- When creating a new client, pass the phone to the existing `createClient()` action.
- Do not change the database schema because `clients.phone` already exists.

The phone input may remain optional when the WhatsApp checkbox is not checked.

### 3. Add the checkbox and conditional validation

Update `components/SalesForm.tsx`.

- Add local state named `sendViaWhatsApp`, defaulting to `false`.
- Render a real accessible checkbox with a label near the sale summary or submit button.
- Hide or disable the checkbox when editing an existing sale. The initial feature only applies to new sales.
- Determine the selected phone from either:
  - the selected existing client, or
  - `newClientPhone` when creating a new client.
- If the checkbox is checked and there is no selected client phone, show a localized validation error and do not record the sale.
- If the phone is present but invalid, show a localized validation error and do not record the sale.
- A cash sale without a client phone must not attempt WhatsApp sharing.

Use a small local normalizer rather than adding a dependency. Strip spaces, parentheses, hyphens, and other display separators. Require an international number format beginning with `+`, or document and implement a confirmed local-country conversion rule. Do not guess a country code silently.

The number used by `wa.me` must contain digits only after normalization, without the leading `+`.

### 4. Add a browser-side sharing utility

Create `lib/invoices/shareInvoice.ts` as a client-safe utility. Do not import server-only modules into it.

Export a function with inputs equivalent to:

- `saleId: string`
- `invoiceNumber?: string`
- `phone?: string | null`
- `message?: string`

The function must:

1. Fetch `/sales/${saleId}/invoice` using `fetch()`.
2. Throw a useful error if the response is not successful or is not a PDF response.
3. Convert the response to a `Blob`.
4. Create a `File` with a safe name such as `invoice-${invoiceNumber || saleId}.pdf` and MIME type `application/pdf`.
5. Check whether `navigator.share` can share files using `navigator.canShare({ files: [file] })` when `navigator.canShare` is available.
6. Call `navigator.share({ files: [file], title, text })` when file sharing is supported.
7. Treat a user cancellation (`DOMException.name === 'AbortError'`) as a normal cancelled result, not an error.
8. If file sharing is unsupported, trigger a PDF download from the blob and navigate/open a pre-filled `wa.me` URL when a valid phone exists.
9. If file sharing is unsupported and there is no valid phone, return a specific unsupported/missing-phone result.
10. Revoke any temporary object URL after the download has been started.

Avoid relying only on `window.open()` after an asynchronous `fetch()`, because popup blockers may reject it. Use a user-initiated navigation or a temporary anchor for the fallback and test it in supported target browsers.

The share message should contain only stable information available after recording, for example the invoice number and a short localized sentence. Do not construct the PDF from unsaved form values; the PDF must always come from the existing invoice route and persisted sale.

### 5. Trigger sharing after a successful sale

Update `components/SalesForm.tsx` inside the successful `recordSale()` branch.

- Keep the existing invoice download behavior unchanged to avoid a regression.
- If `sendViaWhatsApp` is false, do not call the sharing utility.
- If it is true, call the sharing utility only after `recordSale()` returns a successful `saleId`.
- Do not call the sharing utility for `updateSale()`.
- Keep the saved sale even if PDF fetching or sharing fails.
- Show a localized error stating that the sale was saved but the invoice could not be shared.
- Do not show an error when the user intentionally cancels the native share sheet.
- Reset the checkbox after submission along with the other new-sale form state.
- Keep the loading state active while the share operation is running, or otherwise prevent duplicate submissions.

The intended flow is:

```text
submit form
  -> validate phone only when checkbox is checked
  -> recordSale()
  -> if successful, trigger existing PDF download
  -> if checked, shareInvoice(saleId, invoiceNumber, phone, message)
  -> reset form and display any non-cancellation share error
```

### 6. Add sharing for existing invoices

Update `components/SalesListClient.tsx`.

- Add a WhatsApp/share icon beside the existing invoice download icon on desktop and mobile.
- Pass the sale ID, invoice number, and client phone to the sharing utility.
- Disable the action while that sale is being shared.
- Do not render or enable it for sales without a valid client phone unless the native share flow is intentionally allowed to share to any contact.
- Show a localized error if sharing fails.
- Keep edit, mark-paid, delete, and download behavior unchanged.

This gives users a retry path even though the app cannot know whether the WhatsApp send was completed.

### 7. Add translations

Update both `messages/fr.json` and `messages/ar.json`.

Add translations for keys equivalent to:

- `sendViaWhatsApp`
- `shareWhatsApp`
- `shareWhatsAppHint`
- `whatsappPhoneRequired`
- `whatsappPhoneInvalid`
- `whatsappShareError`
- `whatsappShareUnsupported`
- `whatsappShareCancelled` only if the UI needs to display a cancellation status
- `whatsappShareReady` or `whatsappShareOpened` if a success status is displayed

Use the existing `Sales` namespace for form validation and the existing `Invoice` namespace for invoice action labels/errors, or use one consistent namespace without duplicating keys.

Ensure Arabic text remains compatible with the current RTL layout.

### 8. Accessibility and responsive behavior

- Use a native `<input type="checkbox">` with a visible label.
- Add helper text explaining that WhatsApp will open and the user must confirm sending.
- Provide `aria-label` values for icon-only share buttons in the sales list.
- Ensure the checkbox and helper text work on both mobile and desktop.
- Do not rely on color alone for disabled, error, or success states.

## Error Semantics

Use these rules consistently:

- Invalid or missing phone before sale creation: block the sale and ask the user to correct the input.
- Database sale failure: show the existing sale error and do not attempt sharing.
- PDF fetch/generation failure after sale creation: keep the sale saved and show a share/download error.
- Native share cancellation: no error; the user chose not to send.
- Browser cannot share files: use the download plus `wa.me` fallback.
- No phone for the fallback: show an explanatory localized error and keep the sale saved.

## Verification Checklist

There is currently no automated test framework in the repository. At minimum, perform the following checks manually and run the repository checks.

### Functional cases

- New sale with checkbox unchecked: sale saves and existing invoice download still starts; no share utility call occurs.
- New sale with checkbox checked and existing client phone: persisted PDF opens in the native share sheet.
- New sale with checkbox checked and new client phone: client is created with the phone, sale saves, and sharing starts.
- Checkbox checked with no phone: sale is not recorded and a localized validation error is shown.
- Checkbox checked with malformed phone: sale is not recorded and a localized validation error is shown.
- User cancels the native share sheet: sale remains saved and no failure message is shown.
- PDF route failure after sale success: sale remains saved and a localized error is shown.
- Existing sale share action: the persisted invoice is shared without editing or duplicating the sale.
- Unsupported browser fallback: PDF downloads and a pre-filled WhatsApp chat opens when a phone exists.
- French locale: all labels and fallback message are French.
- Arabic locale: all labels and fallback message are Arabic and the layout remains usable.
- Desktop and mobile layouts: controls remain visible and usable.

### Repository checks

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

## Acceptance Criteria

- No WhatsApp API, provider account, token, or paid service is required.
- The checkbox is available only for new sales and is clearly described as sharing, not silent sending.
- A checked checkbox never sends before the sale is successfully persisted.
- The PDF shared is generated by the existing persisted-sale invoice route.
- Users can share the invoice through WhatsApp using the native file share flow on supported devices.
- Unsupported browsers receive a usable download plus pre-filled-chat fallback.
- Failed sharing never deletes or rolls back a saved sale.
- Existing invoice download, edit, payment, delete, localization, and responsive behavior continue to work.

## Future Upgrade Path

If the business later requires the invoice to be sent without any user confirmation, replace the browser share utility with an official WhatsApp Business/Cloud API integration. That will require provider credentials, message-template approval, delivery-status handling, and likely provider charges.
