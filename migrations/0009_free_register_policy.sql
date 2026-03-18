CREATE TABLE IF NOT EXISTS system_flags (
    key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'permanent',
    end_at DATETIME,
    value_json TEXT NOT NULL DEFAULT '{}',
    updated_by_user_id INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
);

INSERT OR IGNORE INTO system_flags (key, enabled, mode, end_at, value_json)
VALUES (
    'free_register',
    0,
    'permanent',
    NULL,
    '{"default_level":"temporary"}'
);

ALTER TABLE users ADD COLUMN register_source TEXT NOT NULL DEFAULT 'activation_code';
ALTER TABLE users ADD COLUMN source_note TEXT;

UPDATE users
SET register_source = 'activation_code'
WHERE register_source IS NULL OR TRIM(register_source) = '';

CREATE INDEX IF NOT EXISTS idx_users_register_source ON users(register_source);
CREATE INDEX IF NOT EXISTS idx_system_flags_updated_at ON system_flags(updated_at DESC);
