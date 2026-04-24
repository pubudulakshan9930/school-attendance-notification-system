-- Migration: add teacher_code to users table for role-based signup/login

ALTER TABLE users
ADD COLUMN IF NOT EXISTS teacher_code TEXT UNIQUE;
