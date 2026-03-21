ALTER TABLE students ADD COLUMN last_decay_at DATETIME;
ALTER TABLE shop_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'gift';
ALTER TABLE shop_items ADD COLUMN exp_value INTEGER NOT NULL DEFAULT 0;

UPDATE students
SET last_decay_at = CASE
      WHEN pet_status = 'egg' THEN NULL
      WHEN last_fed_at IS NOT NULL THEN last_fed_at
      ELSE CURRENT_TIMESTAMP
    END
WHERE last_decay_at IS NULL;

UPDATE shop_items
SET item_type = 'gift',
    exp_value = 0
WHERE item_type IS NULL OR TRIM(item_type) = '';
