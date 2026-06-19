# Local Setup

Step-by-step guide to run Skyline-App (React SPA + PHP API + MariaDB) on a developer machine.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20.19+ or 22.12+ | Required by Vite 8. Node 24 also works. |
| **npm** | Comes with Node | Project uses `package-lock.json` |
| **PHP** | 8.1+ | With `pdo_mysql`, `openssl`, `json` extensions |
| **MariaDB** | 10.4+ (or MySQL 8) | Local server or container |
| **Modern browser** | Chrome, Edge, Firefox | For testing |

Optional:

- **Git** — version control
- An SMTP account — only needed to actually deliver password-reset emails

---

## Step 1: Get the code

```bash
git clone <repository-url>
cd Skyline-App
```

---

## Step 2: Install frontend dependencies

```bash
npm install
```

---

## Step 3: Create the database

Create a database and load the schema:

```bash
mysql -u root -p -e "CREATE DATABASE skyline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p skyline < api/schema.sql
```

This creates `users`, `password_resets`, `companies`, `profiles`, `clients`, `projects`, `expenses`, `payments`.

---

## Step 4: Configure the backend

```bash
cp api/.env.example api/.env
```

Edit `api/.env`:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — your MariaDB connection
- `APP_URL` — `http://localhost:5173` for local dev (used in reset-email links)
- `SMTP_*` — leave `SMTP_HOST` empty to fall back to PHP `mail()` (reset emails won't actually send locally without SMTP)

---

## Step 5: Start the PHP API

The built-in PHP server does not read `.htaccess`, so use the bundled router:

```bash
php -S localhost:8000 api/router.php
```

Quick check: `curl http://localhost:8000/api/` should return `{"name":"skyline-api","status":"ok"}`.

---

## Step 6: Start the dev server

```bash
npm run dev
```

```
VITE v8.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

The Vite dev server proxies `/api` to `VITE_DEV_API_TARGET` (default `http://localhost:8000`). Override it in the root `.env` if your PHP server runs elsewhere.

Open `http://localhost:5173`.

---

## Step 7: Create the first account

1. Sign up with email + password — this logs you in automatically.
2. Create your company on the onboarding screen (you become its `owner`).
3. (Optional) Promote yourself to super admin:

```sql
UPDATE profiles SET role = 'super_admin', is_active = 1
WHERE id = (SELECT id FROM users WHERE email = 'you@example.com');
```

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR (frontend) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

---

## Verify the setup

1. **Dashboard** (`/`) — loads without console errors; metric cards show `0` on an empty DB
2. **Projects** — create a test project; it appears in the table
3. **Expenses** / **Payments** — log entries against the test project
4. **Forgot password** — submit your email; with SMTP configured, a reset link arrives at `/app/reset?token=...`

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `Not authenticated` (401) on every call | PHP server not running, or session cookie blocked (check same-origin / proxy) |
| `Server error` (500) | DB credentials wrong in `api/.env`, or schema not loaded |
| `404` for `/api/...` | PHP started without `api/router.php` (built-in server ignores `.htaccess`) |
| Reset email never arrives | `SMTP_*` not configured; `mail()` fallback often unavailable locally |
| Blank page / white screen | Check DevTools console for a JS import error |
| `npm install` fails on Node version | Upgrade Node to 20.19+ / 22.12+ (`node -v`) |

---

## Next steps

- Understand the app: [01-product-overview.md](./01-product-overview.md)
- Deploy to production: [07-deployment.md](./07-deployment.md)
