# Architecture

## System pattern

Skyline-App follows a **static SPA + BaaS** architecture:

```mermaid
flowchart LR
  Browser["React SPA (browser)"]
  Vite["Vite (dev / build)"]
  Supa["Supabase PostgREST API"]
  PG[("PostgreSQL")]

  Vite --> Browser
  Browser -->|"@supabase/supabase-js"| Supa
  Supa --> PG
```

- **No custom API server** — all database access is client-side via the Supabase JavaScript client, wrapped in a typed `src/api/` data-access layer
- **No server-side rendering** — pure client-side React
- **Multi-tenant** — every row is scoped to a `company_id`; Postgres Row Level Security (RLS) enforces isolation. Roles: `super_admin`, `owner`, `member`
- **Global auth state** — `AuthProvider` (React context) holds the session + profile/role; everything else stays local component state + parent `refresh` counters

---

## Repository layout

```
Skyline-App/
├── index.html              # HTML shell, Google Fonts
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite + React Compiler config
├── eslint.config.js        # ESLint flat config
├── .env                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── docs/                   # This documentation pack
└── src/
    ├── main.jsx            # React entry point (wraps App in AuthProvider)
    ├── App.jsx             # Shell: auth/onboarding gate, sidebar + routes
    ├── App.css             # Layout, pages, forms, metrics
    ├── index.css           # Design tokens, global reset
    ├── constants.js        # Roles, project statuses, badge/chart helpers
    ├── supabaseClient.js   # Supabase client singleton
    ├── api/                # Data-access layer (auth, profiles, clients, projects, expenses, payments, dashboard)
    ├── context/            # AuthProvider + useAuth hook
    ├── utils/              # format.js (currency + date helpers)
    ├── pages/              # Route-level views
    └── components/         # Reusable UI
```

---

## Source file map

### Entry and core

| File | Responsibility |
|------|----------------|
| `src/main.jsx` | Mount `<App />` in `#root` under `StrictMode`, wrapped in `<AuthProvider>`; import `index.css` |
| `src/App.jsx` | Auth + onboarding gate, `BrowserRouter`, role-aware sidebar, route definitions |
| `src/App.css` | App shell, page layouts, shared form/button/card classes |
| `src/index.css` | CSS custom properties (design tokens), typography reset |
| `src/constants.js` | `ROLES`, `PROJECT_STATUSES`, status badge/helpers, chart colors, month labels |
| `src/supabaseClient.js` | `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` |
| `src/context/AuthContext.jsx` + `auth.js` | `AuthProvider` (session + profile + role); `useAuth()` hook |
| `src/api/*.js` | Data-access layer — the only place that calls `supabase.from(...)` |
| `src/utils/format.js` | `formatCurrency`, `formatCompactCurrency`, `formatDate`, date input helpers |
| `index.html` | Page title, favicon, Google Fonts CDN links |

### Pages (`src/pages/`)

| File | Route | Purpose |
|------|-------|---------|
| `Dashboard.jsx` | `/` | Metric cards + 12-month Income vs Expenses bar chart |
| `ProjectPage.jsx` | `/projects` | Add form, project table, edit modal |
| `ProjectDetailsPage.jsx` | `/projects/:id` | Single project detail + expenses |
| `ClientsPage.jsx` | `/clients` | CRM: client CRUD, search, tags |
| `ExpensePage.jsx` | `/expenses` | Add expense form + expense table |
| `Payments.jsx` | `/payments` | Add payment form + payment table |
| `TeamPage.jsx` | `/team` | Member management (owner/super_admin only) |
| `LoginPage.jsx` | — | Sign in / sign up (shown when logged out) |
| `OnboardingPage.jsx` | — | Create company (shown when logged in without a profile) |

### Components (`src/components/`)

| File | Used by | Purpose |
|------|---------|---------|
| `AddProjectForm.jsx` | ProjectPage | Insert new project |
| `ProjectTable.jsx` | ProjectPage | List all projects |
| `UpdateProjectForm.jsx` | ProjectPage | Modal: update project + inline payment |
| `AddExpenseForm.jsx` | ExpensePage | Insert expense |
| `ExpenseTable.jsx` | ExpensePage | List expenses with project status join |
| `AddPaymentForm.jsx` | Payments, UpdateProjectForm | Insert payment |
| `PaymentsTable.jsx` | Payments | List payments with project title join |

### Stylesheets

| File | Scope |
|------|-------|
| `AddProjectForm.css` | Add-project form grid |
| `ProjectTable.css` | Data tables, status badges, edit button (shared by expense/payment tables) |
| `UpdateProjectForm.css` | Modal overlay and update form |

