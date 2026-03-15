ALTER TABLE students ADD COLUMN pet_collection TEXT DEFAULT '[]';

UPDATE students
SET pet_collection = '[]'
WHERE pet_collection IS NULL OR TRIM(pet_collection) = '';
