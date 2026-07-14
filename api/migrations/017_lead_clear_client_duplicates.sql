-- Leads linked to a CRM client should not duplicate contact fields on the lead row.
UPDATE leads
SET contact_name = NULL,
    phone = NULL,
    email = NULL,
    location = NULL,
    source = NULL
WHERE client_id IS NOT NULL
  AND (
    contact_name IS NOT NULL
    OR phone IS NOT NULL
    OR email IS NOT NULL
    OR location IS NOT NULL
    OR source IS NOT NULL
  );
