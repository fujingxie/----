-- 新增 lifetime_exp 字段：历史累计总经验，只增不减，不受毕业重置影响
-- 用于排行榜宠物排名，解决宠物毕业后 total_exp 归零导致排名失准的问题
ALTER TABLE students ADD COLUMN lifetime_exp INTEGER NOT NULL DEFAULT 0;

-- 将存量数据的 total_exp 初始化到 lifetime_exp，让历史经验立即生效
UPDATE students SET lifetime_exp = total_exp WHERE lifetime_exp = 0 AND total_exp > 0;
