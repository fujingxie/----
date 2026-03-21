ALTER TABLE class_settings ADD COLUMN pet_condition_config TEXT NOT NULL DEFAULT '{"hungry_days":2,"weak_days":4,"sleeping_days":7}';

UPDATE class_settings
SET pet_condition_config = '{"hungry_days":2,"weak_days":4,"sleeping_days":7}'
WHERE pet_condition_config IS NULL OR TRIM(pet_condition_config) = '';
