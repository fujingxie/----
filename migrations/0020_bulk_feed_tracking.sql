-- 将批量喂养的每日使用记录从前端 localStorage 迁移到服务端
-- 在 class_settings 表中添加 last_bulk_fed_at 字段，记录每个班级最后一次批量喂养的时间
ALTER TABLE class_settings ADD COLUMN last_bulk_fed_at DATETIME;
