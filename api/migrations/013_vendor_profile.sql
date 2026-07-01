-- Vendor website, company email, and bank details

ALTER TABLE vendors
  ADD COLUMN email varchar(255) DEFAULT NULL AFTER phone,
  ADD COLUMN website varchar(512) DEFAULT NULL AFTER address;

ALTER TABLE vendors
  ADD COLUMN bank_account_holder varchar(255) DEFAULT NULL AFTER website,
  ADD COLUMN bank_name varchar(255) DEFAULT NULL AFTER bank_account_holder,
  ADD COLUMN bank_account_number varchar(64) DEFAULT NULL AFTER bank_name,
  ADD COLUMN bank_ifsc varchar(32) DEFAULT NULL AFTER bank_account_number,
  ADD COLUMN bank_address text DEFAULT NULL AFTER bank_ifsc;
