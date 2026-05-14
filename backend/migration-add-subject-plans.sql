-- Migration: Add subject plans customization
-- Purpose: Allow admins to customize subject plans for different grades and streams
-- Date: 2026-05-07

CREATE TABLE IF NOT EXISTS class_subject_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 13),
    stream TEXT NOT NULL DEFAULT '' CHECK (stream IN ('', 'science', 'biological', 'mathematical', 'art')),
    
    -- Fixed/Compulsory subjects (comma-separated)
    fixed_subjects TEXT NOT NULL DEFAULT '',
    
    -- Language subject options (comma-separated)
    language_options TEXT NOT NULL DEFAULT 'Sinhala,Tamil',
    
    -- Religion subject options (comma-separated)
    religion_options TEXT NOT NULL DEFAULT 'Buddhism,Hindu,Catholic,Islam',
    
    -- Elective Category 1 options (comma-separated)
    elective_category_1_options TEXT NOT NULL DEFAULT '',
    
    -- Elective Category 2 options (comma-separated)
    elective_category_2_options TEXT NOT NULL DEFAULT '',
    
    -- Elective Category 3 options (comma-separated)
    elective_category_3_options TEXT NOT NULL DEFAULT '',
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (grade, stream)
);

-- Index for faster queries
CREATE INDEX idx_class_subject_plans_grade_stream ON class_subject_plans(grade, stream);

-- Popuate default plans based on grade and stream
INSERT INTO class_subject_plans (grade, stream, fixed_subjects, language_options, religion_options, elective_category_1_options, elective_category_2_options, elective_category_3_options)
VALUES
    -- Grades 1-2
    (1, '', 'Mathematics,Environment', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    (2, '', 'Mathematics,Environment', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    
    -- Grades 3-5
    (3, '', 'Mathematics,English (as secondary language),Environment', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    (4, '', 'Mathematics,English (as secondary language),Environment', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    (5, '', 'Mathematics,English (as secondary language),Environment', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    
    -- Grades 6-11 (Core)
    (6, '', 'Mathematics,English (as secondary language),Science,History', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', 'ICT,Health and Physical Education,Accounting', 'Music,Arts,Dancing', 'Geography,Tamil,Human Studies'),
    (7, '', 'Mathematics,English (as secondary language),Science,History', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', 'ICT,Health and Physical Education,Accounting', 'Music,Arts,Dancing', 'Geography,Tamil,Human Studies'),
    (8, '', 'Mathematics,English (as secondary language),Science,History', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', 'ICT,Health and Physical Education,Accounting', 'Music,Arts,Dancing', 'Geography,Tamil,Human Studies'),
    (9, '', 'Mathematics,English (as secondary language),Science,History', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', 'ICT,Health and Physical Education,Accounting', 'Music,Arts,Dancing', 'Geography,Tamil,Human Studies'),
    (10, '', 'Mathematics,English (as secondary language),Science,History', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', 'ICT,Health and Physical Education,Accounting', 'Music,Arts,Dancing', 'Geography,Tamil,Human Studies'),
    (11, '', 'Mathematics,English (as secondary language),Science,History', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', 'ICT,Health and Physical Education,Accounting', 'Music,Arts,Dancing', 'Geography,Tamil,Human Studies'),
    
    -- Grades 12-13 Biological Stream
    (12, 'biological', 'Biology,Chemistry,Physics', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    (13, 'biological', 'Biology,Chemistry,Physics', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    
    -- Grades 12-13 Science Stream
    (12, 'science', 'Biology,Chemistry,Physics', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    (13, 'science', 'Biology,Chemistry,Physics', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    
    -- Grades 12-13 Mathematical Stream
    (12, 'mathematical', 'Applied Mathematics,Pure Mathematics,Chemistry,Physics', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    (13, 'mathematical', 'Applied Mathematics,Pure Mathematics,Chemistry,Physics', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    
    -- Grades 12-13 Art Stream
    (12, 'art', 'Geography,ICT,Tamil', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', ''),
    (13, 'art', 'Geography,ICT,Tamil', 'Sinhala,Tamil', 'Buddhism,Hindu,Catholic,Islam', '', '', '')
ON CONFLICT (grade, stream) DO NOTHING;
