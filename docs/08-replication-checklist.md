# Replication Checklist

Ordered steps to rebuild Skyline-App from zero. Follow in sequence; each phase builds on the previous.

---

## Phase 1: Scaffold

- [ ] Create Vite + React project: `npm create vite@latest skyline-app -- --template react`
- [ ] Set `"type": "module"` in `package.json`
- [ ] Install runtime dependencies:
  ```bash
  npm install react-router-dom @supabase/supabase-js recharts lucide-react
  ```
- [ ] Install dev dependencies (match versions in root `package.json`):
  ```bash
  npm install -D vite @vitejs/plugin-react @rolldown/plugin-babel babel-plugin-react-compiler eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals
  ```
- [ ] Configure `vite.config.js` with React Compiler (see [02-architecture.md](./02-architecture.md))
- [ ] Set up `eslint.config.js`
- [ ] Update `index.html`: title "Skyline Constructions", Google Fonts links

---

## Phase 2: Database

- [ ] Create Supabase project (cloud or local)
- [ ] Run [`schema.sql`](./schema.sql) in SQL Editor
- [ ] Verify tables: `projects`, `expenses`, `payments`
- [ ] Verify RLS policies allow anon access (for v1 parity)
- [ ] *(Optional v2)* Uncomment payment sync trigger in `schema.sql`

---

## Phase 3: Environment and client

- [ ] Create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Add `.env` to `.gitignore`
- [ ] Create `src/supabaseClient.js`:
  ```js
  import { createClient } from '@supabase/supabase-js';
  export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  ```

---

## Phase 4: Design system

- [ ] Create `src/index.css` with CSS custom properties (see [05-ui-design-system.md](./05-ui-design-system.md))
- [ ] Create `src/App.css` with app shell, page layouts, forms, buttons, metrics, responsive rules
- [ ] Import `index.css` in `main.jsx`
- [ ] Import `App.css` in `App.jsx`

---

## Phase 5: App shell and routing

- [ ] Create `src/App.jsx`:
  - `BrowserRouter` (add `basename="/app"` if deploying to subpath)
  - Sidebar with brand (Building2 icon + "Skyline Constructions")
  - `NavLink` items: Dashboard, Projects, Expenses, Payments
  - Lucide icons per nav item
  - `<Routes>` with 5 route definitions
- [ ] Create `src/main.jsx` — mount App in StrictMode
- [ ] Verify all routes render placeholder content

**Routes to implement:**

| Path | Component |
|------|-----------|
| `/` | Dashboard |
| `/projects` | ProjectPage |
| `/projects/:id` | ProjectDetailsPage |
| `/expenses` | ExpensePage |
| `/payments` | Payments |

---

## Phase 6: Projects feature

- [ ] `src/components/AddProjectForm.jsx` + `AddProjectForm.css`
  - All project fields, status dropdown, submit handler
  - Business rule: `work ended` → completion_percent = 100
- [ ] `src/components/ProjectTable.jsx` + `ProjectTable.css`
  - Fetch and display projects
  - Status badges, pending calculation, detail links, Edit button
- [ ] `src/components/UpdateProjectForm.jsx` + `UpdateProjectForm.css`
  - Modal overlay, conditional fields by status
  - end_date clearing logic
- [ ] `src/pages/ProjectPage.jsx`
  - Wire form, table, modal with refresh pattern

---

## Phase 7: Payments feature

- [ ] `src/components/AddPaymentForm.jsx`
  - Standalone form + `defaultProjectId` prop for modal use
- [ ] `src/components/PaymentsTable.jsx`
  - Join query with project title
- [ ] `src/pages/Payments.jsx`
  - Two-column layout, refresh pattern

---

## Phase 8: Expenses feature

- [ ] `src/components/AddExpenseForm.jsx`
  - Project dropdown, amount, description, date
- [ ] `src/components/ExpenseTable.jsx`
  - Join query with project status
- [ ] `src/pages/ExpensePage.jsx`
  - Two-column layout, refresh pattern

---

## Phase 9: Project details

- [ ] `src/pages/ProjectDetailsPage.jsx`
  - Fetch project by ID + linked expenses
  - Detail cards (project info, financials)
  - Expense table
  - Back link with ArrowLeft icon
  - *(Optional v2)* 404 state for missing project

---

## Phase 10: Dashboard

- [ ] `src/pages/Dashboard.jsx`
  - Parallel Supabase fetches (counts + full data)
  - 4 metric cards with Lucide icons
  - 2 Recharts bar charts (month + year cash flow)
  - Implement calculations per [04-features-and-business-rules.md](./04-features-and-business-rules.md)

