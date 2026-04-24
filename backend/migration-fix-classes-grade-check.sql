-- Migration: align classes grade validation with app rule (1-13)

ALTER TABLE classes
DROP CONSTRAINT IF EXISTS classes_grade_check;

ALTER TABLE classes
ADD CONSTRAINT classes_grade_check
CHECK (grade BETWEEN 1 AND 13);
