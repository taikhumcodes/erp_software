# ANTIGRAVITY EXECUTION PROMPT — PRODUCTION-READY ENTERPRISE REPORTING ENGINE

## Project

You are working inside the existing **Shield Max / Al-Bunyan ERP** codebase.

Your assignment is to **design, implement, integrate, test, and verify** the final major module before production handover:

> **Enterprise Reports Module + Secure Custom Report Builder**

This is an implementation task, not a planning or prototype task. Continue through discovery, coding, migrations, UI integration, automated testing, reconciliation, regression testing, and handover documentation. Do not stop after producing an architecture proposal.

The completed result must be safe for real business data and ready for production use.

---

## 1. Existing ERP Context

The ERP already includes, at minimum:

- Authentication and session management
- Role-based access control (RBAC)
- Dashboard and business intelligence
- Products, categories, brands, and units
- Customers and suppliers
- Purchases and sales
- Delivery orders and quotations
- Payments
- Finance, Accounts Master, and ledger
- Expenses and salary
- Settings
- Document Engine
- Audit logs
- English and Arabic presentation

Treat the existing application as the source of truth. Before implementing anything, inspect the repository and identify the actual:

- Frameworks, language, ORM, database, package manager, and build commands
- Module boundaries and folder conventions
- Database schema and migration system
- API conventions and validation approach
- Authentication, tenant/company scoping, RBAC, and permission helpers
- Sales, purchase, inventory, payment, finance, ledger, and profitability services
- Dashboard analytics and inventory-intelligence calculations
- Currency, decimal, date, time-zone, and locale utilities
- Translation/i18n and Arabic RTL architecture
- Document/PDF/export engine
- Background-job or queue infrastructure
- Audit-log conventions
- Test frameworks, fixtures, seed data, and CI checks

Do not assume a technology or create a parallel architecture when the repository already provides one. If the project uses Prisma and PostgreSQL, follow those patterns. If it uses something else, use the stack actually present.

---

## 2. Non-Negotiable Execution Contract

### 2.1 Production code only

The delivered module must contain complete, working code. Do not leave:

- Mock APIs or hardcoded report rows
- Placeholder pages or non-functional buttons
- `TODO`, `FIXME`, “coming soon,” or stub implementations
- Fake charts or sample totals presented as real values
- Frontend-only permission checks
- Silent error handling
- Arbitrary SQL entry points
- In-memory filtering of full production datasets

Every visible action must work end to end or be removed from the production UI.

### 2.2 Preserve existing behavior

Do not rewrite or silently change existing:

- Sales logic
- Purchase logic
- Inventory logic
- Payment allocation logic
- Finance or ledger posting logic
- Account-balance calculations
- Dashboard calculations
- Profit/cost calculations
- Document Engine
- Authentication or session handling
- RBAC behavior

Reuse existing services and shared calculations. A small shared-service extraction is allowed only when it preserves observable behavior and is covered by regression tests.

If an existing calculation appears incorrect, record the discrepancy with evidence and continue using the current source-of-truth behavior unless an approved fix is already within scope. Do not silently “correct” historical business logic as part of this module.

### 2.3 Read-only reporting

Running, previewing, printing, or exporting a report must never mutate operational data.

Reports may write only report-specific metadata such as:

- Saved report definitions
- Ownership and sharing records
- Recent-report history
- Export job metadata
- Report audit events

They must never modify products, stock, customers, suppliers, sales, purchases, quotations, delivery orders, payments, accounts, ledger entries, expenses, salary records, or source documents.

### 2.4 Work safely in the existing repository

- Read repository instructions before editing.
- Preserve unrelated user changes and avoid broad rewrites.
- Establish a baseline by running the relevant existing checks before implementation.
- Distinguish pre-existing failures from failures introduced by this work.
- Use additive, backward-compatible migrations.
- Never delete, rebuild, truncate, or reseed a populated database.
- Never test destructive behavior against production data.
- Do not claim completion when a required check is failing.

### 2.5 Do not ask questions the repository can answer

Inspect existing code and follow established conventions. Ask for user input only when a material business decision cannot be resolved from the codebase, configuration, or this prompt. If access to a required dependency or environment is blocked, report the exact blocker and the work that remains; never fabricate a successful result.

---

## 3. Definition of “Production-Ready”

The module is production-ready only when all of the following are true:

- Standard reports return correct values from the existing source-of-truth services/database.
- The Custom Report Builder works end to end without exposing raw tables or SQL.
- All authorization is enforced by the backend at report, data-source, field, row/company/tenant, saved-report, sharing, and export levels.
- Large datasets are filtered, joined, grouped, sorted, aggregated, and paginated server-side.
- Monetary values use exact decimal arithmetic and the existing KWD format with three decimal places.
- English and Arabic are complete, including RTL layout and exported documents.
- Loading, empty, validation, permission, timeout, and failure states are implemented.
- PDF, Excel, CSV where applicable, and print output are functional and consistent with on-screen totals.
- Database migrations are safe and backward compatible.
- Automated tests cover calculations, APIs, permissions, tenant/company isolation where applicable, UI flows, and exports.
- Required reconciliation checks against dashboard, inventory, accounts, receivables, and payables pass.
- Existing ERP regression tests, linting, type checks, and production builds pass.
- Performance is measured using representative populated data.
- A handover report provides evidence instead of unsupported claims.

---

## 4. Required Architecture

