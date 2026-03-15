-- 用户表 (教师账号)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    level TEXT DEFAULT 'temporary', -- temporary, permanent, vip1, vip2
    expire_at DATETIME,
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

CREATE INDEX idx_classes_user_id ON classes(user_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_shop_items_class_id ON shop_items(class_id);
CREATE INDEX idx_rules_class_id ON rules(class_id);
CREATE INDEX idx_logs_class_id_created_at ON logs(class_id, created_at DESC);
