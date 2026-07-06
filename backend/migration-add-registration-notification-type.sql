-- Migration: add 'registration' to allowed notification_type values in notification_logs

ALTER TABLE notification_logs
DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check;

ALTER TABLE notification_logs
ADD CONSTRAINT notification_logs_notification_type_check
CHECK (notification_type IN ('attendance', 'term_test', 'registration'));
