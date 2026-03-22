ALTER TABLE rules ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE rules
SET sort_order = CASE
  WHEN type = 'positive' THEN id
  WHEN type = 'negative' THEN id + 1000
  ELSE id
END
WHERE sort_order = 0;
