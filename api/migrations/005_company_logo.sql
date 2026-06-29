-- Company logo (relative path under api/, e.g. uploads/logos/{id}.png)
ALTER TABLE companies
  ADD COLUMN logo_path varchar(255) DEFAULT NULL AFTER name;
