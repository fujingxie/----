UPDATE class_settings
SET pet_condition_config = json_object(
  'enabled', COALESCE(json_extract(pet_condition_config, '$.enabled'), 1),
  'skip_weekends', COALESCE(json_extract(pet_condition_config, '$.skip_weekends'), 1),
  'pause_start_date', json_extract(pet_condition_config, '$.pause_start_date'),
  'pause_end_date', json_extract(pet_condition_config, '$.pause_end_date'),
  'hungry_days', COALESCE(json_extract(pet_condition_config, '$.hungry_days'), 2),
  'weak_days', COALESCE(json_extract(pet_condition_config, '$.weak_days'), 4),
  'sleeping_days', COALESCE(json_extract(pet_condition_config, '$.sleeping_days'), 7),
  'hungry_decay', COALESCE(json_extract(pet_condition_config, '$.hungry_decay'), 0),
  'weak_decay', COALESCE(json_extract(pet_condition_config, '$.weak_decay'), 1),
  'sleeping_decay', COALESCE(json_extract(pet_condition_config, '$.sleeping_decay'), 2)
)
WHERE pet_condition_config IS NOT NULL;
