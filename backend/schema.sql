-- PostgreSQL schema for Sureki attendance application
-- Database name: sureki

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User accounts for admin and teachers
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
    full_name TEXT NOT NULL,
    login_id TEXT NOT NULL UNIQUE,
    email TEXT,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    teacher_code TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Class groups for each academic year
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 13),
    section TEXT NOT NULL,
    academic_year SMALLINT NOT NULL,
    max_students SMALLINT NOT NULL DEFAULT 40 CHECK (max_students BETWEEN 1 AND 200),
    stream TEXT NOT NULL DEFAULT '' CHECK (stream IN ('', 'science', 'biological', 'mathematical', 'art')),
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (grade, section, academic_year, stream)
);

-- School subjects (compulsory or elective)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subject_group TEXT NOT NULL CHECK (subject_group IN ('compulsory', 'elective')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student profile data
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    gender TEXT,
    city TEXT,
    address TEXT,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    parent_email TEXT,
    student_code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historical class assignment per student, used for history and future grade promotion
CREATE TABLE student_class_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
    removed_at DATE,
    UNIQUE (student_id, class_id, assigned_at)
);

-- Subjects selected by each student (including compulsory subjects)
CREATE TABLE student_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    is_elective BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id)
);

-- Attendance sheet for one class per date
CREATE TABLE attendance_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (class_id, attendance_date)
);

-- Attendance record per student on a sheet
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_sheet_id UUID NOT NULL REFERENCES attendance_sheets(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    reason TEXT,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attendance_sheet_id, student_id)
);

-- Term test marks for each student in a subject
CREATE TABLE term_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    term SMALLINT NOT NULL CHECK (term IN (1, 2, 3)),
    academic_year SMALLINT NOT NULL,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    mark NUMERIC(5,2) NOT NULL CHECK (mark >= 0 AND mark <= 100),
    exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, class_id, term, academic_year, subject_id)
);

-- Term marks review and approval workflow
CREATE TABLE term_marks_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    term SMALLINT NOT NULL CHECK (term IN (1, 2, 3)),
    academic_year SMALLINT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'notified', 'approved')),
    admin_notified_at TIMESTAMPTZ,
    admin_notification_error TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    parent_sms_status TEXT NOT NULL DEFAULT 'pending' CHECK (parent_sms_status IN ('pending', 'sent', 'failed')),
    parent_sms_sent_at TIMESTAMPTZ,
    parent_sms_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, class_id, term, academic_year)
);

-- SMS and email notification history
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('attendance', 'term_test', 'registration')),
    medium TEXT NOT NULL CHECK (medium IN ('sms', 'email')),
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public holidays and weekends for attendance validation
CREATE TABLE holidays (
    holiday_date DATE PRIMARY KEY,
    name TEXT NOT NULL,
    is_public_holiday BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System key-value settings used by admin dashboard and alerts
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_student_assignments_student ON student_class_assignments(student_id);
CREATE INDEX idx_attendance_sheets_date ON attendance_sheets(attendance_date);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX idx_term_tests_student ON term_tests(student_id);
CREATE INDEX idx_term_marks_reviews_student ON term_marks_reviews(student_id);