Build one reusable reporting engine shared by standard and custom reports.

```text
Reports UI
   ├── Standard Reports
   └── Custom Report Builder
            ↓
Report API and Authorization
            ↓
Report Definition Validator
            ↓
Controlled Report Registry / Query Planner
            ↓
Shared Business Analytics and Existing Services
            ↓
Existing ORM / Repository Layer
            ↓
Existing Database
```

Do not implement each standard report as an unrelated calculation universe.

The architecture must include, adapted to the conventions of the repository:

1. **Report catalog/registry**
   - Approved business data sources
   - Approved fields and display metadata
   - Valid relationships
   - Allowed operators per field type
   - Allowed aggregations and calculated fields
   - Required permissions and sensitivity classification
   - Translation keys and formatting rules

2. **Report definition validation**
   - Parse and validate all incoming report configurations on the server.
   - Reject unknown fields, relationships, operators, calculations, sorts, or groupings.
   - Reject combinations the current user is not authorized to access.
   - Version the saved-definition schema so future changes can be migrated safely.

3. **Query planning/execution**
   - Build parameterized ORM/query-builder operations from the allowlisted registry.
   - Push filters, joins, sorting, grouping, aggregation, and pagination to the database.
   - Apply company/tenant and soft-delete/history rules from the existing application.
   - Prevent N+1 queries and uncontrolled Cartesian joins.
   - Apply query limits, timeouts, and export limits.

4. **Shared analytics services**
   - Reuse the same sales, purchase, inventory, balance, receivable, payable, and profitability logic used by the current ERP.
   - If shared extraction is needed, cover old and new call sites with tests proving identical outputs.

5. **Presentation and export adapters**
   - One normalized result model should drive the table, totals, charts, Excel, PDF, CSV, and print views.
   - Exported values and totals must match the on-screen report for the same filters and as-of time.

6. **Audit and observability**
   - Record report actions using the existing audit framework.
   - Log safe diagnostic metadata, duration, row count, report identifier, and outcome without leaking sensitive values.

Use route, service, repository, component, and file names consistent with the current codebase. Do not force the example names in this prompt if the project has established conventions.

---

## 5. Business Accuracy Rules

### 5.1 Source of truth

- Use existing transaction status rules to determine whether draft, voided, cancelled, returned, reversed, or deleted records contribute to totals.
- Respect existing payment allocation and balance logic.
- Respect existing stock-movement and inventory-valuation logic.
- Respect the existing cost and profit method. Do not calculate historical profit using today’s product cost unless that is already the ERP’s official rule.
- Respect existing account normal-balance and opening-balance rules.
- Respect existing document and reference numbering.
- If returns, credit notes, debit notes, adjustments, or reversals exist, include them exactly as the current business services do.

### 5.2 Currency and arithmetic

- Currency is **KWD**.
- Display monetary values to **three decimal places** using the existing format utility.
- Use database decimal/numeric types and the project’s decimal library. Never use binary floating-point arithmetic for money.
- Define rounding only at the same boundaries used by existing business logic.
- Protect every ratio from division by zero.

### 5.3 Dates, periods, and aging

- Use the application’s configured business time zone and existing date utilities.
- Convert UI date ranges into explicit server-side boundaries.
- Make start/end inclusivity consistent and test records exactly on both boundaries.
- Dynamic saved ranges such as “This Month” must be resolved at execution time, not permanently converted into old static dates.
- Days outstanding must use the existing due date when present; otherwise use the established document-date fallback.
- Future-dated or not-yet-due items must not be placed into overdue buckets incorrectly.

Use these aging buckets unless the existing ERP defines approved alternatives:

- 0–7 days
- 8–30 days
- 31–60 days
- 61–90 days
- 90+ days

### 5.4 Inventory intelligence

- Reuse dashboard inventory-intelligence logic for average daily sales, stock coverage, low stock, dead stock, reorder recommendations, and status.
- Never invent average sales or coverage when history is insufficient.
- Show **Insufficient sales history** when a meaningful calculation cannot be made.
- Handle zero stock, negative stock if supported, no sales, discontinued items, and missing threshold settings explicitly.

### 5.5 Stable report snapshots

For a single report execution or export, totals and rows must represent one consistent query snapshot/as-of time as supported by the existing database. Long exports must not combine incompatible totals and rows caused by records changing midway through generation.

---

## 6. Reports Navigation and Landing Page

Create a clean Reports area consistent with the current ERP design system:

```text
Reports
├── Report Dashboard
├── Sales
├── Purchases
├── Inventory
├── Customers
├── Suppliers
├── Finance
├── Payments
├── Expenses
├── Salary
├── Delivery Orders
├── Quotations
├── Products
├── Profitability
├── Audit
└── Custom Reports
```

The Reports landing page must include permission-aware quick cards for:

- Sales
- Purchases
- Gross profit
- Receivables
- Payables
- Inventory value
- Low stock
- Dead stock
- Customer balances
- Supplier balances
- Expenses
- Cash and bank
- Payments
- Delivery orders

Also show:

- Recently generated reports
- The current user’s saved reports
- Shared reports available to the current user
- Clear shortcuts to create a custom report

Do not reveal the name, existence, summary, or totals of reports the user cannot access.

---

## 7. Global Report Behavior

Every applicable report must support a consistent filter experience.

### Date presets

- Today
- Yesterday
- This week
- This month
- Last month
- This quarter
- This year
- Last 7 days
- Last 30 days
- Last 90 days
- Custom date range

