ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

UPDATE users
SET status = 'active'
WHERE status IS NULL OR TRIM(status) = '';

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
