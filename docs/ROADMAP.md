# StockLot ERP — Feature Roadmap

Prioritized backlog from an automated feature audit (5 dimension assessors + synthesis). P0 = build soon, P1 = valuable, P2 = nice-to-have. Effort S/M/L.

## Shipped (as of 2026-07-13)

P0/P1 core plus these audit items are now live in production:

- Company letterhead, Excel/CSV importer, CSV/PDF export, printable challan/GRN, user profile, audit log
- Customer statement/khata, style reconciliation/merge, sales returns + void/draft lifecycle, Accounts Payable + period close/lock, list search & pagination
- Sales analytics + stock valuation, reports pack (day book, purchases, cash flow, printable GRN)
- **Stock adjustments** (#19), **reorder/low-stock alerts** (#20, in-app), **purchase returns to supplier** (#29)
- **Cash book** and **balance sheet / statement of financial position** (#35) — derived from live transactions on a standard-cost basis
- **Global search**, **manual data backup export** (#34), **PWA installable app + offline fallback** (#39, offline sale entry still pending), **bulk activate/deactivate** on styles (#40)

Still open: full double-entry journal/GL/trial balance (#33 — deferred; the business runs standard-cost, so a formal GL needs a purchase-price-variance decision from the owner), scheduled/automated backups, offline write queue, VAT, email/WhatsApp alert digests. See items below.

## P0

### 1. Company profile / letterhead settings  `S` · Documents
Small settings model + admin screen: business name, address, phone, TIN/BIN, logo, consumed by every printed/exported document. No company model exists today.
**Why:** Cheap shared dependency that unblocks every document feature (challan, receipt, statement, stock report) with one consistent header.

### 2. In-app Excel/CSV importer with mapping, preview & validation (+ downloadable templates)  `L` · Import/Export
Reusable import wizard on each list page (customers, suppliers, styles, sales, receipts, expenses, opening balances): upload .xlsx/.csv, auto-detect and map columns to ERP fields, live per-row validation (unknown style/customer with auto-create, bad dates/numbers, duplicate challan), commit valid rows in one transaction, return a rejected-rows report. Ships with pre-formatted blank templates per entity. Generalizes prisma/import-june26.ts into a role-guarded UI.
**Why:** Owner's explicit #1 ask. The business runs on Excel; this lets staff load monthly workbooks, master lists, and historical periods without a developer running the CLI. Templates cut import failures cheaply.

### 3. CSV / Excel / PDF export across every list and report  `M` · Import/Export
One reusable export utility (shared column definitions) wired into customers, dues/aging, sales, net-stock, expenses, and the monthly P&L; exports the currently filtered/sorted rows as CSV, true .xlsx (formatting, totals rows), and pixel-stable PDF. No export exists anywhere today.
**Why:** Owner explicitly asked for CSV/Excel/PDF export. Lets staff and the accountant pivot, reconcile, and hand figures to the bank/auditor without retyping. High value at low marginal cost per screen once the helper exists.

### 4. Printable sales challan / invoice + money receipt (print + PDF)  `M` · Documents
Print-optimised A4/A5 view of a challan (letterhead, buyer, location, lines, totals, collected/discount/due, BDT amount-in-words, signature blocks) via window.print() and PDF; plus a separate money receipt for each PaymentReceipt. Sales detail is screen-only today and payments produce no artifact.
**Why:** Owner's explicit ask and non-negotiable daily trade practice: a printed challan rides with every dispatch and a receipt is handed on every collection. Removes the parallel paper book that otherwise defeats adoption.

### 5. Customer statement / ledger (khata) — view, print, export  `M` · Receivables
Per-customer ledger over a date range: opening due, every invoice/payment/waiver in date order with running balance, plus aging summary. Printable and CSV/PDF exportable. Customer detail is only an edit form today.
**Why:** The most-requested artifact in BD garment wholesale — buyers demand a monthly khata. Directly drives collections and resolves 'you already paid' disputes. Data (receivables, payments, aging) already exists.

### 6. List search, filter, sort & pagination  `L` · Usability
Server-driven searchParams (q, page, sort, status/date filters) on every list (sales, dues, inventory, expenses, treasury, customers, suppliers, styles, users), replacing hard-coded take:200/300 caps with real paging, debounced search, column sort, and filters.
**Why:** Biggest daily-usability gap and a silent data-integrity bug: past a few hundred challans pages truncate rows and show misleading partial totals, with no way to find one customer's challan or filter unpaid dues.

### 7. Style-alias reconciliation UI  `M` · Inventory
Screen surfacing the ~37 free-text style names that don't match a canonical ProductStyle (source of negative-stock alerts); map each to the right style via StyleAlias, with a bulk merge action and a preview of how net stock corrects. Schema has StyleAlias; only the workflow is missing.
**Why:** The net-stock page flags mismatches but offers no fix. Reconciliation is the single biggest lever to make on-hand quantities and gross-profit-by-style trustworthy after the June import.

### 8. Challan lifecycle: draft, edit, void/cancel  `M` · Sales
createSale only inserts today. Add save-as-draft (no receivable/stock effect, reuses existing DRAFT enum), an edit action that re-computes lines/cost snapshots/receivable entry with guards (block edits once payments exist), and a VOID status that reverses the receivable entry and frees stock — all in the existing audit log.
**Why:** Hand-typed challans guarantee mistakes; today a wrong entry lives forever or is fixed by deleting rows, corrupting the workbook-parity P&L. Draft/edit/void is table-stakes correction plumbing.

### 9. Sales return / credit note  `M` · Sales
Return document against a challan: pick lines/quantities, generate a signed credit note that posts a negative RETURN entry to the receivable ledger and adds pieces back to net stock. Handles return-before-payment (reduces due) and after-payment (credit/refund).
**Why:** StockLot wholesalers get frequent returns of unsold/defective lots. Today the only workarounds (delete challan, fake negative payment) corrupt history; without it both dues and net stock drift from reality.

### 10. Accounts Payable — supplier bills & payments  `M` · Finance
Add a bill amount to PurchaseReceipt and a supplier payment/ledger model mirroring the receivable side: per-supplier outstanding, payment entries (cash/bank/bKash), and payables aging.
**Why:** A wholesaler buys stocklots heavily on credit but the system tracks zero money owed to suppliers — the Supplier master has no financial link. Without payables the owner can't see who he owes, can't plan cash, and true liabilities are invisible.

### 11. Audit-log viewer screen  `M` · Admin
An owner/admin /audit page reading the field-level audit records already written by every actions.ts, filterable by user/entity/action/date, plus a per-record history view on detail pages.
**Why:** The audit data is fully captured but completely unviewable, so the accountability feature already paid for is dead weight. A viewer turns it into a real 'who changed this due/price' tool SME owners care about.

### 12. User profile & change-own-password  `S` · Security
A /profile page where any logged-in user views their details and changes their own password; today password changes only exist as an admin reset.
**Why:** Basic security hygiene and expectation — staff can't rotate a leaked password without the owner, and admins shouldn't need to know everyone's password. Small, high-trust win.

### 13. Period close & month lock  `M` · Finance
Per-month status (OPEN/CLOSED) with a close action that snapshots the month's P&L and blocks create/edit/delete of sales, expenses, purchases, and treasury rows dated in a closed period (OWNER override).
**Why:** periodMonth is just a string, so anyone can edit a January challan in July and silently change already-reported profit. Locking keeps reported numbers reproducible and protects the workbook-parity P&L.

## P1

### 14. Stock report — valuation + print/export  `S` · Inventory
Print- and export-ready net-stock report (style, received, sold, closing qty, negative flags, as-of date, company header) plus BDT valuation = net qty x standard cost with a grand total of capital tied up. Both build on existing aggregateStock; styles already carry standard cost.
**Why:** Needed for physical stock-taking sheets and warehouse counts, and unsold stock is the largest chunk of working capital — the owner needs its BDT value for the balance sheet and bank facilities, not just a piece count.

### 15. Daily sales report (day book)  `S` · Reporting
Day-wise sales and collection register: for a selected day/range, each challan with amount invoiced and cash/discount collected, plus daily totals.
**Why:** Wholesale shops close the books daily; a day book ties out physical cash and dispatches every evening, catching errors immediately instead of at month-end. Cheap on existing data.

### 16. Printable goods-inward receipt (GRN)  `S` · Documents
Print + PDF view of a PurchaseReceipt: supplier, receipt/challan no, date, styles/quantities received, opening-stock flag — mirroring the sales challan document.
**Why:** Gives a paper record to file against supplier deliveries and verify inward counts, closing the loop so both sides of stock movement produce documents. Small once challan print exists.

### 17. Custom date-range filters on reports  `M` · Reporting
Let reports and dues aging filter by arbitrary from/to and as-of dates, not just a calendar month. Every report currently keys off periodMonth with a month-button selector.
**Why:** Real questions rarely align to calendar months — a week's sales, a quarter, a since-Eid range, or dues aged as of a bank-submission date. Flexible ranges multiply the usefulness of every other report.

### 18. Sales analytics — by style / customer / location + top/slow movers  `M` · Reporting
Breakdown report grouping a period's sales by style, customer, and location/area (qty, invoiced amount, gross profit per group, sortable), plus ranked best-sellers and slowest/dead-stock lists. Reports today give only whole-month totals.
**Why:** A wholesaler must know which styles sell, which buyers drive revenue, which areas are strongest, and which lots are dead capital — the core buy/clear decisions the flat monthly summary can't answer.

### 19. Stock adjustment (damage / loss / count correction)  `M` · Inventory
A StockAdjustment entity and form for quantity deltas outside sales/purchase (damage, loss, shrinkage, physical-count correction) with reason code, note, and audit trail; aggregateStock folds deltas into closing stock.
**Why:** Net stock is strictly received-minus-sold today, so real-world shrinkage/damage/miscount can't be represented and permanently skews on-hand. Physical counts never reconcile without an adjustment path.

### 20. Reorder-level & overdue-due alerts (in-app + scheduled)  `M` · Alerts
Add per-style reorderLevel; net-stock and dashboard flag styles at/below threshold with a reorder-list view. A Vercel Cron computes overdue dues (existing aging) and low/negative stock and surfaces them as an in-app alert bell plus optional email/WhatsApp digest.
**Why:** Negative stock only warns after the fact; a forward-looking reorder signal prevents lost sales. Aging and stock detection are pull-only today — a push reminder is what actually gets the owner to chase payments and reorder in time.

### 21. Cash-flow / collections report  `M` · Finance
Period cash statement from data already tracked: cash in (collections), cash out (non-advance expenses), capital movements, Deposit-to-Alib — netting to cash movement. No cash-oriented report exists; the P&L is accrual gross-profit based.
**Why:** Accrual profit and cash are very different for a wholesaler carrying large dues and stock. Owners live or die by cash position; this answers 'where did the money go' without exporting to Excel.

### 22. Purchase / goods-received report  `M` · Reporting
Summary of inward receipts over a period grouped by supplier and by style: quantity received and value at cost, with supplier subtotals.
**Why:** The owner must reconcile received goods and amounts against each supplier's bills and negotiate. Receiving data is entered today but never summarized for the buying side.

### 23. Profit & collection trend + dashboard charts  `M` · Reporting
Multi-month trend of gross profit, expenses, net profit, and an invoiced-vs-collected collection-efficiency KPI, plus compact sales-trend and AR-aging charts on the currently static numeric dashboard (lightweight inline SVG or small chart lib).
**Why:** Owners think in trends — is the business growing, are margins slipping, is collection improving? A month-at-a-time table hides that, and a falling collection rate is an early cash-crunch warning the single-month snapshot can't surface.

### 24. Receivable follow-up log & reminders  `M` · Receivables
Attach follow-up notes, promise-to-pay date, and next-action date to a customer's due, plus a dashboard of overdue accounts due for a call and optional SMS reminder-text generation.
**Why:** Aging tells you who is late but not what was promised or when to chase next. A follow-up log turns a static aging report into an actual collections workflow, directly improving cash recovery.

### 25. Bad-debt write-off with approval  `S` · Receivables
A formal write-off entry that clears an uncollectible due, requires OWNER approval, records reason, and posts to a bad-debt account distinct from everyday discount/waiver on payments.
**Why:** Waiver is buried inside a payment line with no approval trail today. Controlled write-offs keep receivables honest and make real losses visible instead of masking as discounts.

### 26. Purchase return (return-to-supplier)  `M` · Purchasing
A debit-note document against a purchase receipt: select lines/quantities returned to the supplier, reduce net stock, and record supplier-side value — mirroring the sales return flow.
**Why:** Defective or over-supplied bulk lots get sent back; without this, returned goods stay counted as on-hand forever, inflating inventory and understating cost accuracy.

### 27. Global search (command palette)  `M` · Usability
Top-bar / Cmd-K palette querying customers, styles, suppliers, challan numbers, and locations, jumping straight to the record. Styles already carry aliases.
**Why:** Staff constantly look up 'where is customer X' or 'style alias Y' and today navigate menu-by-menu. Cross-entity lookup matches how the Excel users worked (Ctrl-F everywhere).

### 28. Actual purchase costing & true inventory valuation  `L` · Finance
Add unitCost (and optional landed/freight allocation) to ReceiptLine, compute per-style moving-average or FIFO cost, and use it for COGS on sales and a live stock-on-hand value — replacing the flat ProductStyle.standardCost snapshot.
**Why:** Gross profit today is fiction (invoice minus a hand-set standard cost), so real buy-price swings on stocklots never reach the P&L. Actual costing gives true margin per challan and the real BDT value sitting in the godown — the single biggest number missing from the accounts. Larger because it touches the costing core.

### 29. Opening-balance carry-forward between months  `M` · Finance
At period close, roll closing cash/bank/wallet balances, stock qty/value, receivables, and payables forward as next month's opening figures, so months link instead of standing alone.
**Why:** The model inherits the workbook's month-in-isolation habit (openingDueBalance/openingCapitalBalance/isOpeningStock are one-off seeds). Auto carry-forward removes re-keying, prevents drift, and makes cumulative position trustworthy.

### 30. Partner profit distribution  `M` · Finance
Store partner profit-share ratios and a distribution run that allocates a period's net profit to each partner, posting to their capital/current account alongside existing capital movements.
**Why:** Owner listed this. partnerBalance tracks only money put in and taken out; profit earned is never credited, so partner equity is wrong. Distribution closes the loop between the P&L and each partner's real stake.

### 31. Auth hardening — password policy, login lockout, optional 2FA  `M` · Security
Enforce minimum-length/complexity in password.ts, add rate-limit/lockout after repeated failed logins in proxy.ts, and offer optional TOTP 2FA (with recovery codes) for OWNER/ADMIN.
**Why:** The app holds full financial and treasury data on a public Vercel URL with bare bcrypt and no throttling today. Policy + lockout close the brute-force path cheaply; 2FA on the two money-moving roles is the standard extra protection.

### 32. Cash & bank book with account reconciliation  `L` · Finance
Model each money account (cash box, bank, bKash, Nagad) with opening balance and a unified transaction book fed by collections, expense payments, deposits, and capital moves; add a reconcile screen ticking entries against a bank/wallet statement (CSV import).
**Why:** 'method' is a free-text label today, so no one can answer 'how much is in bKash right now?' A per-account book with reconciliation gives real cash position and catches missing or duplicated mobile-money transfers — a common leak.

### 33. Journal, general ledger & trial balance  `L` · Finance
A lightweight chart of accounts and double-entry journal mirroring existing transactions (sale, collection, purchase, expense, payment, capital) into debits/credits, with GL drill-down and a trial balance that must net to zero.
**Why:** The system is single-entry silos today with nothing cross-checking that sales, cash, dues, and expenses tie out. A journal/GL gives an auditable backbone, catches errors via self-balancing, and is the prerequisite for a real balance sheet.

## P2

### 34. Manual + scheduled data backup export  `M` · Admin
Admin action exporting the full dataset (all tables) as a timestamped multi-sheet Excel/JSON/ZIP download, plus an optional scheduled job that emails or stores the snapshot periodically.
**Why:** Gives the owner a tangible, self-serve safety net and a portability/exit path independent of the host, building trust for an SME committing its books to the system.

### 35. Balance sheet & net-worth statement  `M` · Finance
Period-end statement combining inventory value, receivables, and cash/bank balances (assets) against payables and partner capital (equity/liabilities), derived from the GL, with export/print.
**Why:** Reports stop at monthly P&L and stock count today. A balance sheet answers 'what is the business worth' — capital tied up in stock vs. dues vs. cash — which the P&L alone never shows and partners will ask about.

### 36. Barcode / quick style lookup & qty helpers  `M` · Usability
Faster line entry: type-ahead style search by code/name/alias, optional barcode/styleCode scan to add a line, and quantity helpers (carton x pieces, running subtotal) in sale and receipt forms.
**Why:** Manual per-line style selection is the slowest part of a multi-line challan. Scan/quick-lookup and carton math cut entry time and typos on high-line-count wholesale orders.

### 37. VAT / tax handling  `M` · Finance
Optional VAT (Mushak) fields on sale/purchase lines, inclusive/exclusive pricing, a VAT-payable summary (output minus input), and AIT/source-tax capture on supplier payments.
**Why:** Owner listed tax. As the business formalizes or supplies VAT-registered buyers, a Mushak-style return becomes mandatory; there's no tax field anywhere today, so retrofitting later would touch every transaction.

### 38. Per-location inventory + stock transfers  `L` · Inventory
Stock is global today (receipts/sale lines carry no location). Add locationId to receipt and sale lines and a StockTransfer document to move quantities between godowns/shops, then make net-stock filterable by location.
**Why:** A multi-godown wholesaler needs to know where stock physically sits and move it between locations; today the location field is decorative for inventory. Larger because it touches schema and the stock-aggregation core.

### 39. PWA / installable app with offline sale entry  `L` · Platform
Web manifest, icons, and a service worker so the app installs on a phone home screen, plus offline-capable challan/payment entry that queues and syncs when back online.
**Why:** Wholesale sales happen on the floor and on the road on phones with patchy data; an installable, offline-tolerant form is the difference between recording a sale on the spot vs. on paper and re-keying later.

### 40. Bulk actions on lists  `M` · Usability
Row-selection checkboxes with bulk operations: activate/deactivate customers/styles, bulk export selected, and batch status changes/payments where safe.
**Why:** End-of-season cleanup (deactivating dozens of dead styles/customers) and batch export currently require one-by-one edits; bulk actions save real time during periodic housekeeping.

### 41. Dashboard activity feed & onboarding empty-states  `S` · Usability
A dashboard widget listing latest sales, payments, receipts, and expenses (from existing records/audit), plus actionable first-run empty states that link to the next logical step and the import flow.
**Why:** The dashboard shows only static counters today; a 'what changed today' feed gives an absentee owner a quick pulse, and guided empty states shorten the cold-start for a team migrating off Excel. Cheap — components already exist.

### 42. Dark-mode toggle & keyboard shortcuts  `S` · Usability
A persisted light/dark/system theme switch (the UI is already dark-styled, only reacts to OS preference) plus shortcuts for frequent actions (new sale/expense, save, add line, focus search) with a discoverable help overlay.
**Why:** Both are cheap because the styling and forms already exist: a theme toggle helps on bright warehouse floors vs dim offices, and keyboard-first shortcuts speed the high-volume challan form for Excel-native staff.