### Contextual filters

Expose only filters relevant to the selected report, including where applicable:

- Customer
- Supplier
- Product
- Category
- Brand
- Unit
- Sales invoice
- Purchase document
- Delivery order
- Quotation
- Payment method
- Account and account type
- Employee
- Status
- User and created by

Required shared behaviors:

- Applied-filter chips/summary
- Clear one filter and reset all
- Server-side sorting and pagination
- Preserved filters when changing page
- Shareable/reopenable state where allowed by existing routing conventions
- Loading skeleton/progress state
- Empty state that shows the applied criteria
- User-friendly validation and error messages
- Export of the full filtered dataset, not only the visible page

Default page sizes may include 25, 50, 100, and 250, with a safe server-enforced maximum.

---

## 8. Required Standard Reports

Implement the following templates using the common reporting engine. Field labels must use translation keys, and all totals must follow existing business rules.

### 8.1 Sales

#### Sales Summary

Required measures:

- Total sales
- Invoice count
- Total items/quantity sold
- Gross sales
- Discounts
- Net sales
- Paid amount
- Outstanding amount
- Average invoice value
- Gross profit
- Profit margin

There is **no GST/VAT/tax calculation** in this ERP. Do not add any tax field, tax total, or tax percentage.

#### Sales by Customer

- Customer
- Phone
- Invoice count
- Total sales
- Paid
- Outstanding
- Profit
- Last sale date

#### Sales by Product

- Product
- Product code
- Category
- Quantity sold
- Sales amount
- Average selling price
- Cost
- Gross profit
- Profit margin
- Last sold date

#### Sales by Category / Brand

- Category or brand
- Quantity sold
- Revenue
- Cost
- Profit
- Profit margin

#### Sales by Payment Method

- Payment method
- Transaction count
- Amount received

Avoid double-counting split payments, allocations, or reversals.

#### Outstanding Sales / Receivables

- Customer
- Invoice number
- Invoice date
- Due date where applicable
- Invoice amount
- Paid amount
- Outstanding amount
- Days outstanding
- Aging bucket

### 8.2 Purchases

#### Purchase Summary

- Total purchases
- Purchase-document count
- Purchase-invoice count where applicable
- Total purchase value
- Paid amount
- Outstanding amount
- Average purchase value

#### Purchases by Supplier

- Supplier
- Purchase count
- Total purchased
- Paid
- Outstanding
- Last purchase date

#### Purchases by Product

- Product
- Quantity purchased
- Purchase value
- Average cost
- Supplier where meaningful
- Last purchase cost
- Last purchase date

#### Outstanding Payables

- Supplier
- Purchase document
- Document date
- Due date where applicable
- Total
- Paid
- Outstanding
- Days outstanding
- Aging bucket

### 8.3 Inventory

#### Current Inventory / Inventory Valuation

- Product
- Product code
- Category
- Brand
- Current stock
- Unit
- Cost or valuation rate according to existing rules
- Stock value
- Selling price
- Potential sales value

#### Low Stock

- Product
- Product code
- Current stock
- Minimum stock
- Average daily sales
- Estimated days remaining
- Recommended order quantity
- Status
- Suggested action

Use the existing dashboard intelligence and settings. Recommendations must be explainable from available thresholds and history.

#### Stock Coverage

- Product
- Average daily sales
- Current stock
- Days remaining
- Status

Supported statuses:

- Out of stock
- Critical
- Low
- Healthy
- Overstocked
- No sales
- Insufficient sales history

#### Dead Stock

- Product
- Current stock
- Stock value
- Last sale date
- Days since last sale
- Quantity sold in the selected period
- Average daily sales
- Estimated capital locked
- Dead-stock band

Default analysis bands are 30+, 60+, 90+, and 180+ days. Use configurable existing thresholds when available.

### 8.4 Profitability

#### Product Profitability

- Product
- Units sold
- Revenue
- Cost
- Gross profit
- Margin percentage
- Profit per unit

Support sorting by highest/lowest profit and highest/lowest margin.

Also provide focused views for:

- Most profitable products
- Least profitable products
- Loss-making products

#### Customer Profitability

- Customer
- Revenue
- Cost
- Profit
- Margin
- Outstanding

### 8.5 Customers

#### Customer Master

- Customer name
- Phone
- Email
- Address
- Total sales
- Total paid
- Outstanding
- Invoice count
- Last purchase

#### Customer Statement

Header summary:

- Customer
- Report period
- Opening balance
- Sales/debits
- Payments/credits
- Adjustments where supported
- Closing balance

Transaction table:

- Date
- Document/reference
- Description
- Debit
- Credit
- Running balance

The opening balance must include activity before the selected start date according to existing ledger rules. Support print, PDF, and Excel.

#### Complete Customer History

- All sales
- All payments
- Outstanding invoices
- Delivery orders
- Quotations
- Total purchased
- Total paid
- Current balance
- Last transaction
- Product purchase history

### 8.6 Suppliers

Provide equivalent supplier reports:

- Supplier Master
- Purchase history
- Payment history
- Outstanding payables
- Supplier statement with opening and running balances
- Product purchase history
- Total purchased
- Total paid
- Outstanding
- Last purchase

### 8.7 Finance, Payments, and Ledger

#### Account Balances

- Account
- Account type
- Opening balance
- Debits
- Credits
- Current/closing balance

