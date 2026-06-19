# Skyline Constructions — App

Construction project management web app: track projects, expenses, payments, and financial dashboards.

**Stack:** React 19 · Vite 8 · PHP (PDO) API · MariaDB · Recharts

> Note: docs `03-database-schema` and `docs/schema.sql` describe the original Supabase/Postgres design and are kept for reference. The live schema is [api/schema.sql](./api/schema.sql); tenant isolation is enforced in the PHP API, not via DB-level RLS.

Architecture: a React SPA (served under `/app/`) talks over `fetch` to a PHP API (`/api/`) that uses PDO against MariaDB. Auth is PHP session cookies; multi-tenant isolation is enforced in the API layer. Password resets are emailed via SMTP.

---

## Quick start

```bash
# 1. Database
mysql -u root -p < api/schema.sql

# 2. Backend config
cp api/.env.example api/.env   # then edit DB + SMTP values

# 3. Serve the PHP API (PHP 8+). For local dev use the bundled router:
php -S localhost:8000 api/router.php

# 4. Frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `VITE_DEV_API_TARGET` (default `http://localhost:8000`).

---

## Documentation (replication seed)

Full project documentation for rebuilding from scratch:

**[docs/README.md](./docs/README.md)**

| Doc | Contents |
|-----|----------|
| [01-product-overview](./docs/01-product-overview.md) | Product vision, users, scope |
| [02-architecture](./docs/02-architecture.md) | System design, routing, file map |
| [03-database-schema](./docs/03-database-schema.md) | Tables, relationships (legacy RLS notes) |
| [api/schema.sql](./api/schema.sql) | Executable MariaDB schema (canonical) |
| [docs/schema.sql](./docs/schema.sql) | Legacy Postgres/Supabase schema (reference) |
| [04-features-and-business-rules](./docs/04-features-and-business-rules.md) | Page specs, calculations |
| [05-ui-design-system](./docs/05-ui-design-system.md) | Colors, layout, components |
| [06-local-setup](./docs/06-local-setup.md) | Developer environment |
| [07-deployment](./docs/07-deployment.md) | Production build and hosting |
| [08-replication-checklist](./docs/08-replication-checklist.md) | Step-by-step rebuild guide |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Environment

Backend config lives in `api/.env` (copy from `api/.env.example`): MariaDB credentials, `APP_URL`, and SMTP settings for password-reset emails.

Frontend `.env` (root, optional): `VITE_API_BASE` (default `/api`) and `VITE_DEV_API_TARGET` (dev proxy target).

See [docs/06-local-setup.md](./docs/06-local-setup.md) for full setup instructions.

## Auth & multi-tenancy

- Auth: email + password, PHP session cookies (`password_hash`/`password_verify`).
- Password reset: `Forgot password?` emails a one-hour reset link to `/reset?token=...`.
- **Optional company**: on first login, users can join a company, create one, or skip. Skipped users use the app with empty data until they join via `/setup`.
- **Approval**: joining an existing company sets `is_active = 0` until an owner or super admin grants access on the Team page.
- Multi-tenancy: every API query is scoped by the logged-in user's `company_id`; super admins see all (or one company via the sidebar switcher).

### Create a super admin

1. Sign up in the app (email + password).
2. In phpMyAdmin, run (replace the email):

```sql
UPDATE profiles SET role = 'super_admin', is_active = 1, company_id = NULL
WHERE id = (SELECT id FROM users WHERE email = 'you@example.com');
```

If no profile exists yet:

```sql
INSERT INTO profiles (id, company_id, role, is_active, email)
SELECT id, NULL, 'super_admin', 1, email FROM users WHERE email = 'you@example.com';
```

3. Sign in again. You will see **Admin** in the sidebar to delete companies/users and a **View company data** dropdown to inspect each tenant.
