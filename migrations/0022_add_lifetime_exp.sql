-- 新增 lifetime_exp 字段：历史累计总经验，只增不减，不受毕业重置影响
-- 用于排行榜宠物排名，解决宠物毕业后 total_exp 归零导致排名失准的问题
ALTER TABLE students ADD COLUMN lifetime_exp INTEGER NOT NULL DEFAULT 0;
