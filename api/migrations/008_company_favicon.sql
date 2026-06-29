-- Workspace favicon (relative path under api/, e.g. uploads/favicons/{id}.png)
ALTER TABLE companies
  ADD COLUMN favicon_path varchar(255) DEFAULT NULL AFTER logo_path;