Honor each account type’s normal balance and the existing ledger conventions.

#### Cash and Bank

- Account
- Type
- Opening balance
- Money in
- Money out
- Current balance

#### Money Received

- Date
- Received from
- Amount
- Credited account
- Payment method
- Reference
- Related document
- Created by

#### Money Paid

- Date
- Paid to
- Amount
- Debited account
- Payment method
- Reference
- Related document
- Created by

#### Ledger

- Date/time or established posting order
- Account
- Transaction type
- Reference
- Description where available
- Debit
- Credit
- Running balance
- Created by

Allow account, date, transaction-type, and user filters. Running balances must remain correct across pagination by using a server-calculated opening/carry-forward balance.

### 8.8 Expenses

#### Expense Summary

- Total expenses
- Expense count
- Average expense
- Highest expense
- Expenses by category

#### Expense Details

- Date
- Category
- Description
- Amount
- Payment account
- Vendor
- Reference
- Created by

#### Expenses by Category

- Category
- Amount
- Percentage of total expense

### 8.9 Salary

- Employee
- Salary amount
- Payments
- Outstanding salary
- Payment date
- Salary period
- Payment account
- Status

Also provide an employee salary statement with complete salary/payment history. Salary data is sensitive and requires dedicated backend permission checks.

### 8.10 Delivery Orders

- Delivery order number
- Date
- Customer
- Related sale/order
- Customer PO
- Status
- Items
- Quantity
- Invoice status
- Created by

Support Delivered, Pending, Cancelled, Invoiced, and Not Invoiced filters using the statuses that actually exist in the application.

### 8.11 Quotations

- Quotation number
- Date
- Customer
- Total
- Status
- Created by
- Validity/expiry where available

Provide converted, pending, expired where supported, and cancelled views.

### 8.12 Products and Stock Movement

#### Product Performance

- Product
- Current stock
- Sales quantity/value
- Purchase quantity/value
- Revenue
- Cost
- Profit
- Margin
- Last sale
- Last purchase

#### Product Movement

- Date/time or established movement sequence
- Document
- Movement type
- Quantity in
- Quantity out
- Running balance

Use the existing inventory transaction source of truth. Running balances must be correct across pages.

### 8.13 Audit

- User
- Action
- Module
- Record/reference
- Date/time
- Reason where available
- Before/after details where authorized and available

Examples include invoice edits, payment changes, customer updates, product updates, account changes, and settings changes. Sensitive values and before/after payloads must be permission-protected and safely rendered.

---

## 9. Owner’s Business Performance Report

Create one permission-protected executive report that answers where money is made, where money is stuck, where money is being lost, and what needs attention.

Include:

### Revenue

- Total sales
- Sales growth versus the comparable previous period
- Average sale

### Purchases

- Total purchases
- Purchase growth versus the comparable previous period

### Profit

- Gross profit
- Profit margin
- Most profitable products
- Least profitable and loss-making products

### Customers

- Top customers
- Customers with outstanding balances
- New customers in the selected period

### Suppliers

- Top suppliers
- Outstanding payables

### Inventory

- Total stock value
- Low stock
- Out-of-stock items
- Dead stock
- Stock coverage

### Finance

- Cash balance
- Bank balances
- Money to receive
- Money to pay

### Expenses

- Total expenses
- Highest expense categories

Every comparison must identify its period and calculation basis. If no valid comparison period exists, show a truthful unavailable/insufficient-data state rather than a fabricated percentage.

---

## 10. Custom Report Builder

The Custom Report Builder is a core feature, not an optional enhancement.

Required flow:

```text
Reports → Custom Reports → Create Report
```

### Step 1 — Select a business data source

Expose approved business entities, never raw database tables. At minimum, where supported by the current data model:

- Customers
- Sales
- Sales items
- Purchases
- Purchase items
- Products
- Suppliers
- Payments
- Accounts
- Ledger
- Expenses
- Employees/salary
- Delivery orders
- Quotations

Each source must declare its required permission, available fields, valid relationships, default date field, and safe row scope.

### Step 2 — Select fields

Show translated, user-friendly business fields grouped by entity. Use checkboxes or the project’s established multiselect pattern. The catalog must distinguish dimensions, measures, dates, identifiers, sensitive fields, filterable fields, sortable fields, groupable fields, and aggregatable fields.

Example customer fields:

- Customer name
- Phone
- Email
- Address
- Total sales
- Total paid
- Outstanding
- Last sale date

Example sales fields:

- Invoice number
- Date
- Customer
- Product
- Category
- Quantity
- Selling price
- Revenue
- Cost
- Profit
- Profit margin
- Payment status
- Created by

### Step 3 — Add approved relationships

Allow only relationships defined in the server-side registry, for example:

```text
Customer → Sales → Sales Items → Product → Category
```

The query planner must:

- Prevent invalid joins
- Prevent data leakage across company/tenant boundaries
- Prevent accidental row multiplication and double-counted measures
- Use distinct or pre-aggregated subqueries only when mathematically correct
- Return a clear validation message for incompatible fields

### Step 4 — Build filters

Support multiple conditions and nested groups using `AND` and `OR`.

Example:

```text
(Customer = "ABC Trading" OR Customer = "XYZ Trading")
AND Outstanding > 0
AND Sales Date is within This Month
```

Supported operators must depend on field type:

- Equals / Not equals
- Contains
- Starts with / Ends with
- Greater than / Less than
- Greater than or equal / Less than or equal
- Between
- Is empty / Is not empty
- In / Not in where appropriate

