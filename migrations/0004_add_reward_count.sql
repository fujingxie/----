ALTER TABLE students ADD COLUMN reward_count INTEGER DEFAULT 0;

UPDATE students
SET reward_count = 0
WHERE reward_count IS NULL;
