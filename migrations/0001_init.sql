CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    level TEXT DEFAULT 'temporary',
    expire_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    pet_status TEXT DEFAULT 'egg',
    pet_name TEXT,
    pet_type_id TEXT,
    pet_level INTEGER DEFAULT 0,
    pet_points INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    total_exp INTEGER DEFAULT 0,
    total_coins INTEGER DEFAULT 0,
    reward_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    price INTEGER NOT NULL,
    stock INTEGER DEFAULT 99,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER,
    name TEXT NOT NULL,
    icon TEXT,
    exp INTEGER NOT NULL,
    coins INTEGER NOT NULL,
    type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_settings (
    class_id INTEGER PRIMARY KEY,
    level_thresholds TEXT NOT NULL DEFAULT '[10,20,30,50,70,100]',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_class_id ON shop_items(class_id);
CREATE INDEX IF NOT EXISTS idx_rules_class_id ON rules(class_id);
CREATE INDEX IF NOT EXISTS idx_logs_class_id_created_at ON logs(class_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used_by_user_id ON activation_codes(used_by_user_id);

INSERT OR IGNORE INTO activation_codes (code, level, expires_in_days)
VALUES
    ('CLASS-VIP1-2026', 'vip1', 30),
    ('CLASS-VIP2-2026', 'vip2', 90),
    ('CLASS-PERM-2026', 'permanent', NULL);
