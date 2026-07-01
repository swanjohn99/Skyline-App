-- Vendor contact persons with tags (replaces vendors.contact_person)

CREATE TABLE vendor_contacts (
  id         char(36)     NOT NULL,
  company_id char(36)     NOT NULL,
  vendor_id  char(36)     NOT NULL,
  name       varchar(255) NOT NULL,
  phone      varchar(50)  DEFAULT NULL,
  email      varchar(255) DEFAULT NULL,
  tag        varchar(32)  NOT NULL DEFAULT 'contact_person',
  tag_label  varchar(255) DEFAULT NULL,
  sort_order int          NOT NULL DEFAULT 0,
  created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vendor_contacts_vendor (vendor_id),
  KEY idx_vendor_contacts_company (company_id),
  CONSTRAINT fk_vendor_contacts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_vendor_contacts_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO vendor_contacts (id, company_id, vendor_id, name, phone, email, tag, tag_label, sort_order)
SELECT
  UUID(),
  company_id,
  id,
  contact_person,
  NULL,
  NULL,
  'contact_person',
  NULL,
  0
FROM vendors
WHERE contact_person IS NOT NULL AND contact_person != '';

ALTER TABLE vendors DROP COLUMN contact_person;
