-- Add settings table used by admin dashboard and attendance alerts
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value)
VALUES
    ('urgent_threshold', '60'),
    ('warning_threshold', '80'),
    ('attendance_threshold', '80')
ON CONFLICT (key) DO NOTHING;
