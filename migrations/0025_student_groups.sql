-- 给学生表添加分组字段（nullable，不分组的学生为 null）
ALTER TABLE students ADD COLUMN group_name TEXT DEFAULT NULL;

-- 分组查询索引（按班级查分组列表时用）
CREATE INDEX IF NOT EXISTS idx_students_group ON students(class_id, group_name);