Requirements:

- Validate types and required values on both frontend and backend.
- Parameterize all values.
- Escape wildcard behavior for text searches.
- Limit nesting depth and total condition count to a safe configured maximum.
- Never accept executable expressions or SQL fragments.

### Step 5 — Group, aggregate, and sort

Support:

- Multiple grouping levels
- Group subtotals
- Grand totals
- Multiple sort levels
- Ascending/descending sort
- Stable deterministic tie-breaking for pagination

Approved summary functions:

- Sum
- Count
- Count distinct where registered
- Average
- Minimum
- Maximum

Reject aggregation requests that are invalid for the selected field type or would create a misleading result.

### Step 6 — Calculated fields

Allow only predefined server-owned calculations such as:

- Profit
- Profit margin percentage
- Outstanding
- Average selling price
- Average purchase cost
- Days outstanding
- Days since last sale
- Stock coverage days

Do not allow users to submit arbitrary formulas, JavaScript, SQL, or template code. Every calculated field must have a documented data type, required inputs, calculation service, rounding rule, and permission level.

### Step 7 — Preview

Provide a debounced, cancellable live preview that updates when the definition changes.

Preview requirements:

- Server-executed query
- Small server-enforced row limit
- Applied-filter summary
- Visible column formatting
- Group subtotals and grand totals where selected
- Clear validation errors
- Loading, empty, cancelled, and failed states
- Request cancellation or stale-response protection when configuration changes quickly

### Step 8 — Visualization

Table view is required. Bar, line, and pie/donut charts are optional only when the selected dimensions and measures support a meaningful chart.

The server/catalog or a deterministic validation layer must prevent invalid chart configurations. Charts must use the same result and totals as the table and must remain readable in English and Arabic.

### Step 9 — Save and manage

Save the **report definition**, not generated report rows.

Required metadata:

- Name
- Description
- Category
- Owner
- Visibility
- Versioned configuration
- Created/updated timestamps

Provide:

- My Reports
- Shared Reports
- Open
- Edit
- Duplicate
- Rename
- Delete with confirmation
- Export

Users may modify only reports they own or are explicitly authorized to manage.

### Step 10 — Share

Authorized users may share a saved report with:

- Specific users
- Specific roles
- Everyone who has the required report permission

Sharing a definition never overrides permission to its underlying data. A user who receives a report must still pass current report-, source-, field-, row-, company/tenant-, and export-level authorization each time it is opened or run.

Finance, ledger, salary, profit, cost, audit, and personally sensitive fields require dedicated permission checks.

### Example saved configuration

Adapt the schema to the existing project, but preserve these concepts:

```json
{
  "schemaVersion": 1,
  "dataSource": "CUSTOMER",
  "fields": [
    "customer.name",
    "customer.phone",
    "metrics.totalSales",
    "metrics.totalPaid",
    "metrics.outstanding"
  ],
  "filters": {
    "type": "group",
    "operator": "AND",
    "conditions": [
      {
        "type": "condition",
        "field": "metrics.outstanding",
        "operator": "GT",
        "value": "0.000"
      }
    ]
  },
  "groupBy": [],
  "sort": [
    {
      "field": "metrics.outstanding",
      "direction": "DESC"
    }
  ],
  "dateRange": {
    "type": "THIS_YEAR"
  },
  "visualization": {
    "type": "TABLE"
  }
}
```

Validate this structure on write and again on every execution. Handle old schema versions explicitly; do not assume saved JSON remains valid forever.

---

## 11. API and Server Contract

Implement endpoints/actions consistent with the existing API style for these capabilities:

- List accessible standard reports and catalog metadata
- Retrieve valid fields, relationships, operators, calculations, and chart options
- Validate a report definition
- Preview a report
- Execute a paginated report
- Create, read, update, duplicate, and delete saved reports
- List recent, owned, and shared reports
- Manage sharing
- Start and retrieve exports
- Retrieve export status/file through authorized access

Every endpoint must include:

- Authentication
- Backend authorization
- Company/tenant/row scoping where applicable
- Request schema validation
- Bounded pagination and query complexity
- Predictable error codes/messages
- Audit behavior where required
- Tests for success and failure paths

Do not expose ORM model names, table names, SQL errors, stack traces, or database details in API responses.

---

## 12. Security Requirements

Security is part of the Definition of Done.

### Authorization

- Never rely on navigation hiding or disabled buttons as authorization.
- Enforce permissions in service/API code for every report execution and export.
- Enforce object-level access for saved reports and share settings.
- Enforce field-level access for salary, cost, profit, finance, ledger, audit details, contact information, and any other sensitive field.
- Re-evaluate permissions when a saved/shared report is run; do not trust permissions captured at creation time.
- Preserve existing company/branch/tenant isolation across every relationship and aggregation.

### Injection and unsafe content

- No raw SQL, raw ORM fragments, user-defined code, template execution, or arbitrary formulas.
- Use an allowlisted registry and parameterized queries.
- Sanitize report names/descriptions and safely render audit before/after data.
- Prevent spreadsheet formula injection in CSV/XLSX cells beginning with `=`, `+`, `-`, or `@` according to the export library’s safe convention.
- Prevent HTML/script injection in report tables, print views, filenames, and PDF templates.

### Abuse and resource control

