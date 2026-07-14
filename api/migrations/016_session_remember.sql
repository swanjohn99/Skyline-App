-- Remember-this-device support: extend idle window from 30 min to 30 days.
ALTER TABLE users ADD COLUMN session_remember_until timestamp NULL DEFAULT NULL;
