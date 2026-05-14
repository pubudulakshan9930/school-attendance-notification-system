-- Migration: support grade 12/13 streams and class-specific subject planning

ALTER TABLE classes
ADD COLUMN IF NOT EXISTS stream TEXT NOT NULL DEFAULT '';

UPDATE classes
SET stream = ''
WHERE stream IS NULL;

ALTER TABLE classes
DROP CONSTRAINT IF EXISTS classes_grade_section_academic_year_key;

ALTER TABLE classes
ADD CONSTRAINT classes_grade_section_academic_year_stream_key UNIQUE (
    grade,
    section,
    academic_year,
    stream
);

ALTER TABLE classes
DROP CONSTRAINT IF EXISTS classes_stream_check;

ALTER TABLE classes
ADD CONSTRAINT classes_stream_check
CHECK (stream IN ('', 'science', 'biological', 'mathematical', 'art'));