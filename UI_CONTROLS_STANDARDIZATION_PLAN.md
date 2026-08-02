# UI Controls Standardization Plan

## Goal

Standardize every date picker and select control in the app:

- Every date picker must use the same visual language and interaction as the Sales page calendar.
- Every select must use the same custom popover interaction and styling as the Batches page select.
- Existing form behavior, validation, filtering, localization, RTL support, and mobile layout must remain intact.

## Current Findings

### Date controls

- `components/SalesListClient.tsx` contains the reference custom calendar picker.
- `components/BatchForm.tsx` uses a native `input type="date"` for arrival dates.
- `components/BatchesClient.tsx` uses a native `input type="date"` for restock history filtering.

### Select controls

- `components/BatchForm.tsx` contains the reference custom select implementation.
- `components/SalesForm.tsx` has native selects for batch and client.
- `components/ExpenseForm.tsx` has a native select for batch.
- `components/InventoryForm.tsx` has native selects for category and unit.
- `components/DailyLogForm.tsx` has a native select for batch.
- `components/BatchForm.tsx` has a custom select for breed that should be extracted and reused.
- Radio groups and segmented controls are not selects and should remain unchanged.

## Implementation Steps

### 1. Extract the shared date picker

Create `components/DatePicker.tsx` by extracting the Sales page calendar logic and UI.

The shared component should:

- Accept a controlled `value` in `YYYY-MM-DD` format.
- Accept an `onChange(value)` callback.
- Accept a translated field `label`.
- Accept an optional translated `placeholder`.
- Use the active app locale through `useLocale()`.
- Render the Sales-style trigger with calendar icon, selected date text, and chevron.
- Render the Sales-style month navigation and calendar grid.
- Support selecting a date and clearing the current date.
- Support Escape and outside-click closing.
- Support keyboard-visible focus states.
- Keep the existing mobile viewport-safe positioning behavior.
- Support both LTR and RTL layouts.

Move or export the date parsing/formatting helpers with the shared component:

- `toInputDate(date)`
- `parseInputDate(value)`

Update `components/SalesListClient.tsx` to import and use the shared component. Preserve its current desktop/mobile filter-menu usage.

### 2. Migrate all date controls

Replace the native date control in `components/BatchForm.tsx`:

- Replace the `InputGroup` date input with the shared `DatePicker`.
- Keep the existing React Hook Form field value and validation.
- Use the current arrival-date label.

Replace the native date control in `components/BatchesClient.tsx`:

- Replace `RestockDateFilter`’s native input with the shared `DatePicker`.
- Preserve the current filtering semantics and clear behavior.
- Keep the filter menu desktop/mobile placement.

Do not change date display-only icons in record cards; only interactive date controls are in scope.

### 3. Extract the shared custom select

Create `components/CustomSelect.tsx` by extracting the Batches page select implementation.

The shared component should:

- Accept `label`, `icon`, `options`, `value`, and `onChange` props.
- Support an optional empty/placeholder option.
- Render the Batches-style trigger using the existing `.custom-select` CSS classes.
- Render the Batches-style popover listbox and selected check mark.
- Support outside-click closing.
- Support Escape to close.
- Support Enter/Space to open or close.
- Support ArrowUp/ArrowDown selection movement.
- Preserve focus and React Hook Form refs/blur handling.
- Use stable IDs for trigger and listbox relationships.
- Support LTR and RTL positioning.
- Keep the menu viewport-safe on mobile.

The component must be controlled so it can work with React Hook Form `Controller` fields.

### 4. Migrate all native selects

Replace native selects with `CustomSelect` and `Controller` fields in:

- `components/SalesForm.tsx`
  - Batch select.
  - Client select.
- `components/ExpenseForm.tsx`
  - Associated batch select.
- `components/InventoryForm.tsx`
  - Category select.
  - Unit select.
- `components/DailyLogForm.tsx`
  - Batch select.

Update `components/BatchForm.tsx` to use the extracted `CustomSelect` for breed instead of its local implementation.

Use meaningful existing icons where available:

- Batch/breed controls: `Bird`.
- Client controls: `User`.
- Inventory category: `Tag`.
- Inventory unit: `Plus` or an appropriate existing utility icon.

Preserve all existing option values, default values, form names, validation schemas, and submit behavior.

### 5. Consolidate translations

Add shared date-control translations to `Common` in both locale files:

- `pickDate`
- `clearDate`
- `previousMonth`
- `nextMonth`

Use the existing Sales translations where they remain page-specific, or migrate them to `Common` consistently. Do not leave hardcoded accessible labels such as `Clear date` in shared controls.

Required locale files:

- `messages/fr.json`
- `messages/ar.json`

### 6. Standardize CSS

Reuse the existing Sales date-picker styles and Batches custom-select styles rather than creating parallel visual systems.

Review and consolidate styles in `app/[locale]/globals.css` for:

- Shared trigger dimensions, borders, radii, colors, and focus states.
- Popover z-index and shadows.
- Mobile positioning near the fixed bottom navigation.
- LTR/RTL inline positioning.
- Long option labels and selected-date truncation.
- Touch target sizes of at least 44px where practical.

Remove obsolete native-select/date-specific styles only after all usages are migrated.

### 7. Accessibility requirements

- Every trigger must have an accessible label.
- Every trigger must expose `aria-expanded` and `aria-controls`.
- Select popovers must use `role="listbox"` and options must use `role="option"` with `aria-selected`.
- Calendar popovers must use an appropriate dialog label.
- Escape must close open controls.
- Outside pointer interaction must close open controls.
- Focus-visible outlines must remain visible.
- Do not rely on color alone to communicate selection.

## Verification

Run:

```bash
npx tsc --noEmit
npm run build
git diff --check
```

Run targeted ESLint on all changed components. Existing unrelated lint failures should be reported separately and not silently fixed as part of this task.

Manually verify:

- Sales date filter on desktop and mobile.
- Batch arrival date on create and edit forms.
- Batch restock date filter on desktop and mobile.
- Sales batch and client selects.
- Expense batch select.
- Inventory category and unit selects.
- Daily Tracking batch select.
- Batch breed select.
- French and Arabic locales.
- LTR and RTL positioning.
- Viewports around 320px, 390px, 820px, and desktop width.
- Keyboard navigation, Escape closing, outside-click closing, selection, clearing, and form submission.

## Scope Constraints

- Do not change radio groups or segmented controls.
- Do not change the filtering/business logic.
- Do not change database schemas or actions.
- Do not modify unrelated worktree changes such as `local.db`.
- Keep desktop layouts visually consistent with the current Sales and Batches reference controls.
