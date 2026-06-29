-- Track one active login per user (IP-bound for new sign-ins)
ALTER TABLE users
  ADD COLUMN active_login_ip varchar(45) DEFAULT NULL,
  ADD COLUMN active_session_token char(64) DEFAULT NULL,
  ADD COLUMN session_last_seen timestamp NULL DEFAULT NULL;