- Apply validated maximum page size.
- Limit selected fields, joins, filter conditions, nesting depth, grouping levels, and sort levels.
- Apply database/query timeout and export row/file-size limits.
- Use rate limiting or existing request controls for repeated previews and exports.
- Use background jobs or streaming for large exports if the existing infrastructure supports it.
- Expire export files and ensure only authorized users can retrieve them.

### Audit events

Record, following existing audit conventions:

- Report created
- Report updated
- Report duplicated
- Report deleted
- Report generated when required by policy
- Report exported
- Report shared/unshared

For sensitive reports, capture user, report ID/type, timestamp, safe filter summary, format, outcome, duration, and row count. Do not place full sensitive datasets in audit logs.

---

## 13. Export and Print Requirements

All applicable standard and custom reports must support:

- Excel `.xlsx`
- PDF
- A4-optimized browser print
- CSV for suitable raw/tabular datasets

Use the existing Document Engine and brand/design system.

Required document metadata:

- Company logo and company name
- Report title
- Report period/as-of time
- Generated date/time
- Generated by
- Applied filters
- Data table
- Group subtotals and grand totals where applicable
- Page numbers in paginated formats
- Confidentiality indicator for sensitive reports where the existing design supports it

Formatting requirements:

- KWD with three decimal places
- Existing number, date, locale, and RTL conventions
- Repeated table headers across PDF pages
- Sensible column sizing, wrapping, and landscape orientation for wide reports
- No clipped totals, overlapping content, blank overflow pages, or unreadable Arabic text
- Safe, deterministic filenames

The export must represent the full filtered dataset subject to server limits, not only the current UI page. If a limit is reached, fail clearly or provide the supported background-export flow; never silently truncate data.

Do not add GST, VAT, tax, or tax-percentage fields.

---

## 14. English, Arabic, RTL, and Accessibility

- Use the current i18n framework and translation-key conventions.
- Do not hardcode user-facing English strings.
- Provide complete English and Arabic translations for navigation, fields, filters, operators, statuses, validation, errors, empty states, exports, and print layouts.
- Use the current locale to control presentation; do not show bilingual slash-separated labels unless that is the established UI behavior.
- Verify Arabic RTL layout for the dashboard, builder, tables, drawers/modals, charts, pagination, PDF, and print.
- Preserve numeric accuracy and KWD formatting in both locales.
- Ensure keyboard access, visible focus, associated labels, meaningful headings, accessible table structure, and non-color-only status communication.

---

## 15. Performance and Scalability

Never load the entire dataset into React/the browser for filtering or aggregation.

Required data flow:

```text
Frontend → Report API → Report Service → Repository/ORM → Database
```

Requirements:

- Server-side filters, relationships, aggregates, sorting, and pagination
- Select only required columns
- Avoid N+1 queries
- Deterministic indexed ordering for pagination
- Correct count strategy for large grouped queries
- Query cancellation or stale-request handling for previews
- Streaming or background processing for large exports where appropriate
- No unbounded `findMany`, equivalent ORM call, or full-table materialization
- No caching unless scoping, freshness, and invalidation are correct and tested

Use representative populated data to measure critical reports. Follow existing project SLOs if defined. If none exist, target a responsive first page/preview under normal production-like load, document measured timings and dataset size, and optimize any clearly slow query using query plans and justified indexes.

Any new index must be added through a safe migration and must be justified by actual query patterns. Avoid excessive indexes that slow transactional writes.

---

## 16. Persistence Model for Saved Reports

Use the existing database conventions. The persistence design must support:

- Stable report ID
- Owner
- Name and description
- Category
- Visibility
- Versioned definition JSON/configuration
- Created/updated timestamps
- Soft-delete behavior if that is the existing convention
- Company/tenant scope where applicable
- Sharing with users/roles using established identity models
- Optional last-run/recent-history metadata without storing generated rows as the report definition

Add database constraints and indexes for ownership, scope, visibility, and lookup patterns. Validate definition size and structure. Migrations must be additive, reviewable, reversible where the migration system supports it, and safe for a populated database.

---

## 17. Empty States and Error Handling

An empty result is not an application error. Show:

> No data found for the selected filters.

Also show the active period and applied filters.

Handle at minimum:

- Invalid or incompatible fields
- Invalid filter value/type
- Invalid date range
- Missing or unauthorized relationship
- Permission denied
- Saved report no longer valid after schema/catalog changes
- Referenced entity removed or archived historically
- Report timeout or complexity limit
- Export failure/expiry
- Network failure and retry
- Empty dataset

Messages must be useful, translated, and safe. Never expose SQL, ORM errors, stack traces, secrets, or internal identifiers that the UI does not require. Log the underlying error through the existing server logging approach.

---

## 18. Required Test Coverage

Use the project’s existing test tools and patterns. Add test data only through safe fixtures/factories. Never modify real production records for testing.

### 18.1 Unit tests

Cover:

- Period/date-boundary resolution
- Aging buckets
- Decimal arithmetic and rounding
- Profit/margin and division-by-zero behavior
- Opening, closing, and running balances
- Inventory coverage/dead-stock status
- Filter-tree validation
- Field/operator compatibility
- Relationship validation
- Aggregation validation
- Saved-definition schema/version validation
- Export-cell sanitization

### 18.2 Integration/API tests

Cover:

