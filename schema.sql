-- 用户表 (教师账号)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    level TEXT DEFAULT 'temporary', -- temporary, permanent, vip1, vip2
    expire_at DATETIME,
    role TEXT NOT NULL DEFAULT 'teacher',
    status TEXT NOT NULL DEFAULT 'active',
    register_source TEXT NOT NULL DEFAULT 'activation_code',
    source_note TEXT,
    register_ip TEXT,
    register_user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 班级表
CREATE TABLE classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 学生与宠物表
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    pet_status TEXT DEFAULT 'egg', -- egg, active
    pet_name TEXT,
    pet_type_id TEXT,
    pet_level INTEGER DEFAULT 0,
    pet_points INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    total_exp INTEGER DEFAULT 0,
    total_coins INTEGER DEFAULT 0,
    reward_count INTEGER DEFAULT 0,
    pet_collection TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- 商店物品表
CREATE TABLE shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    price INTEGER NOT NULL,
    stock INTEGER DEFAULT 99,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- 课堂规则库表
CREATE TABLE rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER, -- NULL 表示系统预设
    name TEXT NOT NULL,
    icon TEXT,
    exp INTEGER NOT NULL,
    coins INTEGER NOT NULL,
    type TEXT, -- positive, negative
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 班级设置表
CREATE TABLE class_settings (
    class_id INTEGER PRIMARY KEY,
    level_thresholds TEXT NOT NULL DEFAULT '[10,20,30,50,70,100]',
    smart_seating_config TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- 操作日志表
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 激活码表
CREATE TABLE activation_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    level TEXT NOT NULL DEFAULT 'vip1',
    expires_in_days INTEGER,
    used_by_user_id INTEGER,
    used_at DATETIME,
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (used_by_user_id) REFERENCES users(id)
);

CREATE TABLE system_flags (
    key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'permanent',
    end_at DATETIME,
    value_json TEXT NOT NULL DEFAULT '{}',
    updated_by_user_id INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
);

CREATE TABLE registration_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    username TEXT,
    mode TEXT NOT NULL DEFAULT 'register',
    result TEXT NOT NULL,
    reason TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classes_user_id ON classes(user_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_shop_items_class_id ON shop_items(class_id);
CREATE INDEX idx_rules_class_id ON rules(class_id);
CREATE INDEX idx_logs_class_id_created_at ON logs(class_id, created_at DESC);
CREATE INDEX idx_activation_codes_code ON activation_codes(code);
CREATE INDEX idx_activation_codes_used_by_user_id ON activation_codes(used_by_user_id);
CREATE INDEX idx_activation_codes_status ON activation_codes(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_register_source ON users(register_source);
CREATE INDEX idx_users_register_ip ON users(register_ip);
CREATE INDEX idx_system_flags_updated_at ON system_flags(updated_at DESC);
CREATE INDEX idx_registration_attempts_ip_created_at ON registration_attempts(ip, created_at DESC);
