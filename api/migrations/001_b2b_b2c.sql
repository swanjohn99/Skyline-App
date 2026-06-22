-- B2B/B2C CRM migration (run once on existing production DBs)

CREATE TABLE IF NOT EXISTS customer_accounts (
  id         char(36)     NOT NULL,
  company_id char(36)     NOT NULL,
  name       varchar(255) NOT NULL,
  email      varchar(255) DEFAULT NULL,
  phone      varchar(50)  DEFAULT NULL,
  address    text         DEFAULT NULL,
  location   varchar(255) DEFAULT NULL,
  notes      text         DEFAULT NULL,
  created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customer_accounts_company_id (company_id),
  CONSTRAINT fk_customer_accounts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS customer_account_id char(36) DEFAULT NULL AFTER client_type,
  ADD COLUMN IF NOT EXISTS contact_title varchar(255) DEFAULT NULL AFTER name;

-- MariaDB before 10.0.2 may not support IF NOT EXISTS on ADD COLUMN; run manually if needed.

UPDATE clients SET client_type = 'b2c' WHERE client_type = 'private_client';
UPDATE clients SET client_type = 'b2b' WHERE client_type = 'contractor';

ALTER TABLE clients MODIFY client_type varchar(32) NOT NULL DEFAULT 'b2c';

ALTER TABLE clients
  ADD KEY idx_clients_customer_account_id (customer_account_id);

ALTER TABLE clients
  ADD CONSTRAINT fk_clients_customer_account
  FOREIGN KEY (customer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL;
