-- Initial admin seed for Sureki
-- email: admin@gmail.com
-- password: 1234
-- role: admin

INSERT INTO users (role, full_name, login_id, email, phone, password_hash, is_active)
VALUES (
    'admin',
    'School Admin',
    'admin@gmail.com',
    'admin@gmail.com',
    '0000000000',
    '1234',
    TRUE
)
ON CONFLICT (login_id) DO NOTHING;

INSERT INTO settings (key, value)
VALUES
    ('urgent_threshold', '60'),
    ('warning_threshold', '80'),
    ('attendance_threshold', '80')
ON CONFLICT (key) DO NOTHING;
