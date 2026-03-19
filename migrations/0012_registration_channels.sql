CREATE TABLE IF NOT EXISTS registration_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    require_activation INTEGER NOT NULL DEFAULT 1,
    default_level TEXT NOT NULL DEFAULT 'temporary',
    end_at DATETIME,
    note TEXT,
    updated_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
);

ALTER TABLE users ADD COLUMN register_channel TEXT;

CREATE INDEX IF NOT EXISTS idx_registration_channels_code ON registration_channels(code);
CREATE INDEX IF NOT EXISTS idx_registration_channels_enabled ON registration_channels(enabled);
CREATE INDEX IF NOT EXISTS idx_users_register_channel ON users(register_channel);
