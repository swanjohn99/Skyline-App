-- Skyline-App database schema
-- Run in Supabase SQL Editor (or psql) to replicate the database from scratch.

-- ── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_title       text NOT NULL,
  client_name         text,
  location            text,
  work_description    text,
  total_quoted_amount numeric(12, 2) DEFAULT 0,
  amount_received     numeric(12, 2) DEFAULT 0,
  status              text NOT NULL DEFAULT 'site visit requested',
  completion_percent  integer DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  start_date          date,
  end_date            date,
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount       numeric(12, 2) NOT NULL,
  description  text,
  expense_date date NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount       numeric(12, 2) NOT NULL,
  payment_date date NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date DESC);

-- ── Row Level Security ────────────────────────────────────────────────────
-- WARNING: Permissive anon policies — suitable for trusted internal use only.
-- Replace with auth-based policies before public deployment.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_projects" ON projects;
CREATE POLICY "anon_all_projects" ON projects
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_expenses" ON expenses;
CREATE POLICY "anon_all_expenses" ON expenses
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_payments" ON payments;
CREATE POLICY "anon_all_payments" ON payments
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Optional: sync amount_received when payment is inserted ─────────────────
-- Uncomment for replication v2 (not required to match current app behavior).

-- CREATE OR REPLACE FUNCTION sync_amount_received_on_payment()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   UPDATE projects
--   SET amount_received = COALESCE(amount_received, 0) + NEW.amount
--   WHERE id = NEW.project_id;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS trg_sync_amount_received ON payments;
-- CREATE TRIGGER trg_sync_amount_received
--   AFTER INSERT ON payments
--   FOR EACH ROW
--   EXECUTE FUNCTION sync_amount_received_on_payment();

-- ── Sample data (optional, for local testing) ─────────────────────────────

-- INSERT INTO projects (project_title, client_name, location, total_quoted_amount, status)
-- VALUES ('Kitchen Renovation', 'Jane Smith', '123 Main St', 45000, 'work started');
