-- Migration: add max student limit per class

ALTER TABLE classes
ADD COLUMN IF NOT EXISTS max_students SMALLINT NOT NULL DEFAULT 40;

ALTER TABLE classes
DROP CONSTRAINT IF EXISTS classes_max_students_check;

ALTER TABLE classes
ADD CONSTRAINT classes_max_students_check
CHECK (max_students BETWEEN 1 AND 200);
