# Skyline Constructions — App

Construction project management web app: track projects, expenses, payments, and financial dashboards.

**Stack:** React 19 · Vite 8 · Supabase · Recharts

---

## Quick start

```bash
npm install
# Configure .env (see docs/06-local-setup.md)
npm run dev
```

Open `http://localhost:5173`

---

## Documentation (replication seed)

Full project documentation for rebuilding from scratch:

**[docs/README.md](./docs/README.md)**

| Doc | Contents |
|-----|----------|
| [01-product-overview](./docs/01-product-overview.md) | Product vision, users, scope |
| [02-architecture](./docs/02-architecture.md) | System design, routing, file map |
| [03-database-schema](./docs/03-database-schema.md) | Tables, RLS, relationships |
| [schema.sql](./docs/schema.sql) | Executable SQL migration |
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

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

See [docs/06-local-setup.md](./docs/06-local-setup.md) for full setup instructions.
