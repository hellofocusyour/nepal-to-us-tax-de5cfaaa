# Payments Admin: Grouped View + Invoices

Rework `/admin/payments` from a flat row-per-payment table into a per-student grouped view with correct fee math and downloadable invoices.

## 1. Pricing config (single source of truth)

Extend `src/lib/pricing.ts` (already exists) with the constants you defined:
- `BASE_PRICE = 20000`, `VAT_RATE = 0.13`, `VAT_AMOUNT = 2600`
- `FULL_TOTAL = 22600`
- `INSTALLMENT_SURCHARGE = 500`, `INSTALLMENT_TOTAL = 23100`
- Helpers: `expectedTotal(plan, n)`, `expectedPerInstallment(plan, n)`

No hardcoding inside components — they import from here.

## 2. Grouping logic (frontend)

Keep the existing `payments + students(...)` query. Group client-side by **lowercased student email** (fallback to `student_id` if email missing). For each group compute:

- `plan`: `"installment"` if any row has `installment_number > 1` OR more than one payment row exists with installment metadata; else `"full"`. Read `N` from the max `installment_number` seen (default 2 for installment plan, 1 for full).
- `expectedTotal` from pricing helpers
- `expectedPerInstallment = expectedTotal / N`
- `totalPaid` = sum of `amount` where `status === "verified"`
- `pendingTotal` = sum where `status === "pending_verification"`
- `balanceDue = expectedTotal - totalPaid`
- `overallStatus`: `fully_paid` (paid ≥ expected), `partially_paid` (paid > 0), `pending` (only pending rows), `rejected` (all rejected), else `pending`
- Per-row `amountMismatch`: `amount !== expectedPerInstallment` (only flag for installment plan rows; full-plan single payment compared to `FULL_TOTAL`)

## 3. UI: `src/pages/admin/Payments.tsx`

Replace the flat `<Table>` with a list of `StudentPaymentCard` components. Each card:

**Collapsed header row** (click to expand, chevron icon):
- Name, email
- Expected / Paid / Balance figures
- Status badge (Fully Paid / Partially Paid / Pending / Rejected)
- Slim progress bar (`Total Paid / Expected`)
- "Generate Invoice" button

**Expanded body**:
- Summary panel: Plan type, Expected, Paid (approved), Pending, Balance, progress bar
- Inner table of payments in chronological order with the existing columns (Proof thumbnail, Amount + ⚠️ tooltip on mismatch, Method, Reference, "#X of N", Status, Actions: view/approve/reject/delete)

Search bar matches name / email / any reference inside the group.
Status filter pills (All / Pending / Approved / Rejected with counts of *students who have ≥1 matching payment*) — reuse current `statusTabs` pattern from Inquiries.

Preserve existing dialogs (detail, reject reason, delete confirm) and signed-URL proof resolution. Preserve `payments-notify` email calls on approve/reject.

## 4. Invoice generation

New component `src/components/admin/InvoiceDialog.tsx`:

- Opened from "Generate Invoice" button on each student card
- Renders a printable invoice (A4-styled div with `@media print` styles)
- Invoice number: deterministic from student — `INV-2026-<6 hex chars from student id>` (stable without a DB table; persistence noted as a future enhancement so we don't expand scope into a migration unless you want it)
- Sections:
  - Header: "Focus Academy" logo/name, address, contact email/phone (from mem brand info)
  - Invoice # + issue date (today)
  - Bill To: student name + email
  - Line items: Course Fee 20,000 / VAT 13% 2,600 / Installment Fee 500 (if plan) / Total Expected
  - Payments Received: date, reference, method, amount, status
  - Totals: Amount Paid, Balance Due, status
  - Footer thank-you note
- Two actions:
  - **Download PDF**: `window.print()` against a styled print view (simplest, no new deps, native browser PDF). Avoids adding jspdf/html2canvas.
  - **Email to student**: invokes existing `send-email` edge function with a rendered HTML body + the same data

## 5. Out of scope (explicit)

- No DB schema migration. Invoice numbers are derived deterministically; if you later want true persistence, we can add an `invoices` table in a follow-up.
- No changes to payments data model.
- No changes outside the admin Payments page + pricing config + new InvoiceDialog component.

## Files touched

- `src/lib/pricing.ts` — extend constants/helpers
- `src/pages/admin/Payments.tsx` — full rewrite of view logic (dialogs preserved)
- `src/components/admin/InvoiceDialog.tsx` — new
- (maybe) `src/components/admin/StudentPaymentCard.tsx` — extracted card for readability
