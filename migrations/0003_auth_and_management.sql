CREATE TABLE IF NOT EXISTS activation_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    level TEXT NOT NULL DEFAULT 'vip1',
    expires_in_days INTEGER,
    used_by_user_id INTEGER,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (used_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used_by_user_id ON activation_codes(used_by_user_id);

INSERT OR IGNORE INTO activation_codes (code, level, expires_in_days)
VALUES
    ('CLASS-VIP1-2026', 'vip1', 30),
    ('CLASS-VIP2-2026', 'vip2', 90),
    ('CLASS-PERM-2026', 'permanent', NULL);
