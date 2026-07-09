-- Initial admin seed for Sureki
-- email: admin@gmail.com
-- password: 1234 (stored as a bcrypt hash)
-- role: admin

INSERT INTO users (role, full_name, login_id, email, phone, password_hash, is_active)
VALUES (
    'admin',
    'School Admin',
    'admin@gmail.com',
    'admin@gmail.com',
    '0000000000',
    '$2b$10$FNS0jbJhpSv.VerVbFUZ1.0m.036X49Lu3I5xkd4DymT2NxlA1UXW',
    TRUE
)
ON CONFLICT (login_id) DO NOTHING;

INSERT INTO settings (key, value)
VALUES
    ('urgent_threshold', '60'),
    ('warning_threshold', '80'),
    ('attendance_threshold', '80')
ON CONFLICT (key) DO NOTHING;
