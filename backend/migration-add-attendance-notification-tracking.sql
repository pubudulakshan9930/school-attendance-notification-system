-- Migration: Add notification tracking to attendance_sheets
ALTER TABLE attendance_sheets
ADD COLUMN IF NOT EXISTS is_notified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_attendance_sheets_notified ON attendance_sheets(is_notified, attendance_date);
