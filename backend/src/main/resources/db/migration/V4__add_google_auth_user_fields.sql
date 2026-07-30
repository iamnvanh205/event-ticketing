ALTER TABLE users
    ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN avatar_url VARCHAR(500),
    ADD COLUMN last_login_at TIMESTAMPTZ;

UPDATE users
SET provider = 'GOOGLE'
WHERE google_id IS NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT chk_users_provider CHECK (provider IN ('LOCAL', 'GOOGLE'));