- Every standard-report family
- Custom preview and execution
- Nested AND/OR filters
- Grouping, subtotals, grand totals, and multi-sort
- Pagination with stable, non-duplicated results
- Saved-report CRUD and duplication
- Sharing rules
- Export initiation/completion/download authorization
- Empty data and invalid input
- Timeout/complexity limits
- Audit events

### 18.3 Security tests

Cover:

- Unauthenticated access
- Missing report permission
- Sensitive field denial
- Salary/finance/ledger/profit/audit restrictions
- Access to another user’s private saved report
- Unauthorized edit/delete/share/export
- Cross-company/cross-tenant access where applicable
- Forged field, relationship, operator, calculation, and sort identifiers
- SQL/script/formula injection attempts
- Permission removal after a report has been shared

### 18.4 End-to-end UI tests

Cover at minimum:

- Open Reports dashboard
- Run a standard report with filters
- Paginate and sort
- Create a custom report
- Select a relationship and fields
- Add nested filters
- Group and aggregate
- Preview
- Save, reopen, edit, duplicate, share, and delete
- Export PDF/Excel/CSV where applicable
- Print view
- Permission-restricted navigation and direct URL
- English and Arabic/RTL
- Loading, empty, validation, and failure states
- Responsive behavior

### 18.5 Export tests

Verify:

- Correct MIME type and filename
- File is not corrupt and can be parsed/opened by an automated library
- Headers, filters, rows, totals, and currency values match the report result
- Multi-page PDF layout and repeated headers
- Arabic text renders correctly
- Wide-table layout is readable
- Large exports do not silently truncate
- Formula injection is neutralized

### 18.6 Regression tests

Run the full relevant existing suite and confirm the new module did not alter transaction, stock, payment, finance, ledger, dashboard, document, authentication, or RBAC behavior.

---

## 19. Mandatory Data Reconciliation

Before completion, compare reports against existing source-of-truth screens/services using the same company, period, status rules, and as-of time.

Required reconciliations:

| Comparison | Required result |
| --- | --- |
| Dashboard sales vs. Sales Summary | Exact match |
| Dashboard inventory vs. Inventory Valuation | Exact match |
| Dashboard receivables vs. Receivables Report | Exact match |
| Dashboard payables vs. Payables Report | Exact match |
| Finance/Accounts Master balance vs. Account Balance Report | Exact match |
| Customer balance vs. Customer Statement closing balance | Exact match |
| Supplier balance vs. Supplier Statement closing balance | Exact match |
| Inventory movement closing quantity vs. current stock | Exact match under existing rules |
| On-screen totals vs. exported totals | Exact match |

Test boundary and edge cases including:

- Partially paid documents
- Split/multiple payments
- Cancelled/voided documents
- Returns/reversals where supported
- Opening balances
- Zero and negative values where valid
- Documents exactly on the start/end date boundary
- No-history products
- Deleted/archived references retained in history

Investigate every discrepancy. Do not hide it with rounding, independent formulas, or frontend adjustments.

---

## 20. Implementation Sequence

Follow this sequence while continuing autonomously unless a genuine blocker requires user input:

1. **Repository discovery and baseline**
   - Read project instructions and architecture.
   - Map source-of-truth services, permissions, i18n, Document Engine, audit, and tests.
   - Run baseline checks and record pre-existing failures.

2. **Reporting foundation**
   - Add safe persistence migrations.
   - Implement report catalog/registry, validation, permissions, query planning, result contracts, and audit integration.

3. **Standard reports**
   - Implement templates through the shared engine/services.
   - Reconcile core figures early before building all screens.

4. **Custom Report Builder**
   - Implement approved sources, fields, relationships, filter tree, grouping, sorting, aggregates, calculations, preview, save/manage, and sharing.

5. **User interface**
   - Build the landing page, report views, responsive table experience, states, bilingual content, Arabic RTL, and accessibility behavior.

6. **Export and print**
   - Integrate PDF, Excel, CSV, print, authorization, audit, and large-export handling.

7. **Testing and performance**
   - Add unit, integration, security, E2E, export, and performance coverage.
   - Test with a safe populated database or sanitized production-like copy.

8. **Reconciliation and regression**
   - Complete the mandatory comparison table.
   - Run the full relevant suite, lint, type checks, and production build.

9. **Documentation and handover**
   - Document permissions, report definitions, API/contracts, migrations, test commands, operational limits, and manual verification.

Do not postpone tests, security, translations, exports, or error states as “future improvements.” They are part of this module.

---

## 21. Required Final Verification Commands

Use the commands defined by the repository. At minimum, execute the applicable equivalents of:

- Backend unit and integration tests
- Frontend unit/component tests
- End-to-end tests
- Security/permission tests
- Linting
- Type checking
- Production frontend build
- Backend compile/build/startup validation
- Migration status/validation
- Export verification

If a check cannot run, state exactly why, show what was run instead, and do not mark the affected requirement as passed.

---

## 22. Definition of Done Checklist

Do not declare completion until every applicable item is verified.

### Functionality

- [ ] Reports dashboard and navigation are complete.
- [ ] Every required standard-report family is implemented.
- [ ] Owner’s Business Performance Report is implemented.
- [ ] Custom data-source, field, and relationship selection works.
- [ ] Nested AND/OR filters work.
- [ ] Dynamic and custom date ranges work.
- [ ] Grouping, subtotals, totals, aggregations, and multi-sort work.
- [ ] Registered calculated fields work.
- [ ] Preview and supported charts work.
- [ ] Save, reopen, edit, duplicate, rename, delete, and share work.
- [ ] PDF, Excel, print, and applicable CSV exports work.

