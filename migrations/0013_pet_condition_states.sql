ALTER TABLE students ADD COLUMN pet_condition TEXT NOT NULL DEFAULT 'healthy';
ALTER TABLE students ADD COLUMN last_fed_at DATETIME;
ALTER TABLE students ADD COLUMN pet_condition_locked_at DATETIME;

UPDATE students
SET last_fed_at = CASE
      WHEN pet_status = 'egg' THEN NULL
      ELSE CURRENT_TIMESTAMP
    END,
    pet_condition = 'healthy',
    pet_condition_locked_at = NULL;
