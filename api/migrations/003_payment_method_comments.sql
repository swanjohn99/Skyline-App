-- Add payment method and comments to existing DBs
ALTER TABLE payments
  ADD COLUMN payment_method varchar(32) NOT NULL DEFAULT 'cash' AFTER project_id;

ALTER TABLE payments
  ADD COLUMN comments text DEFAULT NULL AFTER payment_date;
