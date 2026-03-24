ALTER TABLE rules ADD COLUMN owner_user_id INTEGER;

UPDATE rules
SET owner_user_id = (
  SELECT classes.user_id
  FROM classes
  WHERE classes.id = rules.class_id
)
WHERE class_id IS NOT NULL
  AND owner_user_id IS NULL;

INSERT INTO rules (class_id, owner_user_id, sort_order, name, icon, exp, coins, type, created_at)
SELECT
  NULL,
  users.id,
  template.sort_order,
  template.name,
  template.icon,
  template.exp,
  template.coins,
  template.type,
  CURRENT_TIMESTAMP
FROM users
JOIN (
  SELECT 1 AS sort_order, '字迹工整' AS name, '✍️' AS icon, 2 AS exp, 5 AS coins, 'positive' AS type
  UNION ALL
  SELECT 2, '热爱劳动', '🧹', 3, 10, 'positive'
  UNION ALL
  SELECT 3, '追跑打闹', '🚫', -2, -5, 'negative'
  UNION ALL
  SELECT 4, '未交作业', '📝', -5, -10, 'negative'
) AS template
WHERE NOT EXISTS (
  SELECT 1
  FROM rules existing
  WHERE existing.owner_user_id = users.id
    AND existing.class_id IS NULL
);

DELETE FROM rules
WHERE class_id IS NULL
  AND owner_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_rules_owner_user_id ON rules(owner_user_id);
