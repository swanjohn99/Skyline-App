-- Project milestones + nullable quoted total
ALTER TABLE projects
  MODIFY COLUMN total_quoted_amount decimal(12, 2) DEFAULT NULL;

CREATE TABLE milestones (
  id             char(36)     NOT NULL,
  company_id     char(36)     NOT NULL,
  project_id     char(36)     NOT NULL,
  title          varchar(255) NOT NULL,
  milestone_date date         NOT NULL,
  comments       text         DEFAULT NULL,
  created_at     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_milestones_company_id (company_id),
  KEY idx_milestones_project_id (project_id),
  KEY idx_milestones_date (milestone_date),
  CONSTRAINT fk_milestones_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_milestones_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
