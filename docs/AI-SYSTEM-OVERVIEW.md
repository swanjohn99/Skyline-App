# Skyline-App — System Module Reference (for AI agents)

> **Purpose:** Machine-readable map of what this application does, how modules connect, and where code lives. Read this before making changes.

---

## What this system is

Multi-tenant **construction project management** web app. Each **company** (workspace) tracks projects, clients, expenses, payments, milestones, and loans. Company **owners** manage teams and branding. A platform **super_admin** can inspect and delete tenants.

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, React Router 7, Recharts, Lucide |
| Backend | PHP 8+ (PDO), Composer (`phpoffice/phpword` for `.docx` generation) |
| Database | MariaDB / MySQL |
| Auth | PHP session cookies (`password_hash` / `password_verify`) |
| Email | SMTP for password-reset links |

**Deploy shape:** SPA at `/app/`, API at `/api/`, same origin. Session cookie path `/`.

> **Note:** Older docs (`docs/01-product-overview.md`, `docs/README.md`, `docs/schema.sql`) describe the original Supabase/Postgres design. The **canonical** schema is [`api/schema.sql`](../api/schema.sql). Tenant isolation is enforced in PHP, not DB-level RLS.

---

## Architecture

```
Browser (React SPA)
  └─ src/api/*.js              data-access layer
       └─ src/apiClient.js      fetch wrapper, credentials: include
            └─ api/index.php    router
                 └─ api/routes/*.php
                      └─ api/lib/session.php, db.php, uploads.php, …
                           └─ MariaDB
```

**Multi-tenancy:** Every business query is scoped by the logged-in user's `company_id` via `data_context()` in the PHP session layer. Clients never send `company_id` on insert; the server stamps it.

**Super admin:** Sees all companies. Sidebar **View company data** dropdown stores `company_id` in `localStorage`; `apiClient.js` appends it to GET requests and POST/PATCH bodies so the admin can inspect one tenant at a time.

**State patterns:**
- Parent pages hold `refresh` counter; children re-fetch when it changes.
- Tables paginate client-side at 50 rows (`usePagination`, `TablePagination` in `src/constants.js` → `TABLE_PAGE_SIZE`).

---

## Roles and access

| Role | Scope | Key capabilities |
|------|-------|------------------|
| `super_admin` | All companies | Admin page, delete companies/users, tenant switcher |
| `owner` | Own company | Full data access, Team page, logo/favicon upload |
| `member` | Own company | Data access while `profiles.is_active = 1` |

### Auth and onboarding flow

1. **Logged out** → `LoginPage` (sign in, sign up, forgot password)
2. **Logged in, no profile** → `OnboardingPage` (join company, create company, or skip)
3. **Joined, pending** (`is_active = 0`) → `PendingApprovalPage`
4. **Skipped company** → personal workspace; can complete setup later at `/setup`
5. **Logged in + active** → `AppShell` with sidebar routes

Password reset: `/reset?token=…` → `ResetPasswordPage` (reachable before auth gate).

---

## Auth and session module

| Area | Files |
|------|-------|
| Frontend | `src/context/AuthContext.jsx`, `src/api/auth.js`, `src/authSessionHandler.js` |
| Backend | `api/routes/auth.php`, `api/lib/session.php` |

| Feature | Behavior |
|---------|----------|
| Login | Email + password; optional `remember_me` extends idle window |
| Session | Cookie `skyline_sid`; validated against `users.active_session_token` |
| Concurrent login | New login overwrites `active_session_token` — the previous tab gets 401 on its next request |
| Idle timeout | 30 minutes without a server touch invalidates the session |
| Remember device | `session_remember_until` (30 days) widens the idle window to 30 days |
| Heartbeat | Frontend pings `POST /auth/heartbeat` every 5 min while tab is visible so readers-without-clicks stay signed in |
| Idle warning | UI shows a "Stay signed in" banner ~2 minutes before `expires_at`; server returns `expires_at` on every auth touch |
| Logout | Clears DB session fields + destroys cookie |

**Endpoints:** `GET /auth/session`, `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/heartbeat`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Promote super admin:** SQL on `profiles` — see root [`README.md`](../README.md).

---

## Company, team, and branding module

