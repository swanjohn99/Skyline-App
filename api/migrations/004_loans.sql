-- Loans and repayments (lenders, loans, loan_repayments)

CREATE TABLE IF NOT EXISTS lenders (
  id         char(36)     NOT NULL,
  company_id char(36)     NOT NULL,
  name       varchar(255) NOT NULL,
  phone      varchar(50)  DEFAULT NULL,
  address    text         DEFAULT NULL,
  notes      text         DEFAULT NULL,
  created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lenders_company_id (company_id),
  CONSTRAINT fk_lenders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loans (
  id               char(36)       NOT NULL,
  company_id       char(36)       NOT NULL,
  lender_id        char(36)       NOT NULL,
  principal_amount decimal(12, 2) NOT NULL,
  loan_date        date           NOT NULL,
  interest_rate    decimal(8, 4)  NOT NULL DEFAULT 0,
  interest_period  varchar(10)    NOT NULL DEFAULT 'year',
  notes            text           DEFAULT NULL,
  created_at       timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_loans_company_id (company_id),
  KEY idx_loans_lender_id  (lender_id),
  KEY idx_loans_loan_date  (loan_date),
  CONSTRAINT fk_loans_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_loans_lender  FOREIGN KEY (lender_id)  REFERENCES lenders(id)  ON DELETE RESTRICT,
  CONSTRAINT chk_loans_interest_period CHECK (interest_period IN ('year', 'month'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loan_repayments (
  id               char(36)       NOT NULL,
  company_id       char(36)       NOT NULL,
  loan_id          char(36)       NOT NULL,
  amount           decimal(12, 2) NOT NULL,
  repayment_date   date           NOT NULL,
  payment_method   varchar(32)    NOT NULL DEFAULT 'cash',
  comments         text           DEFAULT NULL,
  created_at       timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_loan_repayments_company_id (company_id),
  KEY idx_loan_repayments_loan_id    (loan_id),
  KEY idx_loan_repayments_date       (repayment_date),
  CONSTRAINT fk_loan_repayments_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_loan_repayments_loan    FOREIGN KEY (loan_id)    REFERENCES loans(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
