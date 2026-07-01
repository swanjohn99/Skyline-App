-- Business expansion: leads CRM, project types, procurement, warranties, tasks, audit, documents

-- ── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id                   char(36)       NOT NULL,
  company_id           char(36)       NOT NULL,
  client_id            char(36)       DEFAULT NULL,
  contact_name         varchar(255)   DEFAULT NULL,
  phone                varchar(50)    DEFAULT NULL,
  email                varchar(255)   DEFAULT NULL,
  location             varchar(255)   DEFAULT NULL,
  source               varchar(255)   DEFAULT NULL,
  status               varchar(40)    NOT NULL DEFAULT 'new_inquiry',
  estimated_value      decimal(12, 2) DEFAULT NULL,
  notes                text           DEFAULT NULL,
  converted_project_id char(36)       DEFAULT NULL,
  created_at           timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leads_company_id (company_id),
  KEY idx_leads_client_id (client_id),
  KEY idx_leads_status (status),
  KEY idx_leads_converted_project (converted_project_id),
  CONSTRAINT fk_leads_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_leads_client  FOREIGN KEY (client_id)  REFERENCES clients(id)   ON DELETE SET NULL,
  CONSTRAINT chk_leads_status CHECK (status IN (
    'new_inquiry', 'photos_received', 'site_visit_scheduled',
    'quotation_pending', 'quotation_sent', 'converted', 'lost'
  ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE projects
  ADD COLUMN lead_id char(36) DEFAULT NULL AFTER client_id,
  ADD KEY idx_projects_lead_id (lead_id),
  ADD CONSTRAINT fk_projects_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

ALTER TABLE leads
  ADD CONSTRAINT fk_leads_project FOREIGN KEY (converted_project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- ── Project type catalog ─────────────────────────────────────────────────────
CREATE TABLE project_types (
  id         char(36)     NOT NULL,
  company_id char(36)     NOT NULL,
  category   varchar(64)  NOT NULL,
  name       varchar(255) NOT NULL,
  is_active  tinyint(1)   NOT NULL DEFAULT 1,
  created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_types_company (company_id),
  KEY idx_project_types_category (category),
  CONSTRAINT fk_project_types_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT chk_project_types_category CHECK (category IN ('Retrofitting', 'Waterproofing', 'NDT Testing'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE entity_project_types (
  id              char(36)    NOT NULL,
  company_id      char(36)    NOT NULL,
  entity_type     varchar(16) NOT NULL,
  entity_id       char(36)    NOT NULL,
  project_type_id char(36)    NOT NULL,
  created_at      timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_entity_project_type (company_id, entity_type, entity_id, project_type_id),
  KEY idx_ept_entity (company_id, entity_type, entity_id),
  CONSTRAINT fk_ept_company      FOREIGN KEY (company_id)      REFERENCES companies(id)     ON DELETE CASCADE,
  CONSTRAINT fk_ept_project_type FOREIGN KEY (project_type_id) REFERENCES project_types(id) ON DELETE CASCADE,
  CONSTRAINT chk_ept_entity_type CHECK (entity_type IN ('lead', 'project'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE entity_contacts (
  id           char(36)     NOT NULL,
  company_id   char(36)     NOT NULL,
  entity_type  varchar(16)  NOT NULL,
  entity_id    char(36)     NOT NULL,
  client_id    char(36)     NOT NULL,
  is_principal tinyint(1)   NOT NULL DEFAULT 0,
  role         varchar(64)  DEFAULT NULL,
  created_at   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_entity_contacts_entity (company_id, entity_type, entity_id),
  KEY idx_entity_contacts_client (client_id),
  CONSTRAINT fk_entity_contacts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_entity_contacts_client  FOREIGN KEY (client_id)  REFERENCES clients(id)   ON DELETE CASCADE,
  CONSTRAINT chk_entity_contacts_type CHECK (entity_type IN ('lead', 'project'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Procurement ──────────────────────────────────────────────────────────────
CREATE TABLE vendors (
  id             char(36)     NOT NULL,
  company_id     char(36)     NOT NULL,
  name           varchar(255) NOT NULL,
  phone          varchar(50)  DEFAULT NULL,
  gst_number     varchar(32)  DEFAULT NULL,
  address        text         DEFAULT NULL,
  contact_person varchar(255) DEFAULT NULL,
  created_at     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vendors_company (company_id),
  CONSTRAINT fk_vendors_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chemicals (
  id              char(36)     NOT NULL,
  company_id      char(36)     NOT NULL,
  name            varchar(255) NOT NULL,
  unit_of_measure varchar(32)  NOT NULL DEFAULT 'kg',
  created_at      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chemicals_company (company_id),
  CONSTRAINT fk_chemicals_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendor_pricing (
  id             char(36)       NOT NULL,
  company_id     char(36)       NOT NULL,
  vendor_id      char(36)       NOT NULL,
  chemical_id    char(36)       NOT NULL,
  price          decimal(12, 4) NOT NULL,
  effective_date date           NOT NULL,
  created_at     timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vendor_chemical_date (vendor_id, chemical_id, effective_date),
  KEY idx_vp_lookup (vendor_id, chemical_id, effective_date),
  KEY idx_vp_company (company_id),
  CONSTRAINT fk_vp_company  FOREIGN KEY (company_id)  REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_vp_vendor   FOREIGN KEY (vendor_id)   REFERENCES vendors(id)   ON DELETE CASCADE,
  CONSTRAINT fk_vp_chemical FOREIGN KEY (chemical_id) REFERENCES chemicals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE expenses
  ADD COLUMN vendor_id char(36) DEFAULT NULL AFTER expense_type,
  ADD COLUMN chemical_id char(36) DEFAULT NULL AFTER vendor_id,
  ADD COLUMN unit_price decimal(12, 4) DEFAULT NULL AFTER chemical_id,
  ADD COLUMN quantity decimal(12, 4) DEFAULT NULL AFTER unit_price,
  ADD COLUMN vendor_pricing_id char(36) DEFAULT NULL AFTER quantity,
  ADD KEY idx_expenses_vendor (vendor_id),
  ADD KEY idx_expenses_chemical (chemical_id),
  ADD CONSTRAINT fk_expenses_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_expenses_chemical FOREIGN KEY (chemical_id) REFERENCES chemicals(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_expenses_vp FOREIGN KEY (vendor_pricing_id) REFERENCES vendor_pricing(id) ON DELETE SET NULL;

-- ── Warranties ───────────────────────────────────────────────────────────────
CREATE TABLE warranties (
  id              char(36)     NOT NULL,
  company_id      char(36)     NOT NULL,
  project_id      char(36)     NOT NULL,
  start_date      date         NOT NULL,
  duration_months int          NOT NULL,
  end_date        date         NOT NULL,
  terms           text         DEFAULT NULL,
  document_path   varchar(255) DEFAULT NULL,
  created_at      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_warranties_company (company_id),
  KEY idx_warranties_project (project_id),
  CONSTRAINT fk_warranties_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_warranties_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tasks (reminders) ────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id           char(36)     NOT NULL,
  company_id   char(36)     NOT NULL,
  entity_type  varchar(16)  DEFAULT NULL,
  entity_id    char(36)     DEFAULT NULL,
  title        varchar(255) NOT NULL,
  task_type    varchar(32)  NOT NULL DEFAULT 'client_call',
  due_date     date         NOT NULL,
  is_completed tinyint(1)   NOT NULL DEFAULT 0,
  notes        text         DEFAULT NULL,
  created_at   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_company (company_id),
  KEY idx_tasks_due (company_id, due_date),
  KEY idx_tasks_entity (company_id, entity_type, entity_id),
  CONSTRAINT fk_tasks_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT chk_tasks_type CHECK (task_type IN ('site_visit', 'payment_followup', 'client_call')),
  CONSTRAINT chk_tasks_entity_type CHECK (entity_type IS NULL OR entity_type IN ('lead', 'project'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Audit log ────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id         char(36)     NOT NULL,
  company_id char(36)     NOT NULL,
  user_id    char(36)     NOT NULL,
  table_name varchar(64)  NOT NULL,
  record_id  char(36)     NOT NULL,
  action     varchar(16)  NOT NULL,
  details    json         DEFAULT NULL,
  created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_company_date (company_id, created_at),
  KEY idx_audit_record (table_name, record_id),
  CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user    FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT chk_audit_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Documents ────────────────────────────────────────────────────────────────
CREATE TABLE document_templates (
  id            char(36)     NOT NULL,
  company_id    char(36)     NOT NULL,
  template_type varchar(32)  NOT NULL,
  file_path     varchar(255) NOT NULL,
  is_active     tinyint(1)   NOT NULL DEFAULT 1,
  created_at    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_doc_templates_company (company_id),
  CONSTRAINT fk_doc_templates_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT chk_doc_template_type CHECK (template_type IN ('quotation', 'receipt', 'warranty'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE generated_documents (
  id            char(36)     NOT NULL,
  company_id    char(36)     NOT NULL,
  project_id    char(36)     NOT NULL,
  template_type varchar(32)  NOT NULL,
  file_path     varchar(255) NOT NULL,
  generated_by  char(36)     NOT NULL,
  created_at    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gen_docs_project (project_id),
  KEY idx_gen_docs_company (company_id),
  CONSTRAINT fk_gen_docs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_gen_docs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_gen_docs_user    FOREIGN KEY (generated_by) REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