| Area | Files |
|------|-------|
| Pages | `TeamPage`, `OnboardingPage`, `PendingApprovalPage`, `SetupPage` |
| API | `api/routes/profile.php` (`/profile`, `/companies`, `/members`) |
| Frontend | `src/api/profiles.js`, `src/components/CompanyBrandingCard.jsx`, `src/components/ImageCropModal.jsx` |
| Uploads | `api/lib/uploads.php` → `api/uploads/logos/`, `api/uploads/favicons/` |

| Feature | Endpoint / behavior |
|---------|---------------------|
| Get profile | `GET /profile` — nested `companies: { name, logo_path, favicon_path }` |
| Skip company setup | `POST /profile/skip` — personal workspace |
| Create company | `POST /companies` — caller becomes owner |
| Search companies | `GET /companies?search=` — prefix match, min 2 chars |
| Join company | `POST /companies/join` — pending until owner approves |
| List members | `GET /members` |
| Update member | `PATCH /members/{id}` — `role`, `is_active` |
| Upload logo | `POST /companies/logo` — owner only; square crop → 512×512 PNG |
| Delete logo | `DELETE /companies/logo` |
| Upload favicon | `POST /companies/favicon` — owner only; square crop → 128×128 PNG |
| Delete favicon | `DELETE /companies/favicon` |

Branding appears in the sidebar (logo + company name) and browser tab (`useCompanyFavicon`).

---

## Dashboard module

| Area | Files |
|------|-------|
| Page | `src/pages/Dashboard.jsx` |
| API | `api/routes/dashboard.php`, `src/api/dashboard.js` |
| Charts | Recharts bar chart; `FinancialBreakdownPie3D.jsx` (lazy, Three.js) |

**Metrics:** Active project count, total projects, completed revenue (month/year).

**Charts:** Income vs expenses for current month and rolling 12 months. Lead funnel widget and today's open tasks.

**Important:** Dashboard "Profit" = sum of `total_quoted_amount` for completed jobs — **not** net margin (does not subtract expenses).

---

## Calendar module

| Area | Files |
|------|-------|
| Page | `src/pages/CalendarPage.jsx` |
| Components | `TaskCalendar.jsx`, `AddTaskForm.jsx` |
| API | `api/routes/tasks.php`, `src/api/tasks.js` |

| Capability | Details |
|------------|---------|
| View | Month/week/agenda via react-big-calendar; loads tasks for visible date range |
| Add task | Click empty date → form with title, type, due date, optional lead/project link |
| Complete | Click existing event toggles `is_completed` |

---

## Projects module

| Area | Files |
|------|-------|
| Pages | `ProjectPage`, `ProjectDetailsPage` |
| API | `api/routes/projects.php`, `src/api/projects.js` |
| Components | `AddProjectForm`, `ProjectTable`, `UpdateProjectForm`, `FinancialBreakdownChart` |
| Finance helpers | `src/utils/projectFinance.js` |

| Capability | Details |
|------------|---------|
| CRUD | Create, read, update — **no delete** |
| Status pipeline | `site visit requested` → `site visit done` → `quotation sent` → `work started` → `work completed` / `completed` / `rejected` |
| Finances | `total_quoted_amount` (nullable), `amount_received`, derived pending |
| Pending display | Only when quoted total > 0 (`projectPending`, `hasQuotedTotal`) |
| Client link | Optional `client_id` |
| Detail page | Project info, financial breakdown chart, payments/expenses/milestones tables with add forms |
| Multi-POC | `EntityContactsTable` on detail page and edit modal; draft POCs on create form |

---

## Clients and CRM module

| Area | Files |
|------|-------|
| Pages | `ClientsPage`, `ClientDetailsPage` |
| API | `api/routes/clients.php`, `api/routes/customer_accounts.php` |
| Frontend | `src/api/clients.js`, `src/api/customerAccounts.js` |

| Type | Behavior |
|------|----------|
| B2C (`b2c`) | Individual contact |
| B2B (`b2b`) | Contact person linked to a `customer_accounts` organization |
| Fields | name, email, phone, address, location, source, tags (JSON), notes, contact_title |
| CRUD | Full create, read, update, delete on clients and customer accounts |
| Display | `clientDisplayName()` — B2B shows `Name (Org)` |
| Multi-POC | Link additional client records as points of contact on detail page and edit form |

---

## Expenses module

| Area | Files |
|------|-------|
| Page | `ExpensePage` |
| API | `api/routes/expenses.php`, `src/api/expenses.js` |
| Components | `AddExpenseForm`, `ExpenseTable` |

