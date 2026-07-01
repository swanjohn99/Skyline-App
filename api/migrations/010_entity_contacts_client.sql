-- Allow entity_contacts to link additional clients to a client record (multi-POC on CRM clients).
ALTER TABLE entity_contacts DROP CONSTRAINT chk_entity_contacts_type;
ALTER TABLE entity_contacts ADD CONSTRAINT chk_entity_contacts_type
  CHECK (entity_type IN ('lead', 'project', 'client'));