---

## Routing

React Router v7 with `BrowserRouter`. **No `basename` configured today** (see deployment doc for `/app/` subpath).

| Path | Component | Nav link |
|------|-----------|----------|
| `/` | `Dashboard` | Dashboard |
| `/projects` | `ProjectPage` | Projects |
| `/projects/:id` | `ProjectDetailsPage` | — (linked from table) |
| `/clients` | `ClientsPage` | Clients |
| `/expenses` | `ExpensePage` | Expenses |
| `/payments` | `Payments` | Payments |
| `/team` | `TeamPage` | Team (owner / super_admin only) |

Navigation uses `NavLink` with active class styling. Layout is persistent: left sidebar + scrollable main content. Before routes render, `App` gates on auth state: logged out -> `LoginPage`; logged in without a profile -> `OnboardingPage`.

---

## Data flow

```mermaid
sequenceDiagram
  participant Page as Page component
  participant Child as Table or Form
  participant API as src/api module
  participant SB as supabaseClient
  participant DB as PostgreSQL (RLS)

  Page->>Child: refreshKey prop
  Child->>API: listProjects() / createExpense(...)
  API->>SB: .from(table).select/insert(...)
  SB->>DB: PostgREST HTTP (JWT)
  DB-->>SB: rows scoped by RLS
  SB-->>API: data / throws on error
  API-->>Child: data
  Child-->>Page: onProjectAdded / onUpdate callback
  Page->>Page: setRefresh(n + 1)
```

Components never call `supabase.from(...)` directly — they import functions from `src/api/`. The logged-in JWT is attached automatically, so the database runs queries as the `authenticated` role and RLS filters rows to the caller's company.

**Refresh pattern:** Parent pages hold `const [refresh, setRefresh] = useState(0)`. After a successful create or update, they call `setRefresh(prev => prev + 1)`. Child tables pass `refreshKey={refresh}` into `useEffect` dependencies to re-fetch.

**No caching layer** — every navigation or refresh triggers fresh Supabase queries.

---

## Supabase usage summary

| Table | SELECT | INSERT | UPDATE | DELETE | api module |
|-------|--------|--------|--------|--------|------------|
| `companies` | onboarding/profile | OnboardingPage (RPC) | owner | owner | `profiles.js` |
| `profiles` | AuthContext, TeamPage | sign-up / onboarding | TeamPage | — | `profiles.js` |
| `clients` | ClientsPage, AddProjectForm | AddClientForm | AddClientForm | ClientsPage | `clients.js` |
| `projects` | All pages | AddProjectForm | UpdateProjectForm | — | `projects.js` |
| `expenses` | Dashboard, ExpenseTable, ProjectDetails | AddExpenseForm | — | — | `expenses.js` |
| `payments` | Dashboard, PaymentsTable | AddPaymentForm | — | — | `payments.js` |

All access is scoped by RLS to the caller's `company_id` (super_admin sees all). `company_id` is auto-stamped on INSERT by a database trigger, so the client never sends it. Full schema and policies: [03-database-schema.md](./03-database-schema.md) and `docs/schema.sql`.

---

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `react` / `react-dom` | ^19.2.6 | UI framework |
| `react-router-dom` | ^7.17.0 | Client-side routing |
| `@supabase/supabase-js` | ^2.108.1 | Database client |
| `recharts` | ^3.8.1 | Dashboard bar charts |
| `lucide-react` | ^1.18.0 | SVG icons |

### Development

| Package | Purpose |
|---------|---------|
| `vite` ^8.0.12 | Dev server and production bundler |
| `@vitejs/plugin-react` | React/JSX support |
| `@rolldown/plugin-babel` + `babel-plugin-react-compiler` | React Compiler |
| `eslint` + plugins | Linting |

---

## Build configuration

`vite.config.js`:

```js
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
```

**Note:** React Compiler is enabled. This may affect dev/build performance.

**Scripts:**

| Command | Action |
|---------|--------|
| `npm run dev` | Start Vite dev server (default port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | Run ESLint |

---

## Environment variables

| Variable | Required | Used in |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | `supabaseClient.js` |
| `VITE_SUPABASE_ANON_KEY` | Yes | `supabaseClient.js` |

Vite exposes only variables prefixed with `VITE_`. They are inlined at build time.

---

## What is intentionally absent

- TypeScript
- Unit or integration tests
- CI/CD configuration
- Supabase migration files in repo (schema documented in `docs/schema.sql`)
- Email invitations (members self-sign-up, then an owner grants access)
- Error boundary components
- Service workers / PWA
