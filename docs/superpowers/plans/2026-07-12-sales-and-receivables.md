# Sales & Receivables — Implementation Plan (Phase 2)

> Builds on the Foundation plan. Same stack/conventions. Steps use checkbox syntax.

**Goal:** Record each wholesale sale once — a challan with many style lines — computing real gross profit (price − standard cost), tracking payments with **discount kept separate from due**, and maintaining a per-customer receivable ledger with aging.

**Architecture:** New Prisma models (SalesChallan, SaleLine, PaymentReceipt, ReceivableEntry) with back-relations on Customer/ProductStyle/Location. A pure domain module computes line/challan totals, dues, and status. Creating a challan posts an INVOICE receivable; recording a payment posts PAYMENT (+ optional WAIVER) entries and recomputes status. Money is `Decimal`; amounts rounded to 2dp server-side.

## Global constraints (inherited)

BDT · English · Decimal money · real DateTime · createdBy/updatedBy + audit · roles OWNER/PARTNER/SALES/INVENTORY/ACCOUNTANT/ADMIN.

**New RBAC actions:** `sales.write` (OWNER, ADMIN, SALES), `sales.read` (all operational roles), `payments.write` (OWNER, ADMIN, SALES, ACCOUNTANT).

---

### Task S1: Schema — sales, payments, receivables

**Files:** `prisma/schema.prisma`, migration.

- Add models: `SalesChallan` (challanNo?, saleDate, periodMonth, customerId, locationId?, status, remarks, timestamps + audit ids), `SaleLine` (challanId, styleId, quantity, unitPrice, unitCostSnapshot, lineAmount, lineGrossProfit), `PaymentReceipt` (challanId, receiptDate, amountCollected, discountOrWaiver, method, notes, collectedById), `ReceivableEntry` (customerId, challanId?, entryType, amount signed, entryDate).
- Back-relations: `Customer.challans`, `Customer.receivables`; `ProductStyle.saleLines`; `Location.challans`.
- `SaleLine` and `PaymentReceipt` cascade-delete with their challan.
- Steps: write models → `pnpm prisma migrate dev --name sales` → verify client + tables → commit.

### Task S2: Domain logic + tests

**Files:** `src/lib/sales.ts`, `src/lib/sales.test.ts`.

- Pure functions:
  - `lineAmount(qty, unitPrice)` and `lineGrossProfit(qty, unitPrice, unitCost)`.
  - `challanTotals(lines, payments)` → `{ invoiceTotal, grossProfit, collectedTotal, discountTotal, dueTotal }`.
  - `challanStatus({invoiceTotal, collectedTotal, discountTotal})` → `DRAFT|DISPATCHED|PARTIALLY_PAID|PAID` (paid when collected+discount ≥ invoice; partially when 0<collected<invoice; dispatched when 0).
  - `roundMoney(n)` → 2dp.
- TDD: tests first (fail), implement, pass. Cover a partial-payment + discount case matching the spec's discount-vs-due rule.

### Task S3: Create sales challan (multi-line)

**Files:** `src/lib/validators/sale.ts` (+test), `src/app/(app)/sales/actions.ts`, `sale-form.tsx`, `new/page.tsx`.

- Zod `saleSchema`: customerId (req), saleDate (req), locationId?, remarks?, and `lines[]` each { styleId (req), quantity (int ≥1), unitPrice (≥0) }. At least one line.
- `sale-form.tsx` (client): customer + location selects, date, a dynamic line editor (add/remove rows) with style typeahead/select, qty, unit price; shows live line amount + running invoice/profit total. Submits JSON of lines in a hidden field.
- `createSale` action (`requireCan('sales.write')`): validate; snapshot `unitCostSnapshot = style.standardCost` per line; compute lineAmount/profit; create challan + lines in a `db.$transaction`; set periodMonth from saleDate; set status DISPATCHED; post `ReceivableEntry` INVOICE (+invoiceTotal); audit CREATE; redirect to the challan detail.

### Task S4: Sales list + challan detail

**Files:** `src/app/(app)/sales/page.tsx`, `[id]/page.tsx`.

- List: date, challan no, customer, invoice total (৳), collected, due, status badge; ordered by saleDate desc. Guard `sales.read`.
- Detail: header (customer, date, location, status); lines table (style, qty, price, amount, profit) with totals; payments list; due summary; a "Record payment" form when `payments.write` and due>0.

### Task S5: Record payments (discount vs due)

**Files:** `src/lib/validators/payment.ts` (+test), extend `sales/actions.ts`, `payment-form.tsx`.

- Zod `paymentSchema`: amountCollected (≥0), discountOrWaiver (≥0), method (enum cash|bank|bKash|Nagad|account), receiptDate, notes?. Reject if amountCollected+discount > current due (over-payment) with a clear message.
- `recordPayment` action (`requireCan('payments.write')`): in a transaction create PaymentReceipt, post ReceivableEntry PAYMENT (−amountCollected) and, if discount>0, WAIVER (−discount); recompute + persist challan `status`; audit; revalidate detail.

### Task S6: Customer dues + aging

**Files:** `src/app/(app)/dues/page.tsx`, `src/lib/aging.ts` (+test).

- `customerDue(openingDueBalance, entries)` = opening + Σ signed entries. Pure + tested.
- `agingBuckets(challans, asOf)` → current / 1–30 / 31–60 / 60+ days by challan due & saleDate. Pure + tested.
- Dues page (`sales.read`): each customer with outstanding due > 0, total due, and aging buckets; link to customer's challans. Show grand total receivable.

### Task S7: RBAC + nav + verify

- Add `sales.write/read`, `payments.write` to `src/lib/rbac.ts`; add "Sales" and "Dues" nav items (gated by `sales.read`... shown to all operational roles; keep Sales visible to sales.read).
- `pnpm test` + `pnpm typecheck` + `pnpm build` green; browser-verify: create a 2-line challan (profit computed from standard cost), record a partial payment with a discount, confirm due + status + dues/aging page. Commit.

## Self-review
Covers design §4.1 (2 sales, 3 payments/receivables), §5 (SalesChallan/SaleLine/PaymentReceipt/ReceivableEntry), §6 rules 1–3 & 8 (enter once, discount≠due, real profit, audit), §8 (receivables/aging report). Inventory decrement & negative-stock alerts are the Inventory phase (net stock derives from SaleLine). Period open/close is later.