- Always linked to a project (`project_id` required)
- Types: `material`, `labour`, `transportation`, `other`
- Full CRUD (create, list, update, delete)
- Feeds dashboard charts and project detail totals

---

## Payments module

| Area | Files |
|------|-------|
| Page | `Payments.jsx` |
| API | `api/routes/payments.php`, `src/api/payments.js` |
| Components | `AddPaymentForm`, `PaymentsTable` |

- Always linked to a project
- Methods: `cash`, `online_transfer`, `cheque`
- Optional `comments` field
- Full CRUD; also addable from project detail and update-project modal
- **Known gap:** inserting/updating payments does **not** sync `projects.amount_received`

---

## Milestones module

| Area | Files |
|------|-------|
| Page | `MilestonesPage` |
| API | `api/routes/milestones.php`, `src/api/milestones.js` |
| Components | `AddMilestoneForm`, `MilestoneTable` |

- Per-project dated markers: `title`, `milestone_date`, `comments`
- Full CRUD; also manageable from project detail page
- Migration: `api/migrations/007_milestones.sql`

---

## Loans module

| Area | Files |
|------|-------|
| Page | `LoansPage` |
| API | `api/routes/loans.php`, `api/routes/lenders.php` |
| Frontend | `src/api/loans.js`, `src/api/lenders.js`, `src/api/loanRepayments.js` |
| Components | `LoansTable`, `AddLoanForm`, `AddLenderForm`, `AddLoanRepaymentForm`, `LoanRepaymentsNestedTable` |
| Interest | `api/lib/loan_interest.php` |

| Entity | Purpose |
|--------|---------|
| **Lenders** | Who lent money (name, phone, address) |
| **Loans** | Principal, loan date, interest rate, interest period (`year` / `month`), notes |
| **Repayments** | Partial or full payback; methods: `cash`, `online_transfer` |
| **Computed** | Outstanding balance and accrued interest (server-side) |

Full CRUD on lenders, loans, and repayments. Migration: `api/migrations/004_loans.sql`.

---

## Admin module (super_admin only)

| Area | Files |
|------|-------|
| Page | `AdminPage` |
| API | `api/routes/admin.php`, `src/api/admin.js` |

| Endpoint | Action |
|----------|--------|
| `GET /admin/companies` | List all companies with member counts |
| `DELETE /admin/companies/{id}` | Delete company |
| `GET /admin/users` | List all users with company/role |
| `PATCH /admin/users/{id}` | Update role, company, active status |
| `DELETE /admin/users/{id}` | Delete user |

---

## UI shell and cross-cutting concerns

| Concern | Location |
|---------|----------|
| App shell + routes | `src/App.jsx` |
| Auth gates | `App` — loading, login, onboarding, pending, then `AppShell` |
| Sidebar nav | Dashboard, Projects, Milestones, Clients, Loans, Expenses, Payments; Team (owner+), Admin (super_admin) |
| Page titles | `src/hooks/usePageTitle.js` → `{Page} · {companyName}` |
| Favicon | `src/hooks/useCompanyFavicon.js` |
| Date inputs | `src/components/DateInput.jsx` |
| Formatting | `src/utils/format.js` — INR (`en-IN`) currency and dates |
| Constants | `src/constants.js` — roles, statuses, expense/payment/loan types, badge classes |
| Login branding | White-label — no hardcoded company name on login/reset pages |
| Design tokens | `src/index.css`, `src/App.css` |
| 401 handling | `apiClient.js` → `authSessionHandler.js` → `AuthContext.clearAuth()` |

### Frontend routes

Sidebar uses collapsible groups via [`src/components/SidebarNav.jsx`](../src/components/SidebarNav.jsx):

| Group | Items |
|-------|--------|
| (top) | Dashboard, Leads, Loans, Calendar |
| Projects | Projects, Milestones, Expenses, Payments |
| CRM | Clients, Loan Lenders, Procurement Vendors |
| Config | Procurement (chemicals/prices), Catalog (owner) |
| Settings | Audit Log (owner), Team |
| (bottom) | Admin (super_admin) |

