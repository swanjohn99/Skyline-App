-- Combined: remove client POC links, advance received project status, custom task types.

-- POC on clients removed (leads/projects only).
DELETE FROM entity_contacts WHERE entity_type = 'client';

ALTER TABLE entity_contacts DROP CONSTRAINT chk_entity_contacts_type;
ALTER TABLE entity_contacts ADD CONSTRAINT chk_entity_contacts_type
  CHECK (entity_type IN ('lead', 'project'));

-- Project status: advance received (after quotation sent).
ALTER TABLE projects DROP CONSTRAINT chk_projects_status;
ALTER TABLE projects ADD CONSTRAINT chk_projects_status CHECK (status IN (
  'site visit requested',
  'site visit done',
  'quotation sent',
  'advance received',
  'work started',
  'work completed',
  'completed',
  'rejected'
));

-- Task type: allow custom values (drop enum check, widen column).
ALTER TABLE tasks DROP CONSTRAINT chk_tasks_type;
ALTER TABLE tasks MODIFY task_type varchar(64) NOT NULL DEFAULT 'client_call';
