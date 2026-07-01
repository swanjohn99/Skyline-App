-- Lead project title + multi-line material expense items

ALTER TABLE leads
  ADD COLUMN project_title varchar(255) DEFAULT NULL AFTER contact_name;

CREATE TABLE expense_items (
  id                char(36)       NOT NULL,
  company_id        char(36)       NOT NULL,
  expense_id        char(36)       NOT NULL,
  chemical_id       char(36)       DEFAULT NULL,
  custom_name       varchar(255)   DEFAULT NULL,
  unit_price        decimal(12, 4) NOT NULL DEFAULT 0,
  quantity          decimal(12, 4) NOT NULL DEFAULT 0,
  line_total        decimal(12, 2) NOT NULL DEFAULT 0,
  vendor_pricing_id char(36)       DEFAULT NULL,
  sort_order        int            NOT NULL DEFAULT 0,
  created_at        timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_expense_items_expense (expense_id),
  KEY idx_expense_items_company (company_id),
  CONSTRAINT fk_expense_items_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_expense_items_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_expense_items_chemical FOREIGN KEY (chemical_id) REFERENCES chemicals(id) ON DELETE SET NULL,
  CONSTRAINT fk_expense_items_vp FOREIGN KEY (vendor_pricing_id) REFERENCES vendor_pricing(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill legacy single-line material rows into expense_items
INSERT INTO expense_items (id, company_id, expense_id, chemical_id, unit_price, quantity, line_total, vendor_pricing_id, sort_order)
SELECT
  UUID(),
  e.company_id,
  e.id,
  e.chemical_id,
  COALESCE(e.unit_price, 0),
  COALESCE(NULLIF(e.quantity, 0), 1),
  e.amount,
  e.vendor_pricing_id,
  0
FROM expenses e
WHERE e.chemical_id IS NOT NULL
   OR (e.expense_type = 'material' AND e.unit_price IS NOT NULL);

ALTER TABLE expenses
  DROP FOREIGN KEY fk_expenses_chemical,
  DROP FOREIGN KEY fk_expenses_vp,
  DROP COLUMN chemical_id,
  DROP COLUMN unit_price,
  DROP COLUMN quantity,
  DROP COLUMN vendor_pricing_id;
