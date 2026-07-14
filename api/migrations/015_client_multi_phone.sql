-- Clients can store multiple phone numbers (comma-separated). Widen column.
ALTER TABLE clients MODIFY phone varchar(255) DEFAULT NULL;
