-- 把现有单值 group_name 转为 JSON 数组格式
-- 已经是数组格式的（测试环境可能已手动改过）跳过
UPDATE students
SET group_name = json_array(group_name)
WHERE group_name IS NOT NULL
  AND group_name NOT LIKE '[%';
