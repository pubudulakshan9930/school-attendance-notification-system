-- Migration: add term marks review and approval workflow

CREATE TABLE IF NOT EXISTS term_marks_reviews (
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

CREATE INDEX IF NOT EXISTS idx_term_marks_reviews_student
    ON term_marks_reviews(student_id);