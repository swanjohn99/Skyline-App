-- Add expense type categories to existing DBs
ALTER TABLE expenses
  ADD COLUMN expense_type varchar(32) NOT NULL DEFAULT 'other' AFTER project_id;
