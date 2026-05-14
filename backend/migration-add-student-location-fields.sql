-- Add optional city/address fields for student profiles
ALTER TABLE students
ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS address TEXT;