| Path | Page | Nav |
|------|------|-----|
| `/` | Dashboard | ✓ |
| `/leads` | LeadsPage | ✓ |
| `/leads/:id` | LeadDetailsPage | — |
| `/projects` | ProjectPage | Projects group |
| `/projects/:id` | ProjectDetailsPage | — |
| `/milestones` | MilestonesPage | Projects group |
| `/expenses` | ExpensePage | Projects group |
| `/payments` | Payments | Projects group |
| `/clients` | ClientsPage | CRM group |
| `/clients/:id` | ClientDetailsPage | — |
| `/loan-lenders` | LoanLendersPage | CRM group |
| `/procurement/vendors` | ProcurementVendorsPage | CRM group |
| `/procurement` | ProcurementPage | Config group |
| `/catalog` | CatalogSettingsPage | Config (owner) |
| `/audit-log` | AuditLogPage | Settings (owner) |
| `/loans` | LoansPage | ✓ |
| `/calendar` | CalendarPage | ✓ |
| `/team` | TeamPage | Settings |
| `/admin` | AdminPage | super_admin |
| `/setup` | SetupPage | — |
| `/reset` | ResetPasswordPage | — (pre-auth) |

---

## API route index

| Resource | Route file | Notes |
|----------|------------|-------|
| `auth` | `auth.php` | Session, signup, login, logout, password reset |
| `profile` | `profile.php` | Current user profile |
| `companies` | `profile.php` | Search, create, join, logo, favicon |
| `members` | `profile.php` | Team list and updates |
| `clients` | `clients.php` | CRM contacts |
| `customer-accounts` | `customer_accounts.php` | B2B organizations |
| `projects` | `projects.php` | Construction jobs |
| `expenses` | `expenses.php` | Project costs |
| `payments` | `payments.php` | Client payments |
| `milestones` | `milestones.php` | Project milestones |
| `lenders` | `lenders.php` | Loan sources |
| `loans` | `loans.php` | Borrowed funds |
| `loan-repayments` | `loans.php` | Loan paybacks |
| `dashboard` | `dashboard.php` | Aggregated metrics |
| `leads` | `leads.php` | Lead CRM; `GET /leads/funnel`, `POST /leads/{id}/convert` |
| `entity-contacts` | `entity_contacts.php` | POCs on leads, projects, and clients |
| `project-types` | `project_types.php` | Service catalog |
| `entity-project-types` | `project_types.php` | Join table for lead/project ↔ types |
| `vendors`, `chemicals`, `vendor-pricing` | `procurement.php` | Procurement master data |
| `tasks` | `tasks.php` | Calendar tasks |
| `warranties` | `tasks.php` | Project warranties |
| `document-templates`, `documents` | `documents.php` | `.docx` templates + generation (PhpWord) |
| `audit-logs` | `audit_logs.php` | Owner-only change log |
| `admin` | `admin.php` | Platform administration |

Entry point: `api/index.php`. Local dev router: `api/router.php`.

---

## Database

**Canonical schema:** [`api/schema.sql`](../api/schema.sql)

**Incremental migrations:** `api/migrations/`

| Migration | Change |
|-----------|--------|
| `001_b2b_b2c.sql` | Customer accounts, B2B client fields |
| `002_expense_type.sql` | Expense type column |
| `003_payment_method_comments.sql` | Payment method and comments |
| `004_loans.sql` | Lenders, loans, repayments |
| `005_company_logo.sql` | `companies.logo_path` |
| `006_user_active_session.sql` | Single-IP session fields on `users` |
| `007_milestones.sql` | Milestones table; nullable `total_quoted_amount` |
| `008_company_favicon.sql` | `companies.favicon_path` |
| `009_business_expansion.sql` | Leads, project types, procurement, tasks, warranties, audit, documents |
| `010_entity_contacts_client.sql` | POC links on client records (`entity_type = client`) |
| `011_leads_project_title_expense_items.sql` | Lead project title + expense line items |
| `012_vendor_contacts.sql` | Vendor contacts table |
| `013_vendor_profile.sql` | Vendor profile fields |
| `014_business_updates.sql` | Advance-received status, custom task types, remove client POC |
| `015_client_multi_phone.sql` | Widen `clients.phone` for multiple numbers |
| `016_session_remember.sql` | `users.session_remember_until` (remember-this-device) |

