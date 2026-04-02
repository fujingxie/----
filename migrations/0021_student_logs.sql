-- 新增 student_logs 表，专门用于记录单个学生的课堂互动、喂养和兑换详情
CREATE TABLE student_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    action TEXT NOT NULL,          -- 行动标识，如 'interact', 'bulk_feed', 'bulk_interact', 'redeem', 'decay'
    rule_name TEXT,                -- 规则名称或行动文本
    rule_icon TEXT,                -- 相关图标
    exp_delta INTEGER DEFAULT 0,   -- 经验变化值
    coins_delta INTEGER DEFAULT 0, -- 金币变化值
    exp_after INTEGER,             -- 变动后的经验总值
    coins_after INTEGER,           -- 变动后的金币总值
    level_after INTEGER,           -- 变动后的宠物等级
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX idx_student_logs_student_id ON student_logs(student_id, created_at DESC);
CREATE INDEX idx_student_logs_class_id ON student_logs(class_id, created_at DESC);
