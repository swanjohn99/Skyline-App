-- Remove points of contact linked directly to client records (POC is for leads/projects only).
DELETE FROM entity_contacts WHERE entity_type = 'client';

ALTER TABLE entity_contacts DROP CONSTRAINT chk_entity_contacts_type;
ALTER TABLE entity_contacts ADD CONSTRAINT chk_entity_contacts_type
  CHECK (entity_type IN ('lead', 'project'));
