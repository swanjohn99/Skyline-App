# Skyline-App Documentation

**Skyline-App** is a construction project management web application for **Skyline Constructions**. It tracks projects through a status pipeline, logs expenses and client payments, and displays financial summaries on a dashboard. The frontend is a React single-page app; all data is stored in Supabase (PostgreSQL).

This documentation pack is a **replication seed** — enough detail to rebuild the application from scratch without reading the source code.

---

## Quick start

**Prerequisites:** Node.js 20.19+ or 22.12+, npm, a Supabase project.

```bash
npm install
# Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# Run docs/schema.sql in Supabase SQL editor
npm run dev
```

Open `http://localhost:5173`.

Full setup: [06-local-setup.md](./06-local-setup.md)

---

## Tech stack at a glance

| Layer | Technology |
|-------|------------|
| UI | React 19, JSX, plain CSS |
| Build | Vite 8, React Compiler |
| Routing | React Router 7 |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Supabase (Postgres + PostgREST) |
| Auth | None (current version) |

---

## Documentation index

| Doc | Description |
|-----|-------------|
| [01-product-overview.md](./01-product-overview.md) | Product vision, users, core entities, scope |
| [02-architecture.md](./02-architecture.md) | System design, routing, data flow, file map |
| [03-database-schema.md](./03-database-schema.md) | Tables, relationships, RLS, triggers |
| [schema.sql](./schema.sql) | Executable SQL migration |
| [04-features-and-business-rules.md](./04-features-and-business-rules.md) | Per-page specs, calculations, status workflow |
| [05-ui-design-system.md](./05-ui-design-system.md) | Colors, typography, layout, components |
| [06-local-setup.md](./06-local-setup.md) | Developer environment and run commands |
| [07-deployment.md](./07-deployment.md) | Production build and hosting |
| [08-replication-checklist.md](./08-replication-checklist.md) | Step-by-step rebuild order |

---

## Intended production URL

`https://skylineconstructions.in/app/`

See [07-deployment.md](./07-deployment.md) for subpath configuration requirements.

---

## Known gaps (current version)

| Gap | Doc reference |
|-----|---------------|
| No authentication | [01-product-overview.md](./01-product-overview.md), [03-database-schema.md](./03-database-schema.md) |
| Payments do not sync `amount_received` | [04-features-and-business-rules.md](./04-features-and-business-rules.md) |
| `Completed` vs `work ended` status inconsistency | [04-features-and-business-rules.md](./04-features-and-business-rules.md) |
| Subpath deploy config incomplete | [07-deployment.md](./07-deployment.md) |
| `.env` not in `.gitignore` | [06-local-setup.md](./06-local-setup.md) |

Replicators should decide whether to copy these behaviors or fix them during rebuild.
