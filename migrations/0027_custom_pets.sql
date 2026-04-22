CREATE TABLE IF NOT EXISTS custom_pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'animal', -- animal | plant | dinosaur | robot
  image_lv1 TEXT NOT NULL,
  image_lv2 TEXT NOT NULL,
  image_lv3 TEXT NOT NULL,
  image_lv4 TEXT NOT NULL,
  image_lv5 TEXT NOT NULL,
  image_lv6 TEXT NOT NULL,
  image_lv7 TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