| Table | Tenant-scoped | Purpose |
|-------|---------------|---------|
| `users` | — | Credentials + active session metadata |
| `password_resets` | — | One-hour reset tokens |
| `companies` | — | Workspace (name, logo, favicon, owner) |
| `profiles` | — | User ↔ company, role, `is_active` |
| `customer_accounts` | ✓ | B2B organizations |
| `clients` | ✓ | CRM contacts |
| `leads` | ✓ | Pre-project inquiries (optional `client_id` or inline contact) |
| `project_types` | ✓ | Service catalog (Retrofitting, Waterproofing, NDT) |
| `entity_project_types` | ✓ | Lead/project ↔ project type |
| `entity_contacts` | ✓ | POCs on leads/projects |
| `projects` | ✓ | Construction jobs (`lead_id` optional) |
| `milestones` | ✓ | Project timeline markers |
| `vendors`, `chemicals`, `vendor_pricing` | ✓ | Procurement pricing |
| `expenses` | ✓ | Project costs (optional vendor/chemical link) |
| `payments` | ✓ | Client payments received |
| `tasks` | ✓ | Calendar / follow-ups |
| `warranties` | ✓ | Project warranty records |
| `document_templates`, `generated_documents` | ✓ | `.docx` templates and outputs |
| `audit_logs` | ✓ | INSERT/UPDATE/DELETE audit trail |
| `lenders` | ✓ | Loan sources |
| `loans` | ✓ | Borrowed funds |
| `loan_repayments` | ✓ | Loan paybacks |

---

## Operations and backups

| Area | Location |
|------|----------|
| Backup scripts | `scripts/backup/` — daily DB dump + file archive |
| Backup docs | `docs/09-backups-and-restore.md` |
| Deployment | `docs/07-deployment.md` |
| Local setup | `docs/06-local-setup.md` |

Backups include `api/` (with `uploads/logos`, `uploads/favicons`, `.env`) and built SPA (`dist/` or `app/`).

---

## Known limitations

| Issue | Notes |
|-------|-------|
| Payments ≠ `amount_received` | Pending on project table can drift |
| "Profit" label | Means completed quoted revenue, not margin |
| No project delete | By design |
| No email invites | Self-signup + owner approval on Team page |
| Audit log | Owners only; expenses, payments, projects logged |
| Document generation | PhpWord `.docx`; requires `composer install` in `api/` |
| No invoicing / PDF export | `.docx` only via templates |
| File uploads | Logo, favicon, document templates |
| Logo/favicon crop | Known UX bugs: Save before crop coords ready, stale coords during drag |
| Legacy docs | `docs/01`–`04` partially outdated (Supabase era) |

---

## File map for agents

```
src/
  main.jsx              React entry (AuthProvider)
  App.jsx               Auth gates, sidebar, routes
  apiClient.js          fetch wrapper, view-company injection, 401 handler
  constants.js          Shared enums and label helpers
  api/                  One module per API resource (only place that calls /api)
  context/              AuthContext
  hooks/                usePagination, usePageTitle, useCompanyFavicon
  pages/                One component per route
  components/           Forms, tables, charts, branding, crop modal
  utils/                format, projectFinance, cropImage, companyLogo

api/
  index.php             Router
  config.php            Loads .env
  schema.sql            Full schema (from scratch)
  migrations/           Incremental ALTER scripts
  lib/                  session, db, http, uploads, mailer, loan_interest
  routes/               Per-resource HTTP handlers
  uploads/logos/        Company logos (gitkeep only; files on server)
  uploads/favicons/     Company favicons

docs/                   Human documentation pack
scripts/backup/         Production backup/restore shell scripts
```

---

## Suggested reading order

1. **This file** — module map and constraints
2. [`api/schema.sql`](../api/schema.sql) — data model
3. [`api/lib/session.php`](../api/lib/session.php) — auth, roles, tenancy
4. [`src/App.jsx`](../src/App.jsx) — routes and auth gates
5. [`docs/04-features-and-business-rules.md`](./04-features-and-business-rules.md) — page-level rules (verify against code; partially outdated)

---

## Environment variables

**Backend** (`api/.env`, copy from `api/.env.example`):

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | MariaDB connection |
| `APP_URL` | Base URL for password-reset links |
| `SMTP_*`, `MAIL_FROM` | Password-reset email |

**Frontend** (root `.env`, optional):

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE` | API path (default `/api`) |
| `VITE_DEV_API_TARGET` | Vite dev proxy target (default `http://localhost:8000`) |
