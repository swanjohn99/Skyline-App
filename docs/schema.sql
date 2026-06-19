-- DEPRECATED / LEGACY (PostgreSQL + Supabase).
-- The app now runs on MariaDB with a PHP API. Use api/schema.sql instead.
-- This file is kept only as a reference for the original Postgres + RLS design.
--
-- Skyline-App database schema (greenfield, multi-tenant)
-- Run in Supabase SQL Editor to build the database from scratch.
-- WARNING: this script DROPS all existing app tables and their data.

-- ── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Clean slate ─────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients  CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ── Tables ──────────────────────────────────────────────────────────────────

-- A company is a tenant. Every business row is scoped to one company.
CREATE TABLE companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- One profile per auth user. role + is_active drive access.
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'owner', 'member')),
  is_active  boolean NOT NULL DEFAULT true,
  full_name  text,
  email      text,
  created_at timestamptz DEFAULT now()
);

-- CRM: clients/contacts for marketing.
CREATE TABLE clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text,
  phone      text,
  address    text,
  location   text,
  source     text,
  tags       text[] DEFAULT '{}',
  notes      text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE projects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id           uuid REFERENCES clients(id) ON DELETE SET NULL,
  project_title       text NOT NULL,
  client_name         text,
  location            text,
  work_description    text,
  total_quoted_amount numeric(12, 2) DEFAULT 0,
  amount_received     numeric(12, 2) DEFAULT 0,
  status              text NOT NULL DEFAULT 'site visit requested'
                        CHECK (status IN (
                          'site visit requested',
                          'site visit done',
                          'quotation sent',
                          'work started',
                          'work completed',
                          'completed',
                          'rejected'
                        )),
  completion_percent  integer DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  start_date          date,
  end_date            date,
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount       numeric(12, 2) NOT NULL,
  description  text,
  expense_date date NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount       numeric(12, 2) NOT NULL,
  payment_date date NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX idx_profiles_company_id     ON profiles(company_id);
CREATE INDEX idx_clients_company_id      ON clients(company_id);
CREATE INDEX idx_projects_company_id     ON projects(company_id);
CREATE INDEX idx_projects_client_id      ON projects(client_id);
CREATE INDEX idx_projects_status         ON projects(status);
CREATE INDEX idx_projects_start_date     ON projects(start_date DESC);
CREATE INDEX idx_expenses_company_id     ON expenses(company_id);
CREATE INDEX idx_expenses_project_id     ON expenses(project_id);
CREATE INDEX idx_expenses_expense_date   ON expenses(expense_date DESC);
CREATE INDEX idx_payments_company_id     ON payments(company_id);
CREATE INDEX idx_payments_project_id     ON payments(project_id);
CREATE INDEX idx_payments_payment_date   ON payments(payment_date DESC);

-- ── Access helper functions ─────────────────────────────────────────────────
-- SECURITY DEFINER so they can read profiles without tripping RLS recursion.

CREATE OR REPLACE FUNCTION current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION is_company_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner');
$$;

CREATE OR REPLACE FUNCTION is_active_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active = true AND company_id IS NOT NULL
  );
$$;

-- Reusable predicate: row belongs to caller's company (active) or caller is super admin.
-- Inlined into policies below.

-- ── Onboarding RPC ───────────────────────────────────────────────────────────
-- Creates a company and makes the caller its owner, atomically. Avoids the
-- RLS chicken-and-egg of inserting a company before a profile exists.

CREATE OR REPLACE FUNCTION create_company_and_join(p_name text, p_full_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_company_id uuid;
  existing_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT company_id INTO existing_company FROM profiles WHERE id = auth.uid();
  IF existing_company IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  INSERT INTO companies (name, owner_id)
  VALUES (p_name, auth.uid())
  RETURNING id INTO new_company_id;

  INSERT INTO profiles (id, company_id, role, is_active, full_name, email)
  VALUES (
    auth.uid(),
    new_company_id,
    'owner',
    true,
    p_full_name,
    (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  ON CONFLICT (id) DO UPDATE
    SET company_id = excluded.company_id,
        role       = 'owner',
        is_active  = true,
        full_name  = COALESCE(excluded.full_name, profiles.full_name);

  RETURN new_company_id;
END;
$$;

-- ── Triggers ──────────────────────────────────────────────────────────────
-- Auto-stamp company_id on insert so the frontend never has to send it.

CREATE OR REPLACE FUNCTION set_company_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := current_company_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_company_id_clients  BEFORE INSERT ON clients  FOR EACH ROW EXECUTE FUNCTION set_company_id();
CREATE TRIGGER trg_set_company_id_projects BEFORE INSERT ON projects FOR EACH ROW EXECUTE FUNCTION set_company_id();
CREATE TRIGGER trg_set_company_id_expenses BEFORE INSERT ON expenses FOR EACH ROW EXECUTE FUNCTION set_company_id();
CREATE TRIGGER trg_set_company_id_payments BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION set_company_id();

-- Prevent a non-super-admin from escalating their own role / reactivating
-- themselves / switching company. Owners can still manage OTHER members.
CREATE OR REPLACE FUNCTION guard_profile_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT is_super_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'You cannot change your own role, status, or company';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_profile_self_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION guard_profile_self_update();

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments  ENABLE ROW LEVEL SECURITY;

-- companies ------------------------------------------------------------------
CREATE POLICY companies_select ON companies FOR SELECT TO authenticated
  USING (is_super_admin() OR id = current_company_id());
CREATE POLICY companies_insert ON companies FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR owner_id = auth.uid());
CREATE POLICY companies_update ON companies FOR UPDATE TO authenticated
  USING (is_super_admin() OR owner_id = auth.uid())
  WITH CHECK (is_super_admin() OR owner_id = auth.uid());
CREATE POLICY companies_delete ON companies FOR DELETE TO authenticated
  USING (is_super_admin() OR owner_id = auth.uid());

-- profiles -------------------------------------------------------------------
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_super_admin() OR company_id = current_company_id());
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR is_super_admin());
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR is_super_admin()
    OR (is_company_owner() AND company_id = current_company_id())
  )
  WITH CHECK (
    id = auth.uid()
    OR is_super_admin()
    OR (is_company_owner() AND company_id = current_company_id())
  );

-- Generic tenant policies for business tables.
-- clients --------------------------------------------------------------------
CREATE POLICY clients_select ON clients FOR SELECT TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY clients_insert ON clients FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY clients_update ON clients FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()))
  WITH CHECK (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY clients_delete ON clients FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));

-- projects -------------------------------------------------------------------
CREATE POLICY projects_select ON projects FOR SELECT TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY projects_insert ON projects FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY projects_update ON projects FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()))
  WITH CHECK (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY projects_delete ON projects FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));

-- expenses -------------------------------------------------------------------
CREATE POLICY expenses_select ON expenses FOR SELECT TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY expenses_insert ON expenses FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY expenses_update ON expenses FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()))
  WITH CHECK (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY expenses_delete ON expenses FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));

-- payments -------------------------------------------------------------------
CREATE POLICY payments_select ON payments FOR SELECT TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY payments_insert ON payments FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY payments_update ON payments FOR UPDATE TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()))
  WITH CHECK (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));
CREATE POLICY payments_delete ON payments FOR DELETE TO authenticated
  USING (is_super_admin() OR (is_active_member() AND company_id = current_company_id()));

-- ── Seed the super admin (run AFTER you have signed up once) ──────────────────
-- Replace the email, then run:
--   UPDATE profiles SET role = 'super_admin', is_active = true
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
-- A super admin may have a NULL company_id and still sees every company's data.