---

## Phase 11: Polish and verify

- [ ] Remove placeholder / unused Vite template assets
- [ ] Test all CRUD flows end-to-end
- [ ] Test responsive layout at 768px and 1100px
- [ ] Run `npm run lint`
- [ ] Run `npm run build` — fix any build errors
- [ ] Document known gaps or apply v2 fixes (see below)

---

## Phase 12: Deploy

- [ ] Configure Vite `base: '/app/'` if using subpath
- [ ] Configure router `basename="/app"`
- [ ] Set production env vars in CI/host
- [ ] Build and deploy `dist/`
- [ ] Configure SPA fallback on web server
- [ ] Smoke test production URL

See [07-deployment.md](./07-deployment.md).

---

## Target file tree

After replication, `src/` should contain these 18 files:

```
src/
├── main.jsx
├── App.jsx
├── App.css
├── index.css
├── supabaseClient.js
├── pages/
│   ├── Dashboard.jsx
│   ├── ProjectPage.jsx
│   ├── ProjectDetailsPage.jsx
│   ├── ExpensePage.jsx
│   └── Payments.jsx
└── components/
    ├── AddProjectForm.jsx
    ├── AddProjectForm.css
    ├── ProjectTable.jsx
    ├── ProjectTable.css
    ├── UpdateProjectForm.jsx
    ├── UpdateProjectForm.css
    ├── AddExpenseForm.jsx
    ├── ExpenseTable.jsx
    ├── AddPaymentForm.jsx
    └── PaymentsTable.jsx
```

Plus root files:

```
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── .env                    (local only, gitignored)
├── .gitignore
└── docs/                   (this documentation pack)
    ├── README.md
    ├── 01-product-overview.md
    ├── 02-architecture.md
    ├── 03-database-schema.md
    ├── 04-features-and-business-rules.md
    ├── 05-ui-design-system.md
    ├── 06-local-setup.md
    ├── 07-deployment.md
    ├── 08-replication-checklist.md
    └── schema.sql
```

---

## Optional v2 improvements

Apply after achieving v1 parity, or integrate during replication:

| Improvement | Effort | Doc reference |
|-------------|--------|---------------|
| Payment → `amount_received` sync trigger | Low | [03-database-schema.md](./03-database-schema.md) |
| Remove `Completed` status | Low | [04-features-and-business-rules.md](./04-features-and-business-rules.md) |
| Rename "Profit" to "Completed Revenue" | Low | [04-features-and-business-rules.md](./04-features-and-business-rules.md) |
| Add Supabase Auth + scoped RLS | Medium | [03-database-schema.md](./03-database-schema.md) |
| Error states on all forms and detail page | Medium | [04-features-and-business-rules.md](./04-features-and-business-rules.md) |
| Edit/delete expenses and payments | Medium | — |
| TypeScript migration | High | — |
| Unit tests for business logic | Medium | — |
| Fix subpath deploy config | Low | [07-deployment.md](./07-deployment.md) |

---

## Verification matrix

After replication, confirm each scenario:

| # | Scenario | Expected result |
|---|----------|-----------------|
| 1 | Open `/` | Dashboard with 4 metrics and 2 charts |
| 2 | Create project | Appears in project table |
| 3 | Edit project status | Modal saves; table updates |
| 4 | Click project title | Detail page loads |
| 5 | Log expense | Appears in expense table and dashboard chart |
| 6 | Record payment | Appears in payment table and dashboard chart |
| 7 | Record payment in edit modal | Payment saved; modal stays functional |
| 8 | Set status to `work ended` | Completion forced to 100% on create |
| 9 | Refresh any route directly | Page loads (requires SPA fallback in prod) |
| 10 | Mobile viewport 768px | Sidebar collapses to horizontal nav |

---

## Documentation cross-reference

| Need | Read |
|------|------|
| Why we're building this | [01-product-overview.md](./01-product-overview.md) |
| How code is organized | [02-architecture.md](./02-architecture.md) |
| Database tables and SQL | [03-database-schema.md](./03-database-schema.md) + [schema.sql](./schema.sql) |
| Business rules and calculations | [04-features-and-business-rules.md](./04-features-and-business-rules.md) |
| Colors, layout, CSS classes | [05-ui-design-system.md](./05-ui-design-system.md) |
| Run locally | [06-local-setup.md](./06-local-setup.md) |
| Ship to production | [07-deployment.md](./07-deployment.md) |
