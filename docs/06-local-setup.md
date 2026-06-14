# Local Setup

Step-by-step guide to run Skyline-App on a developer machine.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20.19+ or 22.12+ | Required by Vite 8. Node 24 also works. |
| **npm** | Comes with Node | Project uses `package-lock.json` |
| **Supabase project** | Cloud or local | Postgres database + API keys |
| **Modern browser** | Chrome, Edge, Firefox | For testing |

Optional:

- **Git** — version control
- **Supabase CLI + Docker** — only if running Supabase locally instead of cloud

---

## Step 1: Get the code

```bash
git clone <repository-url>
cd Skyline-App
```

Or scaffold from scratch using [08-replication-checklist.md](./08-replication-checklist.md).

---

## Step 2: Install dependencies

```bash
npm install
```

This installs all runtime and dev dependencies listed in `package.json`.

---

## Step 3: Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to provision
3. Open **Project Settings → API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** (or publishable key) → `VITE_SUPABASE_ANON_KEY`

---

## Step 4: Run database schema

1. Open Supabase **SQL Editor**
2. Paste and run the contents of [`docs/schema.sql`](./schema.sql)
3. Verify tables exist: `projects`, `expenses`, `payments`

---

## Step 5: Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_OR_PUBLISHABLE_KEY"
```

**Important:**

- Variable names must start with `VITE_` for Vite to expose them to the browser
- Restart the dev server after changing `.env`
- **Add `.env` to `.gitignore`** before committing — it is not gitignored in the current repo

Example `.gitignore` addition:

```
.env
.env.local
.env.*.local
```

---

## Step 6: Start the dev server

```bash
npm run dev
```

Expected output:

```
VITE v8.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser.

If port 5173 is in use, Vite will pick the next available port — check terminal output.

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot module replacement |
| `npm run build` | Create production build in `dist/` |
| `npm run preview` | Serve the production build locally for testing |
| `npm run lint` | Run ESLint across the project |

---

## Verify the setup

1. **Dashboard** (`/`) — loads without console errors; metric cards show `0` if database is empty
2. **Projects** (`/projects`) — create a test project; it appears in the table
3. **Expenses** (`/expenses`) — log an expense against the test project
4. **Payments** (`/payments`) — record a payment against the test project

If data operations fail, check:

- Browser DevTools → Network tab for failed requests to `*.supabase.co`
- Supabase dashboard → Table Editor for inserted rows
- RLS policies are applied (see [03-database-schema.md](./03-database-schema.md))

---

## Troubleshooting

### "Connection failed" on localhost

The Vite dev server is not running. Run `npm run dev` and keep the terminal open.

### Blank page / white screen

Open browser DevTools → Console. Common causes:

- Missing or invalid `.env` variables
- JavaScript import error

### Supabase errors in console

| Error | Likely cause |
|-------|--------------|
| `Invalid API key` | Wrong `VITE_SUPABASE_ANON_KEY` |
| `relation "projects" does not exist` | Schema not applied |
| `new row violates row-level security policy` | RLS enabled without anon policies |
| CORS error | Wrong Supabase URL |

### `npm install` fails on Node version

Upgrade Node to 20.19+ or 22.12+. Check with `node -v`.

### Dev server starts but changes don't appear

Hard refresh the browser (Ctrl+Shift+R). Ensure you're editing files in `src/`, not `dist/`.

---

## Optional: Supabase local development

For fully offline development:

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Install Docker Desktop
3. Run `supabase init` and `supabase start` in the project
4. Use local URL and anon key from CLI output in `.env`
5. Apply `schema.sql` against the local database

This is not configured in the repo today; cloud Supabase is the default path.

---

## What you do NOT need locally

- Python, Java, .NET, Go, Rust
- PostgreSQL installed directly (Supabase hosts it)
- Docker (unless using Supabase CLI locally)
- A separate backend server

---

## Next steps

- Understand the app: [01-product-overview.md](./01-product-overview.md)
- Deploy to production: [07-deployment.md](./07-deployment.md)
- Rebuild from scratch: [08-replication-checklist.md](./08-replication-checklist.md)
