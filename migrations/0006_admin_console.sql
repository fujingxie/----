ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher';

UPDATE users
SET role = 'super_admin'
WHERE level = 'permanent'
  AND (role IS NULL OR role = 'teacher');

ALTER TABLE activation_codes ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1;
ALTER TABLE activation_codes ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activation_codes ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE activation_codes ADD COLUMN created_by_user_id INTEGER;

UPDATE activation_codes
SET used_count = CASE WHEN used_by_user_id IS NULL THEN 0 ELSE 1 END
WHERE used_count IS NULL OR used_count = 0;

UPDATE activation_codes
SET status = CASE
  WHEN used_by_user_id IS NOT NULL THEN 'used'
  ELSE 'active'
END
WHERE status IS NULL OR TRIM(status) = '';

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON activation_codes(status);
