ALTER TABLE users ADD COLUMN register_ip TEXT;
ALTER TABLE users ADD COLUMN register_user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_users_register_ip ON users(register_ip);

CREATE TABLE IF NOT EXISTS registration_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    username TEXT,
    mode TEXT NOT NULL DEFAULT 'register',
    result TEXT NOT NULL, -- blocked, failed, success
    reason TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip_created_at
ON registration_attempts(ip, created_at DESC);