### Accuracy

- [ ] Dashboard and report sales match.
- [ ] Inventory totals match the inventory source of truth.
- [ ] Receivables and payables reconcile.
- [ ] Account and statement balances reconcile.
- [ ] Profit uses existing cost logic.
- [ ] No GST/VAT/tax has been introduced.
- [ ] KWD three-decimal precision is preserved end to end.
- [ ] UI and export totals match.

### Security

- [ ] Authentication and backend RBAC are enforced.
- [ ] Company/tenant isolation is enforced where applicable.
- [ ] Sensitive fields and reports have granular authorization.
- [ ] Private/shared report object permissions are enforced.
- [ ] Export permission and download authorization are enforced.
- [ ] No raw SQL or arbitrary formula/code execution is exposed.
- [ ] Injection and resource-abuse controls are tested.
- [ ] Audit events are verified.

### UX and documents

- [ ] English is complete.
- [ ] Arabic and RTL are complete.
- [ ] Desktop, tablet, and mobile behavior is usable.
- [ ] Loading, empty, validation, permission, and error states work.
- [ ] Tables are keyboard/accessibility friendly.
- [ ] A4 PDF and print layouts are professional and readable.
- [ ] Excel/CSV files are valid and safe.

### Engineering quality

- [ ] Migrations are safe for a populated database.
- [ ] Queries are server-side, bounded, and free from known N+1 problems.
- [ ] Representative performance is measured and documented.
- [ ] Automated tests pass.
- [ ] Lint, type checks, and production builds pass.
- [ ] Relevant ERP regression suite passes.
- [ ] No mocks, stubs, placeholder buttons, or unfinished TODOs remain in the delivered scope.
- [ ] No unrelated modules or business behaviors were changed.

---

## 23. Required Handover Report

At the end, return a concise but evidence-based implementation report containing:

1. **Final status** — Complete, Partially Complete, or Blocked.
2. **Implemented scope** — standard reports, builder, exports, security, i18n, and UI.
3. **Architecture summary** — how the shared engine reuses existing business services.
4. **Files changed** — grouped by backend, frontend, database, tests, and documentation.
5. **Migrations** — purpose, safety notes, and status.
6. **Permissions matrix** — roles/permissions for report families, sensitive fields, sharing, and exports.
7. **API/actions added** — request purpose and authorization.
8. **Automated verification** — exact commands and pass/fail counts.
9. **Reconciliation evidence** — the mandatory comparison table with filters/period and actual figures.
10. **Performance evidence** — dataset size, key query/report timings, and any indexes added.
11. **Regression result** — what existing modules were checked.
12. **Known limitations or blockers** — explicit and honest; write “None” only if there are none.
13. **Manual testing checklist** — step-by-step actions and expected results for the running ERP.

Do not say “production-ready,” “fully tested,” or “complete” without providing the corresponding verification evidence.

---

## 24. Manual Acceptance Checklist for Handover

Include a practical checklist that a non-developer can run in the live/staging application. It must cover:

1. Open Reports and verify permission-aware navigation.
2. Run Sales Summary for This Month and compare it with Dashboard sales.
3. Filter Sales by Customer and confirm invoice drill-down values.
4. Open Receivables and verify a partially paid invoice and its aging bucket.
5. Open Payables and verify a supplier balance.
6. Open Inventory Valuation and compare selected product quantities with stock.
7. Open Low Stock, Stock Coverage, and Dead Stock and verify truthful insufficient-history states.
8. Open Customer and Supplier Statements and verify opening, running, and closing balances.
9. Open Account Balance and Ledger and verify a known transaction.
10. Verify salary, profit, finance, and audit access with both authorized and unauthorized roles.
11. Build a custom customer-sales-product report with grouped AND/OR filters.
12. Preview, save, reopen, edit, duplicate, share, and delete the custom report.
13. Confirm a shared user still cannot access fields outside their permissions.
14. Export the same filtered report to PDF, Excel, and CSV where available; compare row counts and totals.
15. Print an A4 report and inspect headers, page numbers, totals, and clipping.
16. Repeat important flows in Arabic and verify RTL, labels, tables, and exported Arabic text.
17. Check desktop, tablet, and mobile layouts.
18. Verify loading, empty, invalid-filter, permission-denied, network-failure, and export-failure states.
19. Confirm no report action changed sales, stock, payment, finance, ledger, or document data.

Every checklist item must include the expected result and a place to record Pass/Fail.

---

## Final Instruction

Build this as a **reusable, secure, accurate reporting platform**, not a collection of loosely connected database tables.

The owner must be able to answer questions such as:

- How much did we sell in a selected period?
- Which customers bought the most and which still owe money?
- Which suppliers must be paid?
- Which products generate profit, weak margins, or losses?
- Which stock is low, overstocked, or becoming dead stock?
- How long will current stock last?
- How much money is in each cash/bank account?
- What money came in and went out?
- Where are expenses concentrated?
- What did a specific customer buy and pay?
- What happened in a specific account or stock movement?
- Who changed a sensitive record?

When a standard report does not answer the question, the authorized owner must be able to build the answer safely through the Custom Report Builder without developer assistance.

Implement the module completely, verify it against populated production-like data, reconcile it with existing source-of-truth figures, run regression checks, and provide evidence. The work is not complete until all applicable Definition of Done items pass.
