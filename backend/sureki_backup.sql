--
-- PostgreSQL database dump
--

\restrict gd6bdAkRTAUqgEQydIRfUjll0VS39L6gnpllayYeuCZ2SpRqdgWwcMLXkNJVmTu

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    attendance_sheet_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status text NOT NULL,
    reason text,
    marked_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_records_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text])))
);


ALTER TABLE public.attendance_records OWNER TO postgres;

--
-- Name: attendance_sheets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_sheets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    class_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    attendance_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_notified boolean DEFAULT false,
    notified_at timestamp with time zone
);


ALTER TABLE public.attendance_sheets OWNER TO postgres;

--
-- Name: backup_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_logs (
    id integer NOT NULL,
    backup_name character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size_bytes bigint DEFAULT 0,
    status character varying(30) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    restored_at timestamp without time zone
);


ALTER TABLE public.backup_logs OWNER TO postgres;

--
-- Name: backup_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.backup_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.backup_logs_id_seq OWNER TO postgres;

--
-- Name: backup_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.backup_logs_id_seq OWNED BY public.backup_logs.id;


--
-- Name: class_subject_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_subject_plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    grade smallint NOT NULL,
    stream text DEFAULT ''::text NOT NULL,
    fixed_subjects text DEFAULT ''::text NOT NULL,
    language_options text DEFAULT 'Sinhala,Tamil'::text NOT NULL,
    religion_options text DEFAULT 'Buddhism,Hindu,Catholic,Islam'::text NOT NULL,
    elective_category_1_options text DEFAULT ''::text NOT NULL,
    elective_category_2_options text DEFAULT ''::text NOT NULL,
    elective_category_3_options text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT class_subject_plans_grade_check CHECK (((grade >= 1) AND (grade <= 13))),
    CONSTRAINT class_subject_plans_stream_check CHECK ((stream = ANY (ARRAY[''::text, 'science'::text, 'biological'::text, 'mathematical'::text, 'art'::text])))
);


ALTER TABLE public.class_subject_plans OWNER TO postgres;

--
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    grade smallint NOT NULL,
    section text NOT NULL,
    academic_year smallint NOT NULL,
    teacher_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stream text DEFAULT ''::text NOT NULL,
    max_students smallint DEFAULT 40 NOT NULL,
    CONSTRAINT classes_grade_check CHECK (((grade >= 1) AND (grade <= 13))),
    CONSTRAINT classes_max_students_check CHECK (((max_students >= 1) AND (max_students <= 200))),
    CONSTRAINT classes_stream_check CHECK ((stream = ANY (ARRAY[''::text, 'science'::text, 'mathematical'::text])))
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    holiday_date date NOT NULL,
    name text NOT NULL,
    is_public_holiday boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    notification_type text NOT NULL,
    medium text NOT NULL,
    recipient text NOT NULL,
    message text NOT NULL,
    status text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_logs_medium_check CHECK ((medium = ANY (ARRAY['sms'::text, 'email'::text]))),
    CONSTRAINT notification_logs_notification_type_check CHECK ((notification_type = ANY (ARRAY['attendance'::text, 'term_test'::text, 'registration'::text])))
);


ALTER TABLE public.notification_logs OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: student_class_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_class_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    assigned_at date DEFAULT CURRENT_DATE NOT NULL,
    removed_at date
);


ALTER TABLE public.student_class_assignments OWNER TO postgres;

--
-- Name: student_subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_subjects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    is_elective boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_subjects OWNER TO postgres;

--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    full_name text NOT NULL,
    parent_name text NOT NULL,
    parent_phone text NOT NULL,
    parent_email text,
    student_code text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    city text,
    address text,
    gender text
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    subject_group text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subjects_subject_group_check CHECK ((subject_group = ANY (ARRAY['compulsory'::text, 'elective'::text])))
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: teacher_password_reset_otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher_password_reset_otps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    teacher_id uuid NOT NULL,
    otp_code character varying(6) NOT NULL,
    otp_expires_at timestamp with time zone NOT NULL,
    otp_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.teacher_password_reset_otps OWNER TO postgres;

--
-- Name: term_class_marks_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.term_class_marks_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    class_id uuid NOT NULL,
    term smallint NOT NULL,
    academic_year smallint NOT NULL,
    review_status text DEFAULT 'pending'::text NOT NULL,
    admin_notified_at timestamp with time zone,
    admin_notification_error text,
    approved_by uuid,
    approved_at timestamp with time zone,
    parent_sms_status text DEFAULT 'pending'::text NOT NULL,
    parent_sms_sent_at timestamp with time zone,
    parent_sms_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT term_class_marks_reviews_parent_sms_status_check CHECK ((parent_sms_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT term_class_marks_reviews_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'notified'::text, 'approved'::text]))),
    CONSTRAINT term_class_marks_reviews_term_check CHECK ((term = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE public.term_class_marks_reviews OWNER TO postgres;

--
-- Name: term_marks_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.term_marks_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    term smallint NOT NULL,
    academic_year smallint NOT NULL,
    review_status text DEFAULT 'pending'::text NOT NULL,
    admin_notified_at timestamp with time zone,
    admin_notification_error text,
    approved_by uuid,
    approved_at timestamp with time zone,
    parent_sms_status text DEFAULT 'pending'::text NOT NULL,
    parent_sms_sent_at timestamp with time zone,
    parent_sms_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT term_marks_reviews_parent_sms_status_check CHECK ((parent_sms_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT term_marks_reviews_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'notified'::text, 'approved'::text]))),
    CONSTRAINT term_marks_reviews_term_check CHECK ((term = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE public.term_marks_reviews OWNER TO postgres;

--
-- Name: term_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.term_tests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    term smallint NOT NULL,
    academic_year smallint NOT NULL,
    subject_id uuid NOT NULL,
    mark numeric(5,2) NOT NULL,
    exam_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT term_tests_mark_check CHECK (((mark >= (0)::numeric) AND (mark <= (100)::numeric))),
    CONSTRAINT term_tests_term_check CHECK ((term = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE public.term_tests OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role text NOT NULL,
    full_name text NOT NULL,
    login_id text NOT NULL,
    email text,
    phone text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    teacher_code text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'teacher'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: backup_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_logs ALTER COLUMN id SET DEFAULT nextval('public.backup_logs_id_seq'::regclass);


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_records (id, attendance_sheet_id, student_id, status, reason, marked_at) FROM stdin;
f8ae993e-5f74-41e1-8726-c2c7c3caf690	77405480-dc1b-46b1-9f22-a0dadcbc0699	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	present	\N	2026-05-06 14:33:34.075282+05:30
d0497df3-c05a-430a-b0a4-1a712d875866	19a13684-a896-49f6-8f44-48a4af8da717	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	present	\N	2026-05-14 12:04:36.55148+05:30
5c107bc9-31c0-4eec-862b-a59b6e57337a	19a13684-a896-49f6-8f44-48a4af8da717	db2737be-154b-4e11-961a-f605558ef0eb	present	\N	2026-05-14 12:04:36.55148+05:30
44e771a0-1b9f-4a62-b6b0-6b914cbfe555	19a13684-a896-49f6-8f44-48a4af8da717	186e3d3e-396c-411c-9ed0-8b19aa596e15	present	\N	2026-05-14 12:04:36.55148+05:30
071aea38-107a-45c9-9824-a42fc2b195a2	19a13684-a896-49f6-8f44-48a4af8da717	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	absent	\N	2026-05-14 12:04:36.55148+05:30
664bd533-1468-4c4f-bb6d-4f17aae43989	19a13684-a896-49f6-8f44-48a4af8da717	2da0cce0-e401-4a70-b12c-bfaf452c6593	absent	\N	2026-05-14 12:04:36.55148+05:30
58b94547-33c6-4660-8b5f-5dbb6afda7bf	19a13684-a896-49f6-8f44-48a4af8da717	adbe2730-fe44-44ac-bee9-f8888cf50569	present	\N	2026-05-14 12:04:36.55148+05:30
336e3ec1-1c68-4241-aafd-30571df46689	19a13684-a896-49f6-8f44-48a4af8da717	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	present	\N	2026-05-14 12:04:36.55148+05:30
fa336ceb-3b20-44f6-a4bd-d02291941e1d	19a13684-a896-49f6-8f44-48a4af8da717	e3ded0b9-e857-4b32-83b9-7c167372a544	present	\N	2026-05-14 12:04:36.55148+05:30
0c2a00a0-94fd-4903-aa13-29c8b52983d2	19a13684-a896-49f6-8f44-48a4af8da717	3870b309-9c01-4c72-af60-1338fc95f35d	absent	\N	2026-05-14 12:04:36.55148+05:30
fdfb8198-66cb-4bba-bbd7-5103d7f23a51	19a13684-a896-49f6-8f44-48a4af8da717	93667668-78ac-408a-a626-267a7d2607ab	present	\N	2026-05-14 12:04:36.55148+05:30
b690b906-8b2d-426f-9e07-5ece1f62ee48	19a13684-a896-49f6-8f44-48a4af8da717	0314a791-ea42-429e-a632-38e8dd8ecdde	present	\N	2026-05-14 12:04:36.55148+05:30
c8af99fe-7b7d-424c-97f5-62c3bf155eca	19a13684-a896-49f6-8f44-48a4af8da717	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	present	\N	2026-05-14 12:04:36.55148+05:30
d538167f-d590-4d3f-b64b-e09059352128	19a13684-a896-49f6-8f44-48a4af8da717	a50e217d-21ce-415d-8035-c37b3cf89a71	present	\N	2026-05-14 12:04:36.55148+05:30
7a3cd563-6457-4af6-a4b2-652d9eb42c6b	450cdced-1355-4287-94cc-ae6a42acfb9d	286385dc-7884-42da-992f-6891fd1bccb5	absent	\N	2026-05-20 17:34:51.445177+05:30
728af7f6-3912-435d-907d-64618371f634	450cdced-1355-4287-94cc-ae6a42acfb9d	9e271530-fd95-4be5-819d-a534e09a83c3	present	\N	2026-05-20 17:34:51.445177+05:30
d9b40d0a-344b-442a-b950-4b792a9bb993	6662c896-a61a-4c70-b7df-19433b4c87a3	286385dc-7884-42da-992f-6891fd1bccb5	present	\N	2026-05-21 14:13:01.073352+05:30
0ea6fffc-5018-482a-b8df-9512d122d3b8	6662c896-a61a-4c70-b7df-19433b4c87a3	9e271530-fd95-4be5-819d-a534e09a83c3	absent	\N	2026-05-21 14:13:01.073352+05:30
1c416f9f-ce01-431e-ba27-a187e8876449	31428677-b2a9-4f69-b168-86b9e1d5da1f	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	present	\N	2026-05-20 17:14:52.127756+05:30
89522df2-7cb9-4085-9fb3-98978f29333d	9bfc8c18-768d-4a4c-b9f7-1911b09e168c	b47af724-c5f2-4b30-b5c1-9add8ca43645	present	\N	2026-05-14 21:49:07.447929+05:30
88e2d201-1fde-4d3c-af6e-6c4ff717dc41	9bfc8c18-768d-4a4c-b9f7-1911b09e168c	00999c6b-5480-499d-9e70-a99987eb9d64	absent	\N	2026-05-14 21:49:07.447929+05:30
7e7e3240-ad88-4f71-9ecd-077023ca65a0	9bfc8c18-768d-4a4c-b9f7-1911b09e168c	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	absent	\N	2026-05-14 21:49:07.447929+05:30
cabc0ae0-a902-49fe-85c6-fc739944cd5e	9bfc8c18-768d-4a4c-b9f7-1911b09e168c	5e956353-c70e-4433-aa21-cf0a9bcf3602	present	\N	2026-05-14 21:49:07.447929+05:30
12e76f29-401f-4a1b-8a72-acedf4a136d7	9bfc8c18-768d-4a4c-b9f7-1911b09e168c	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	absent	\N	2026-05-14 21:49:07.447929+05:30
3501d221-7826-44bd-a0a7-6e76b65c2aec	9bfc8c18-768d-4a4c-b9f7-1911b09e168c	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	absent	\N	2026-05-14 21:49:07.447929+05:30
ecba5d97-1879-4f50-b443-941d7fb09661	f81da29f-0664-4854-96c3-3bbfed4e092e	b47af724-c5f2-4b30-b5c1-9add8ca43645	present	\N	2026-05-15 11:05:31.342076+05:30
7becbe1f-43b5-4f04-a2a1-41478eb5f447	f81da29f-0664-4854-96c3-3bbfed4e092e	00999c6b-5480-499d-9e70-a99987eb9d64	absent	\N	2026-05-15 11:05:31.342076+05:30
1cd571c9-aad1-4769-9424-81e0c1441b66	f81da29f-0664-4854-96c3-3bbfed4e092e	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	absent	\N	2026-05-15 11:05:31.342076+05:30
6c3ce719-fec3-45a3-8eb8-a1dd8add14aa	f81da29f-0664-4854-96c3-3bbfed4e092e	5e956353-c70e-4433-aa21-cf0a9bcf3602	present	\N	2026-05-15 11:05:31.342076+05:30
a52c3cd6-8f8d-48b7-930a-af30308aed7e	f81da29f-0664-4854-96c3-3bbfed4e092e	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	present	\N	2026-05-15 11:05:31.342076+05:30
068b4fbb-1189-4f16-af89-d4b131385522	f81da29f-0664-4854-96c3-3bbfed4e092e	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	late	transport issue	2026-05-15 11:05:31.342076+05:30
907e65d7-61e8-4b94-b174-8625de9fad19	8b052714-1896-4525-adbc-661ee9d405bd	742d2ddc-aa8a-4090-aebd-4af2df9821f5	present	\N	2026-05-15 18:41:17.19205+05:30
6347919f-c203-4667-b93e-546eda3acfe9	8b052714-1896-4525-adbc-661ee9d405bd	7ad6633e-67bd-429c-8440-f0d9ffb52c79	absent	\N	2026-05-15 18:41:17.19205+05:30
c4a6e9c3-5f07-4661-91a1-b74bba88aac2	8b052714-1896-4525-adbc-661ee9d405bd	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	present	\N	2026-05-15 18:41:17.19205+05:30
975134ec-3fff-42ad-82e5-24bff610dfd8	8b052714-1896-4525-adbc-661ee9d405bd	4537a978-3748-49c4-bef2-8e95a922e0df	present	\N	2026-05-15 18:41:17.19205+05:30
d7fd355b-f331-43c7-bb0e-531f0d9aebe9	8b052714-1896-4525-adbc-661ee9d405bd	cdd0fae5-dbda-4df3-a312-61c7e6974419	present	\N	2026-05-15 18:41:17.19205+05:30
6da43d05-1b05-4f7e-bdb6-5abc48a33a28	8b052714-1896-4525-adbc-661ee9d405bd	b2540f04-3218-465c-9c23-c61dc3c7b1fb	present	\N	2026-05-15 18:41:17.19205+05:30
3b8c315e-f621-42bf-a095-a75d285e755d	8b052714-1896-4525-adbc-661ee9d405bd	a6a60d97-3011-49c5-ae68-a11ade339992	present	\N	2026-05-15 18:41:17.19205+05:30
81a8fb8a-6e14-4e14-94e2-bd48f6450206	8b052714-1896-4525-adbc-661ee9d405bd	83db7a74-a6fa-488b-bd32-cd5af189bbd8	present	\N	2026-05-15 18:41:17.19205+05:30
1abfc5b0-0eba-4e82-90fe-9e04bac50d82	8b052714-1896-4525-adbc-661ee9d405bd	75e7cc1e-02df-46c8-8235-7e0d43a4f520	present	\N	2026-05-15 18:41:17.19205+05:30
d525fa22-88d3-4be7-b183-ca176fa5ed90	8b052714-1896-4525-adbc-661ee9d405bd	60a28492-4654-4cbb-98fc-b1c49ca1303c	absent	\N	2026-05-15 18:41:17.19205+05:30
7977e157-1ff6-48db-b4eb-9adfdfd273b1	8b052714-1896-4525-adbc-661ee9d405bd	0351f9a0-303c-4504-8941-ee3e1a1c592f	absent	\N	2026-05-15 18:41:17.19205+05:30
66f09de9-bea0-41b7-9361-ec987a17f37e	8b052714-1896-4525-adbc-661ee9d405bd	71d4ec30-abdb-4dff-a672-47b47604f20e	absent	\N	2026-05-15 18:41:17.19205+05:30
1f5eb789-e7fb-4681-8d87-16a7e09023a6	8b052714-1896-4525-adbc-661ee9d405bd	e25d2a9a-fdba-4864-bb94-013daa7e5de0	absent	\N	2026-05-15 18:41:17.19205+05:30
06b8369a-88f9-4697-b709-128ee9cf53ec	8b052714-1896-4525-adbc-661ee9d405bd	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	absent	\N	2026-05-15 18:41:17.19205+05:30
4126618b-cc40-4464-82b4-1a3a9f924b5e	8b052714-1896-4525-adbc-661ee9d405bd	aa18c05c-e280-453c-a87f-a368f8ad7de9	absent	\N	2026-05-15 18:41:17.19205+05:30
d55d8d50-e046-47f3-a2e4-64ba32cd1c1b	8b052714-1896-4525-adbc-661ee9d405bd	b4d82430-3e05-48a3-8f7d-28c94446aa00	absent	\N	2026-05-15 18:41:17.19205+05:30
53d2fae5-ad5f-415a-8439-13127cda712b	8b052714-1896-4525-adbc-661ee9d405bd	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	absent	\N	2026-05-15 18:41:17.19205+05:30
a7ff43d7-9810-42c0-834b-6809a24880c1	8b052714-1896-4525-adbc-661ee9d405bd	583eb113-b74f-49f6-a0ba-cfb50dae6699	absent	\N	2026-05-15 18:41:17.19205+05:30
de0808e0-5243-48a8-a5d0-d898503ac263	8b052714-1896-4525-adbc-661ee9d405bd	bb813af3-4184-4512-bb63-32fba48db8a0	absent	\N	2026-05-15 18:41:17.19205+05:30
c4a50416-b8e1-4341-914e-ae7745f8f8bc	8b052714-1896-4525-adbc-661ee9d405bd	9029eb7c-ace9-41e8-a889-d92468fe16cd	absent	\N	2026-05-15 18:41:17.19205+05:30
653c4eaf-2763-484a-9623-6ee69a3bd54a	8b052714-1896-4525-adbc-661ee9d405bd	ea289faa-0c02-495a-923c-049ff2c481a6	absent	\N	2026-05-15 18:41:17.19205+05:30
57b02984-4e63-4b97-9715-af0c80c2f52c	8b052714-1896-4525-adbc-661ee9d405bd	1534d25e-7fac-483a-9c8b-bccacdf111f0	absent	\N	2026-05-15 18:41:17.19205+05:30
04f53fba-4abf-44ad-b66b-00dac0620d4f	8b052714-1896-4525-adbc-661ee9d405bd	8251e1df-58ea-4d12-b02e-3062e78df907	absent	\N	2026-05-15 18:41:17.19205+05:30
d662f388-c248-4736-a7e1-871172e96ecb	8b052714-1896-4525-adbc-661ee9d405bd	ea3a30af-37a6-43e5-ade7-a7323f267787	absent	\N	2026-05-15 18:41:17.19205+05:30
5cda7aa6-bcc8-4707-b4a0-c7a9318d8b66	8b052714-1896-4525-adbc-661ee9d405bd	e8decff2-9160-4569-ac1d-711423e514a9	absent	\N	2026-05-15 18:41:17.19205+05:30
17d44822-82ce-444d-9471-50e66e781103	8b052714-1896-4525-adbc-661ee9d405bd	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	absent	\N	2026-05-15 18:41:17.19205+05:30
b1d472e9-e56e-4915-a28f-13625b11de59	8b052714-1896-4525-adbc-661ee9d405bd	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	absent	\N	2026-05-15 18:41:17.19205+05:30
38ba4669-ce90-47d0-845f-2d9d8d09e3e2	8b052714-1896-4525-adbc-661ee9d405bd	7f54343e-a2c5-4acf-acd9-87c519f072c8	absent	\N	2026-05-15 18:41:17.19205+05:30
b2d0b507-aad5-4cca-9047-92914061498e	8b052714-1896-4525-adbc-661ee9d405bd	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	absent	\N	2026-05-15 18:41:17.19205+05:30
948a834c-7596-43d3-b182-7c8ad4d8ddaf	8b052714-1896-4525-adbc-661ee9d405bd	845cf7b4-50ec-45ae-bfd9-6d669c02f537	present	\N	2026-05-15 18:41:17.19205+05:30
473f4a9d-b72d-4240-9092-de13b0f8aab3	8b052714-1896-4525-adbc-661ee9d405bd	d730bf85-51ee-486b-a05f-b5e9feb19768	present	\N	2026-05-15 18:41:17.19205+05:30
6540d461-1102-4cbe-a560-b1bdaa49afac	8b052714-1896-4525-adbc-661ee9d405bd	3c288a85-886b-4e7d-a721-7244770314f5	present	\N	2026-05-15 18:41:17.19205+05:30
118c8840-5386-470e-bea6-80b11d23e001	8b052714-1896-4525-adbc-661ee9d405bd	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	present	\N	2026-05-15 18:41:17.19205+05:30
f03f14fa-90f1-4e29-9a37-df4e414f568a	8b052714-1896-4525-adbc-661ee9d405bd	bd0a9878-cf3f-40e8-889f-c0f4ec694135	present	\N	2026-05-15 18:41:17.19205+05:30
0d9e98a4-cb5f-4301-9db8-baa140d60c7c	8b052714-1896-4525-adbc-661ee9d405bd	d1edde10-3f65-4719-bcd3-78559468e971	present	\N	2026-05-15 18:41:17.19205+05:30
abf9c2d1-cb85-4d92-b1cf-ca625e851ecc	8b052714-1896-4525-adbc-661ee9d405bd	3960abbd-b2fc-4ecc-ba9f-965b756be518	present	\N	2026-05-15 18:41:17.19205+05:30
b1939461-b7be-4285-ad15-ec2b223e421c	8b052714-1896-4525-adbc-661ee9d405bd	74fe90b4-501f-4458-be0b-bcc42f08df21	present	\N	2026-05-15 18:41:17.19205+05:30
79684b4f-774b-4562-9dde-5a444e1af631	8b052714-1896-4525-adbc-661ee9d405bd	3431c363-c8e1-4e66-9d56-b5eb0cda9723	absent	\N	2026-05-15 18:41:17.19205+05:30
c10be957-d14c-4e5f-9e4d-c747b26278c4	8b052714-1896-4525-adbc-661ee9d405bd	bf0a7707-1978-4a11-a011-4de82a53161f	absent	\N	2026-05-15 18:41:17.19205+05:30
fa0c9ecc-cded-4f87-993e-4b156c748330	8b052714-1896-4525-adbc-661ee9d405bd	4effd2d5-edf7-408f-8dc9-53705a2e2255	present	\N	2026-05-15 18:41:17.19205+05:30
8bbedd74-6fb5-48de-ae04-497288562ddb	31428677-b2a9-4f69-b168-86b9e1d5da1f	5e956353-c70e-4433-aa21-cf0a9bcf3602	present	\N	2026-05-20 17:14:52.127756+05:30
8b20f6c4-b5c3-444b-be81-c098bce63e42	31428677-b2a9-4f69-b168-86b9e1d5da1f	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	absent	\N	2026-05-20 17:14:52.127756+05:30
12987ef1-53e5-42bf-bd47-6b8e4ddef1e9	31428677-b2a9-4f69-b168-86b9e1d5da1f	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	absent	\N	2026-05-20 17:14:52.127756+05:30
a038271a-4c71-4ec3-aa4b-584a1a72149a	d17efe7b-88c8-45ec-8438-29f8d8e04b7b	53d675a4-a5b1-4f09-8034-e00cbd9a460c	absent	\N	2026-05-20 17:21:36.22013+05:30
f5d5a31a-0490-4f1f-8ab6-1450601eedcf	a7a1acb0-aef3-418d-a521-7720b1256c9f	53d675a4-a5b1-4f09-8034-e00cbd9a460c	present	\N	2026-07-06 09:21:37.024287+05:30
bddb51a2-10c2-454e-b824-9e38052f64d0	a7a1acb0-aef3-418d-a521-7720b1256c9f	eb48778c-f7c9-4361-be6f-8d9a2eccab19	absent	\N	2026-07-06 09:21:37.024287+05:30
7028918c-e3f7-4463-9c62-ec89ed57232f	31428677-b2a9-4f69-b168-86b9e1d5da1f	b47af724-c5f2-4b30-b5c1-9add8ca43645	absent	\N	2026-05-20 17:14:52.127756+05:30
f07b7937-de07-44e5-a0bf-c90f1804b7ef	31428677-b2a9-4f69-b168-86b9e1d5da1f	00999c6b-5480-499d-9e70-a99987eb9d64	present	\N	2026-05-20 17:14:52.127756+05:30
cf77cdf6-8018-46dc-b742-9cceaca9057a	a7a1acb0-aef3-418d-a521-7720b1256c9f	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	present	\N	2026-07-06 09:21:37.024287+05:30
f989a541-6197-4551-9cda-212248ba0e80	a7a1acb0-aef3-418d-a521-7720b1256c9f	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	late	Transport Issues	2026-07-06 09:21:37.024287+05:30
f69e8294-4ffa-4419-a598-b9befbb42cbd	a7a1acb0-aef3-418d-a521-7720b1256c9f	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	absent	\N	2026-07-06 09:21:37.024287+05:30
0ebbbbbc-a480-46cd-bf76-0c51d5b4a7ff	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	b28be76a-b92a-4165-a570-502cfd236b57	present	\N	2026-07-07 10:27:23.895957+05:30
3dacdaf7-01ac-4086-971e-9ce2fc9ad357	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	present	\N	2026-07-07 10:27:23.895957+05:30
8464e260-0768-4fca-8838-e75123573e3d	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	d875c077-b63e-4ed4-ae80-2e489074f7b7	late	Transport Issues	2026-07-07 10:27:23.895957+05:30
9ed44096-3f05-4693-88b3-f95cbb3e3104	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	43b82bf1-7e23-4c2c-aaca-321b74de92c4	present	\N	2026-07-07 10:27:23.895957+05:30
de415731-7735-4b12-a993-882bfca8a5c0	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	fd83d560-17d1-4063-89e4-b0e56bf19b39	absent	\N	2026-07-07 10:27:23.895957+05:30
899f6363-7dff-4f0e-81d7-e9ea87e3ca33	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	present	\N	2026-07-07 10:27:23.895957+05:30
05107a10-5d8d-499a-ba25-13b351a52eba	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	a1438d43-6950-4284-882e-a2f24f725c22	present	\N	2026-07-07 10:27:23.895957+05:30
1815ed42-1eee-4f7d-bb8e-adbe13cbb7b4	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	9489fc67-83b4-4c5e-91e4-657967153e6f	present	\N	2026-07-07 10:27:23.895957+05:30
05feded3-aaba-492c-95d2-43d64bd85d04	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	69ddd74f-769e-4225-bf84-6fe36504a018	present	\N	2026-07-07 10:27:23.895957+05:30
d9c589c5-3804-4259-884f-fdc5a95252f9	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	6c59b04c-50e9-4c78-9802-55e11789511f	absent	\N	2026-07-07 10:27:23.895957+05:30
27dfac29-2413-412d-be8b-549d4fc727eb	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	f79df6f8-c599-4767-803a-3fa522f7e538	present	\N	2026-07-07 10:27:23.895957+05:30
ff83ab78-a03e-4b46-8b1f-7893d879af75	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	22237097-4cab-4b29-8000-d6fc35341589	present	\N	2026-07-07 10:27:23.895957+05:30
e0999c34-886d-4827-a991-74ffd78828e3	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	present	\N	2026-07-07 10:27:23.895957+05:30
e48f2a64-fef1-450d-907f-0d256cee0607	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	01d86598-3dc3-4b11-974a-d229fb4b6af5	present	\N	2026-07-07 10:27:23.895957+05:30
865cf5a1-187d-4ca6-bdba-4c74a3e92921	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	76fa6ddc-f8a9-4159-a844-1a717ed3bc29	present	\N	2026-07-07 10:27:23.895957+05:30
2b26548e-4a9b-49d3-b554-a09c2d5f812b	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	5e245f6a-ad3a-4202-860e-60f2c0ba5c55	present	\N	2026-07-07 10:27:23.895957+05:30
063f54a2-ddfa-4372-9c84-656afc3cc50d	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	e4567f9f-d50e-4598-8e38-473c09467f6b	present	\N	2026-07-07 10:27:23.895957+05:30
c87b87ed-acec-46f5-959b-1d2075565dbb	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	17921d74-7486-4d11-98d9-448be5f04af4	present	\N	2026-07-07 10:27:23.895957+05:30
2caa59e9-f63d-49e1-b8d4-2ce89b48e0bf	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	85bfef6f-3286-4710-8317-7b71bee456d2	present	\N	2026-07-07 10:27:23.895957+05:30
3527f1d7-ec7d-4651-8c78-c7b24ed6abaa	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	8d944d69-764c-4af6-837b-e10e1b2fd533	present	\N	2026-07-07 10:27:23.895957+05:30
0e5263a6-4b87-4469-800e-7efe351bf657	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	dc4c4fcf-cd11-4824-a5fc-b33a2b440563	present	\N	2026-07-07 10:27:23.895957+05:30
e81be4b9-2e7d-4861-81be-3e9b6ec334de	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	2d58f4c5-44f0-4af8-872f-71f7bec32f12	present	\N	2026-07-07 10:27:23.895957+05:30
415041d6-efa4-431a-9ff9-da4f912003d4	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	d839e6c4-853f-43f2-87ef-ed49a6715999	present	\N	2026-07-07 10:27:23.895957+05:30
18528cd9-8767-43ed-85be-66ca9e8594e6	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	absent	\N	2026-07-07 10:27:23.895957+05:30
d4f272f2-f30a-4778-b805-cab0ee4439ab	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	821ebc49-8c56-4662-b5fe-dc7da1623cf5	present	\N	2026-07-07 10:27:23.895957+05:30
3c7ead03-01a0-406d-a908-a489bdb6d1be	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	b7cc526c-3425-4e94-b8eb-15b08e77ed8e	present	\N	2026-07-07 10:27:23.895957+05:30
33aaac90-49e3-4148-abb8-9dd7076544f5	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	3465cf1c-6a60-48a9-8409-5deaea64d19f	present	\N	2026-07-07 10:27:23.895957+05:30
d6b914d4-452e-4fc2-bba3-bc95ce4b9275	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	present	\N	2026-07-07 10:27:23.895957+05:30
ab953c6f-31e4-40f6-8b99-f8a27377d351	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	dbd310a9-cbd9-4e39-916f-280d88424395	present	\N	2026-07-07 10:27:23.895957+05:30
f38099d6-7c1f-4bf6-bb5a-974f15a2bf67	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	39b4f62a-e087-4eef-946d-f40dddde350d	present	\N	2026-07-07 10:27:23.895957+05:30
b205e124-4f37-4a4b-bd69-8004e842a31c	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	5fee4389-662f-4e8f-bc8c-54f0acc25920	present	\N	2026-07-07 10:27:23.895957+05:30
c0ce1578-a238-481c-8ef5-5f62af89b9d1	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	3e57df1b-6a5d-42c4-bf05-43232953ca09	present	\N	2026-07-07 10:27:23.895957+05:30
2dd91f3c-6942-4b2f-951e-d9c36c430c93	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	6c37736f-b10a-4262-8ae3-9dd9087e5099	late	Transport Issues	2026-07-07 10:27:23.895957+05:30
cffbe0cb-561b-42e9-911a-574c515a7ad1	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	d19da57c-0fe2-4445-9ee1-3666e15dc012	present	\N	2026-07-07 10:27:23.895957+05:30
ea7719f0-53de-46ac-b00c-1608b9abc3a3	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	ee855393-dc17-44e8-9851-76fe172f2c53	present	\N	2026-07-07 10:27:23.895957+05:30
721c9a8b-1d4e-4728-92f3-ce9f9bb5bcb5	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	ff07f896-ce93-4634-9be8-aa5caff17922	present	\N	2026-07-07 10:27:23.895957+05:30
eadcbc40-5e8b-471e-84fa-788f4806a8cb	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	acef1596-f9e7-46db-afff-ee5584022f4d	present	\N	2026-07-07 10:27:23.895957+05:30
40f68081-6967-4dc7-96f9-357a9f71aea4	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	7f72d70c-f822-4258-9c60-c49c3b518bb7	present	\N	2026-07-07 10:27:23.895957+05:30
59bbf05d-47ef-4f81-95da-efc126b99462	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	b29b84ed-5055-464e-b02d-75f7984db2cd	present	\N	2026-07-07 10:27:23.895957+05:30
ed545b15-8b3f-4023-ab16-6351f051eb4e	b921a7ac-7074-4824-9d2a-5ebe02cc6c81	dcd84cc3-984a-42fe-881b-884251662e6a	present	\N	2026-07-07 10:27:23.895957+05:30
566f08fe-b493-4470-9908-6d38d011e8c1	6680ec98-43a8-41c1-af6f-db5b79c411b7	53d675a4-a5b1-4f09-8034-e00cbd9a460c	present	\N	2026-07-07 10:27:56.083124+05:30
61869966-b1ee-4a92-a177-b96ff11b5e49	6680ec98-43a8-41c1-af6f-db5b79c411b7	eb48778c-f7c9-4361-be6f-8d9a2eccab19	present	\N	2026-07-07 10:27:56.083124+05:30
b518086f-6b51-40b2-aa89-2c02937c3548	6680ec98-43a8-41c1-af6f-db5b79c411b7	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	absent	\N	2026-07-07 10:27:56.083124+05:30
7a163935-3b97-4503-a3d4-c2065ae3cb09	6680ec98-43a8-41c1-af6f-db5b79c411b7	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	present	\N	2026-07-07 10:27:56.083124+05:30
e668252b-bd43-4e19-a16a-b411052daceb	6680ec98-43a8-41c1-af6f-db5b79c411b7	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	present	\N	2026-07-07 10:27:56.083124+05:30
7b52e965-0be0-4d19-b536-8dda0e634571	c9371808-5136-405e-9732-c3dc2ac9b4a7	7b6562b8-be72-4df1-a0b9-702c9ceec431	present	\N	2026-07-07 10:28:22.13588+05:30
23035dc1-822f-4e08-bd59-9cca2987d6ae	c9371808-5136-405e-9732-c3dc2ac9b4a7	f6a128a7-8725-4952-bd78-cf852e1846a8	present	\N	2026-07-07 10:28:22.13588+05:30
f82480cd-e623-4b97-80e3-cc459fe59678	81053a30-e9cf-41b5-9d82-6f064e36f152	742d2ddc-aa8a-4090-aebd-4af2df9821f5	present	\N	2026-07-07 10:31:56.023068+05:30
81b5ee78-339e-49f5-9f60-759f57be270d	81053a30-e9cf-41b5-9d82-6f064e36f152	7ad6633e-67bd-429c-8440-f0d9ffb52c79	present	\N	2026-07-07 10:31:56.023068+05:30
c2f820dc-d853-4467-beea-379bae4db4d2	81053a30-e9cf-41b5-9d82-6f064e36f152	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	present	\N	2026-07-07 10:31:56.023068+05:30
d985a5ae-ec1c-48b9-9d5d-d95b03bd3bed	81053a30-e9cf-41b5-9d82-6f064e36f152	4537a978-3748-49c4-bef2-8e95a922e0df	present	\N	2026-07-07 10:31:56.023068+05:30
6887364e-3b42-4919-973e-e8882cd2b340	81053a30-e9cf-41b5-9d82-6f064e36f152	cdd0fae5-dbda-4df3-a312-61c7e6974419	present	\N	2026-07-07 10:31:56.023068+05:30
55da03b1-fd15-4b29-b5bd-7b1534c2a92b	81053a30-e9cf-41b5-9d82-6f064e36f152	a6a60d97-3011-49c5-ae68-a11ade339992	absent	\N	2026-07-07 10:31:56.023068+05:30
8d981948-9c02-4e70-ab8f-b90d9c29ccd6	81053a30-e9cf-41b5-9d82-6f064e36f152	b2540f04-3218-465c-9c23-c61dc3c7b1fb	absent	\N	2026-07-07 10:31:56.023068+05:30
2a7c6944-5eb2-406a-bafd-d66a8da0eab1	81053a30-e9cf-41b5-9d82-6f064e36f152	83db7a74-a6fa-488b-bd32-cd5af189bbd8	present	\N	2026-07-07 10:31:56.023068+05:30
d81f7a1d-66e8-4152-acf6-72e710d59455	81053a30-e9cf-41b5-9d82-6f064e36f152	75e7cc1e-02df-46c8-8235-7e0d43a4f520	present	\N	2026-07-07 10:31:56.023068+05:30
40de2283-c68b-4d1c-ad64-d7f8f125d8ca	81053a30-e9cf-41b5-9d82-6f064e36f152	60a28492-4654-4cbb-98fc-b1c49ca1303c	absent	\N	2026-07-07 10:31:56.023068+05:30
1297c4ee-908c-46a9-999b-0b51b49bbb34	81053a30-e9cf-41b5-9d82-6f064e36f152	0351f9a0-303c-4504-8941-ee3e1a1c592f	absent	\N	2026-07-07 10:31:56.023068+05:30
41959f7d-bd6d-41a6-9380-188743ccab64	81053a30-e9cf-41b5-9d82-6f064e36f152	71d4ec30-abdb-4dff-a672-47b47604f20e	present	\N	2026-07-07 10:31:56.023068+05:30
53aa3db7-fd50-4424-93d2-b26509451482	81053a30-e9cf-41b5-9d82-6f064e36f152	e25d2a9a-fdba-4864-bb94-013daa7e5de0	present	\N	2026-07-07 10:31:56.023068+05:30
d6d517eb-9162-4c14-8d45-ae91832c9824	81053a30-e9cf-41b5-9d82-6f064e36f152	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	present	\N	2026-07-07 10:31:56.023068+05:30
7a682e8c-32b5-499f-b234-269d53ad5a9f	81053a30-e9cf-41b5-9d82-6f064e36f152	aa18c05c-e280-453c-a87f-a368f8ad7de9	present	\N	2026-07-07 10:31:56.023068+05:30
5b723f9e-4703-433f-84b2-d4347ff7e0fc	81053a30-e9cf-41b5-9d82-6f064e36f152	b4d82430-3e05-48a3-8f7d-28c94446aa00	present	\N	2026-07-07 10:31:56.023068+05:30
db7cf658-b238-491c-b4b1-6b6fbaf89998	81053a30-e9cf-41b5-9d82-6f064e36f152	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	present	\N	2026-07-07 10:31:56.023068+05:30
ac3e91a8-cb23-4e4e-9c17-e65f5e361dee	81053a30-e9cf-41b5-9d82-6f064e36f152	583eb113-b74f-49f6-a0ba-cfb50dae6699	present	\N	2026-07-07 10:31:56.023068+05:30
4f92cf98-9598-4f09-bb4b-063824f5135a	81053a30-e9cf-41b5-9d82-6f064e36f152	bb813af3-4184-4512-bb63-32fba48db8a0	present	\N	2026-07-07 10:31:56.023068+05:30
cd9a611e-8a24-425c-92cf-e14538f09d57	81053a30-e9cf-41b5-9d82-6f064e36f152	9029eb7c-ace9-41e8-a889-d92468fe16cd	present	\N	2026-07-07 10:31:56.023068+05:30
8e8f4139-9e0c-4e65-82e3-a2c8dbc057be	81053a30-e9cf-41b5-9d82-6f064e36f152	9a02ca9b-0234-4504-8ab5-2d4362f4d651	present	\N	2026-07-07 10:31:56.023068+05:30
94cdc8e7-0023-4f06-983d-7e04f39a7f15	81053a30-e9cf-41b5-9d82-6f064e36f152	ea289faa-0c02-495a-923c-049ff2c481a6	present	\N	2026-07-07 10:31:56.023068+05:30
6b70e598-c291-4cf6-853a-203d97c83e99	81053a30-e9cf-41b5-9d82-6f064e36f152	1534d25e-7fac-483a-9c8b-bccacdf111f0	present	\N	2026-07-07 10:31:56.023068+05:30
f68ae023-7775-4c2d-8dad-409f701668ae	81053a30-e9cf-41b5-9d82-6f064e36f152	8251e1df-58ea-4d12-b02e-3062e78df907	present	\N	2026-07-07 10:31:56.023068+05:30
a8b7f46e-c155-4725-b644-496bd66f4f5a	81053a30-e9cf-41b5-9d82-6f064e36f152	ea3a30af-37a6-43e5-ade7-a7323f267787	present	\N	2026-07-07 10:31:56.023068+05:30
d045e60f-ccfb-45cf-8cc3-1d03dc3c0914	81053a30-e9cf-41b5-9d82-6f064e36f152	e8decff2-9160-4569-ac1d-711423e514a9	present	\N	2026-07-07 10:31:56.023068+05:30
294db752-db27-4aeb-a484-1dcf5f74ad52	81053a30-e9cf-41b5-9d82-6f064e36f152	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	present	\N	2026-07-07 10:31:56.023068+05:30
c348bc48-8be1-411d-929a-0e7b65c59655	81053a30-e9cf-41b5-9d82-6f064e36f152	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	present	\N	2026-07-07 10:31:56.023068+05:30
ed3b2015-b03c-411f-bb47-78b943b83f6b	81053a30-e9cf-41b5-9d82-6f064e36f152	7f54343e-a2c5-4acf-acd9-87c519f072c8	present	\N	2026-07-07 10:31:56.023068+05:30
d48c215b-0fcb-415c-be31-efaa15842481	81053a30-e9cf-41b5-9d82-6f064e36f152	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	present	\N	2026-07-07 10:31:56.023068+05:30
5d464feb-454a-42d5-a537-00d6730d1eb7	81053a30-e9cf-41b5-9d82-6f064e36f152	845cf7b4-50ec-45ae-bfd9-6d669c02f537	present	\N	2026-07-07 10:31:56.023068+05:30
b6af7b3a-68a1-4a46-83db-88b5cef8a343	81053a30-e9cf-41b5-9d82-6f064e36f152	d730bf85-51ee-486b-a05f-b5e9feb19768	present	\N	2026-07-07 10:31:56.023068+05:30
508a8120-4a39-44aa-8ed2-bc2be7124c24	81053a30-e9cf-41b5-9d82-6f064e36f152	3c288a85-886b-4e7d-a721-7244770314f5	present	\N	2026-07-07 10:31:56.023068+05:30
ba9614c8-5ba0-43e9-be7c-0cc393991253	81053a30-e9cf-41b5-9d82-6f064e36f152	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	absent	\N	2026-07-07 10:31:56.023068+05:30
c0f67a68-f323-4344-914f-9b63e4ce66a7	81053a30-e9cf-41b5-9d82-6f064e36f152	bd0a9878-cf3f-40e8-889f-c0f4ec694135	present	\N	2026-07-07 10:31:56.023068+05:30
79846ca2-f99a-4369-a3a4-b9a5296f1374	81053a30-e9cf-41b5-9d82-6f064e36f152	d1edde10-3f65-4719-bcd3-78559468e971	present	\N	2026-07-07 10:31:56.023068+05:30
f23da44e-c086-4634-9285-f212df15b677	81053a30-e9cf-41b5-9d82-6f064e36f152	3960abbd-b2fc-4ecc-ba9f-965b756be518	present	\N	2026-07-07 10:31:56.023068+05:30
518df77d-41d1-449b-9425-3771f0e228a6	81053a30-e9cf-41b5-9d82-6f064e36f152	74fe90b4-501f-4458-be0b-bcc42f08df21	present	\N	2026-07-07 10:31:56.023068+05:30
fa92c3ef-b32e-44e7-9bff-b3e12a21a2e3	81053a30-e9cf-41b5-9d82-6f064e36f152	3431c363-c8e1-4e66-9d56-b5eb0cda9723	present	\N	2026-07-07 10:31:56.023068+05:30
2152fd15-8161-4e3f-9433-c955e0191e16	81053a30-e9cf-41b5-9d82-6f064e36f152	bf0a7707-1978-4a11-a011-4de82a53161f	absent	\N	2026-07-07 10:31:56.023068+05:30
cb38dcf7-3e32-4b50-b760-bf360f19d786	81053a30-e9cf-41b5-9d82-6f064e36f152	4effd2d5-edf7-408f-8dc9-53705a2e2255	present	\N	2026-07-07 10:31:56.023068+05:30
0450dad6-85b4-4b52-a9ba-f5f1b4f344b2	f9364389-fc69-4fe1-b59f-a2dd14f94826	53d675a4-a5b1-4f09-8034-e00cbd9a460c	present	\N	2026-07-08 09:46:47.787213+05:30
8dc1363b-83b6-479c-a492-857d3bd5865f	f9364389-fc69-4fe1-b59f-a2dd14f94826	eb48778c-f7c9-4361-be6f-8d9a2eccab19	present	\N	2026-07-08 09:46:47.787213+05:30
61e5b9c5-a4b4-4bd4-b357-c29071416631	f9364389-fc69-4fe1-b59f-a2dd14f94826	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	absent	\N	2026-07-08 09:46:47.787213+05:30
f5ab4ea3-a6e2-4d2b-9693-1f53c3dfcf42	f9364389-fc69-4fe1-b59f-a2dd14f94826	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	present	\N	2026-07-08 09:46:47.787213+05:30
3fd05163-4b1d-4647-9b0e-4b30c3fcac1d	f9364389-fc69-4fe1-b59f-a2dd14f94826	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	absent	\N	2026-07-08 09:46:47.787213+05:30
72616465-337b-4375-a526-ac3e922f5b77	18a31be5-acbb-4ec6-840c-f76f0bc5cf3e	b47af724-c5f2-4b30-b5c1-9add8ca43645	present	\N	2026-07-08 09:47:16.996249+05:30
f982de5e-9c4d-4b26-9afa-7680e606406a	18a31be5-acbb-4ec6-840c-f76f0bc5cf3e	00999c6b-5480-499d-9e70-a99987eb9d64	absent	\N	2026-07-08 09:47:16.996249+05:30
efba4caf-9703-4e0b-bbe7-ed5b1ed0ea62	18a31be5-acbb-4ec6-840c-f76f0bc5cf3e	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	absent	\N	2026-07-08 09:47:16.996249+05:30
eba61761-9d0b-4f92-ae54-1cf848b0936d	18a31be5-acbb-4ec6-840c-f76f0bc5cf3e	5e956353-c70e-4433-aa21-cf0a9bcf3602	present	\N	2026-07-08 09:47:16.996249+05:30
6a9557de-b11c-4391-9593-94f51e398016	18a31be5-acbb-4ec6-840c-f76f0bc5cf3e	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	absent	\N	2026-07-08 09:47:16.996249+05:30
23da2ef9-6a30-4c60-ba5d-5fb8e8a8cda7	18a31be5-acbb-4ec6-840c-f76f0bc5cf3e	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	present	\N	2026-07-08 09:47:16.996249+05:30
7a5afa17-3edd-4b72-8132-788fdab09cd3	21436a4e-e3b6-402a-81ea-56337f55588a	7b6562b8-be72-4df1-a0b9-702c9ceec431	present	\N	2026-07-08 09:47:37.695369+05:30
81eb39fd-10b1-4f5b-bc6a-8ad19190a0e2	21436a4e-e3b6-402a-81ea-56337f55588a	f6a128a7-8725-4952-bd78-cf852e1846a8	absent	\N	2026-07-08 09:47:37.695369+05:30
0e595be1-e6e5-4718-b2c8-46d4b6cac615	3a1c90d2-4bf3-42eb-970f-df3397e878e9	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	present	\N	2026-07-08 09:48:04.435981+05:30
f063a2dd-c37f-483a-a329-9e6161a3465c	3a1c90d2-4bf3-42eb-970f-df3397e878e9	b24a3354-4780-415a-9934-aebff21f9096	present	\N	2026-07-08 09:48:04.435981+05:30
f113ae1a-be84-4f5d-bb2c-0da78565c0ff	3a1c90d2-4bf3-42eb-970f-df3397e878e9	877deab2-5b88-4573-8fce-c4e52706b7e0	absent	\N	2026-07-08 09:48:04.435981+05:30
86e4da38-575b-4820-af5c-bf3b7268c277	3a1c90d2-4bf3-42eb-970f-df3397e878e9	af93e596-e524-4830-b1e6-78051eb850b6	present	\N	2026-07-08 09:48:04.435981+05:30
92635b0b-d1a2-4624-945a-5874f42838fd	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	present	\N	2026-07-08 09:51:44.690166+05:30
833cc498-463a-4314-9b29-b56d55459c5d	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	836fd154-cdfd-49f0-82eb-a55e67ec7406	present	\N	2026-07-08 09:51:44.690166+05:30
801a2931-d693-4372-994c-3e8d9f10ca50	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	db2737be-154b-4e11-961a-f605558ef0eb	present	\N	2026-07-08 09:51:44.690166+05:30
b753168b-a79d-4de1-b435-5fbf8f2eef43	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	186e3d3e-396c-411c-9ed0-8b19aa596e15	present	\N	2026-07-08 09:51:44.690166+05:30
9e147d18-73ec-497f-b8a0-3bcddb11b7a8	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	ac21cfd7-4584-466d-a740-eb25d6baca2d	absent	\N	2026-07-08 09:51:44.690166+05:30
48ffc3e3-a6b6-4035-8fd7-541ef5543737	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	absent	\N	2026-07-08 09:51:44.690166+05:30
4c3612af-accc-4c22-a785-5554a6ef33e5	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	2da0cce0-e401-4a70-b12c-bfaf452c6593	present	\N	2026-07-08 09:51:44.690166+05:30
fd9f6f2a-0d90-4cf5-84af-4947592f3b99	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	adbe2730-fe44-44ac-bee9-f8888cf50569	present	\N	2026-07-08 09:51:44.690166+05:30
7afcf690-7fb0-4372-afa6-14483f5b6467	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	d16622d3-5780-4188-b1d9-67254a2e59c2	absent	\N	2026-07-08 09:51:44.690166+05:30
844bd759-eb44-4d39-9e20-967b20e3fc52	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	present	\N	2026-07-08 09:51:44.690166+05:30
7c9d33b7-4bcd-480a-a6f8-fa46244dc4b2	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	5dd90925-434b-4342-9691-392bb979b295	present	\N	2026-07-08 09:51:44.690166+05:30
b38a590c-c9b7-4ebd-a031-ce7d590bc78a	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	present	\N	2026-07-08 09:51:44.690166+05:30
14c6e0b7-f1a1-4074-9066-4c71da071ca1	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	e3ded0b9-e857-4b32-83b9-7c167372a544	present	\N	2026-07-08 09:51:44.690166+05:30
b9afee60-fc10-456f-b2fe-04fa5848fa8e	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	93667668-78ac-408a-a626-267a7d2607ab	present	\N	2026-07-08 09:51:44.690166+05:30
05337776-1e40-409a-8609-3f25322a46d5	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	3870b309-9c01-4c72-af60-1338fc95f35d	absent	\N	2026-07-08 09:51:44.690166+05:30
c5248055-774a-471d-9f1d-6ee25b5fc7a3	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	0314a791-ea42-429e-a632-38e8dd8ecdde	absent	\N	2026-07-08 09:51:44.690166+05:30
c6a0ab38-cb58-48fb-aefe-27e4e0579cab	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	present	\N	2026-07-08 09:51:44.690166+05:30
521e8f69-ec07-43cd-8af0-e4e138691a75	610336c4-eb09-4f29-8fe8-6e48c44e2f8e	a50e217d-21ce-415d-8035-c37b3cf89a71	present	\N	2026-07-08 09:51:44.690166+05:30
57dd6449-2d57-4bd3-8de6-034987d14d8e	2b1a1f94-04bd-4d51-8c4b-e847700e26ca	b47af724-c5f2-4b30-b5c1-9add8ca43645	present	\N	2026-07-09 09:34:24.406099+05:30
7b85b19d-1b0b-48fe-9d4e-7a3dc1ecc534	2b1a1f94-04bd-4d51-8c4b-e847700e26ca	00999c6b-5480-499d-9e70-a99987eb9d64	present	\N	2026-07-09 09:34:24.406099+05:30
9dd56321-3e4c-415e-b6b6-2d827041730a	2b1a1f94-04bd-4d51-8c4b-e847700e26ca	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	late	Transport Issues	2026-07-09 09:34:24.406099+05:30
c49373ff-da64-44e8-963f-53593ef7ef22	2b1a1f94-04bd-4d51-8c4b-e847700e26ca	5e956353-c70e-4433-aa21-cf0a9bcf3602	absent	\N	2026-07-09 09:34:24.406099+05:30
3540c871-3535-4c1b-bf74-f471f97fc257	2b1a1f94-04bd-4d51-8c4b-e847700e26ca	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	absent	\N	2026-07-09 09:34:24.406099+05:30
c6adbc6b-ec8e-4d5d-bbf3-61b92b24fcf5	2b1a1f94-04bd-4d51-8c4b-e847700e26ca	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	absent	\N	2026-07-09 09:34:24.406099+05:30
dab6f7bf-fea2-4ffe-a776-10df21753208	6702179d-c02f-4ed2-bf7f-803dc27d4ad8	53d675a4-a5b1-4f09-8034-e00cbd9a460c	present	\N	2026-07-09 11:05:56.235287+05:30
0d83cfe5-17ad-4181-bd4e-c6562c5adced	6702179d-c02f-4ed2-bf7f-803dc27d4ad8	eb48778c-f7c9-4361-be6f-8d9a2eccab19	absent	\N	2026-07-09 11:05:56.235287+05:30
8a0682bb-4b48-4d98-accb-581e714f3a74	6702179d-c02f-4ed2-bf7f-803dc27d4ad8	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	absent	\N	2026-07-09 11:05:56.235287+05:30
8dd8948d-8624-4cb3-af22-89a2a6231dca	6702179d-c02f-4ed2-bf7f-803dc27d4ad8	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	absent	\N	2026-07-09 11:05:56.235287+05:30
a2ff1bb3-24c6-490d-8941-6b9751e70af4	6702179d-c02f-4ed2-bf7f-803dc27d4ad8	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	present	\N	2026-07-09 11:05:56.235287+05:30
8ff55272-4c13-4227-ae0b-756ff4005202	5c74c659-316b-401e-97cb-559fa885884c	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	present	\N	2026-07-09 11:07:15.299293+05:30
52f5664a-9fe8-43ef-838c-76df88a87a1c	5c74c659-316b-401e-97cb-559fa885884c	836fd154-cdfd-49f0-82eb-a55e67ec7406	absent	\N	2026-07-09 11:07:15.299293+05:30
ffbc4beb-8849-4eae-8933-2272d98d22ad	5c74c659-316b-401e-97cb-559fa885884c	db2737be-154b-4e11-961a-f605558ef0eb	present	\N	2026-07-09 11:07:15.299293+05:30
64d18871-6a7f-4503-be11-425d7882ad91	5c74c659-316b-401e-97cb-559fa885884c	186e3d3e-396c-411c-9ed0-8b19aa596e15	absent	\N	2026-07-09 11:07:15.299293+05:30
e4551c84-95f4-47c6-a6fd-180e2d2d49cd	5c74c659-316b-401e-97cb-559fa885884c	ac21cfd7-4584-466d-a740-eb25d6baca2d	absent	\N	2026-07-09 11:07:15.299293+05:30
966ca904-9220-4642-bb74-98bfea6c81cc	5c74c659-316b-401e-97cb-559fa885884c	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	present	\N	2026-07-09 11:07:15.299293+05:30
09774896-3403-46f3-b420-b491d7bfb9f8	5c74c659-316b-401e-97cb-559fa885884c	2da0cce0-e401-4a70-b12c-bfaf452c6593	present	\N	2026-07-09 11:07:15.299293+05:30
d8d06792-6bce-4e40-bb89-38b3a042c687	5c74c659-316b-401e-97cb-559fa885884c	adbe2730-fe44-44ac-bee9-f8888cf50569	present	\N	2026-07-09 11:07:15.299293+05:30
24a43e1d-2523-48d0-b253-8f7f7418a9ba	5c74c659-316b-401e-97cb-559fa885884c	d16622d3-5780-4188-b1d9-67254a2e59c2	present	\N	2026-07-09 11:07:15.299293+05:30
d72957cf-fcf5-4d7b-a5b1-e51098b23f4b	5c74c659-316b-401e-97cb-559fa885884c	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	absent	\N	2026-07-09 11:07:15.299293+05:30
e61e2305-530e-4fb7-a13d-b6e46a76579f	5c74c659-316b-401e-97cb-559fa885884c	5dd90925-434b-4342-9691-392bb979b295	present	\N	2026-07-09 11:07:15.299293+05:30
ada9374d-25e4-4e2f-bb18-8ec2496b22d1	5c74c659-316b-401e-97cb-559fa885884c	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	present	\N	2026-07-09 11:07:15.299293+05:30
b4ec37b1-0d96-4495-868a-1891747cfc14	5c74c659-316b-401e-97cb-559fa885884c	e3ded0b9-e857-4b32-83b9-7c167372a544	present	\N	2026-07-09 11:07:15.299293+05:30
229b2901-9362-4895-a5d8-24e4d03a7976	5c74c659-316b-401e-97cb-559fa885884c	93667668-78ac-408a-a626-267a7d2607ab	absent	\N	2026-07-09 11:07:15.299293+05:30
69375d16-46cb-43e6-bd43-ad8106141f67	5c74c659-316b-401e-97cb-559fa885884c	3870b309-9c01-4c72-af60-1338fc95f35d	absent	\N	2026-07-09 11:07:15.299293+05:30
d4b656a7-053d-4901-8d67-7b953988cf8e	5c74c659-316b-401e-97cb-559fa885884c	0314a791-ea42-429e-a632-38e8dd8ecdde	present	\N	2026-07-09 11:07:15.299293+05:30
e055b0b2-f63f-4e7e-af57-37c78846c037	5c74c659-316b-401e-97cb-559fa885884c	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	absent	\N	2026-07-09 11:07:15.299293+05:30
fb51ead1-f1a4-4edb-a821-2d9a7558f749	5c74c659-316b-401e-97cb-559fa885884c	a50e217d-21ce-415d-8035-c37b3cf89a71	present	\N	2026-07-09 11:07:15.299293+05:30
7bffc33c-4a7c-45be-9656-b1e528b6f1ef	d25dc90e-7736-4725-a1de-f8b4484d0a42	742d2ddc-aa8a-4090-aebd-4af2df9821f5	present	\N	2026-07-09 11:17:57.198746+05:30
3368c334-1656-4644-8858-4b8d4f872173	d25dc90e-7736-4725-a1de-f8b4484d0a42	7ad6633e-67bd-429c-8440-f0d9ffb52c79	present	\N	2026-07-09 11:17:57.198746+05:30
2412ca51-e8bb-43eb-8230-aa8a7b0bb500	d25dc90e-7736-4725-a1de-f8b4484d0a42	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	absent	\N	2026-07-09 11:17:57.198746+05:30
d4f00cda-e642-478c-a9e5-3b2a6ee401bb	d25dc90e-7736-4725-a1de-f8b4484d0a42	4537a978-3748-49c4-bef2-8e95a922e0df	present	\N	2026-07-09 11:17:57.198746+05:30
9f9bfc1f-288e-4894-92b6-d0a7a11c65ab	d25dc90e-7736-4725-a1de-f8b4484d0a42	cdd0fae5-dbda-4df3-a312-61c7e6974419	present	\N	2026-07-09 11:17:57.198746+05:30
9afe523f-5ba0-441d-ba82-68d9ffecb82b	d25dc90e-7736-4725-a1de-f8b4484d0a42	a6a60d97-3011-49c5-ae68-a11ade339992	absent	\N	2026-07-09 11:17:57.198746+05:30
ce6097b5-f157-4b43-9e8a-de960abdfb4d	d25dc90e-7736-4725-a1de-f8b4484d0a42	b2540f04-3218-465c-9c23-c61dc3c7b1fb	present	\N	2026-07-09 11:17:57.198746+05:30
1fd42e96-aaca-4fa4-bb1a-bd0c6ce78e36	d25dc90e-7736-4725-a1de-f8b4484d0a42	83db7a74-a6fa-488b-bd32-cd5af189bbd8	present	\N	2026-07-09 11:17:57.198746+05:30
9ba510c1-78ae-4c63-a7b4-b8b375491e24	d25dc90e-7736-4725-a1de-f8b4484d0a42	75e7cc1e-02df-46c8-8235-7e0d43a4f520	absent	\N	2026-07-09 11:17:57.198746+05:30
4849313c-e2b7-4f0e-ba76-acf3694c1143	d25dc90e-7736-4725-a1de-f8b4484d0a42	60a28492-4654-4cbb-98fc-b1c49ca1303c	absent	\N	2026-07-09 11:17:57.198746+05:30
ce0a40ea-c1ee-4e6c-a1a7-088d0e4133e9	d25dc90e-7736-4725-a1de-f8b4484d0a42	0351f9a0-303c-4504-8941-ee3e1a1c592f	absent	\N	2026-07-09 11:17:57.198746+05:30
fdfad539-4ee6-43df-a28d-54da05057f5b	d25dc90e-7736-4725-a1de-f8b4484d0a42	71d4ec30-abdb-4dff-a672-47b47604f20e	present	\N	2026-07-09 11:17:57.198746+05:30
7f424284-1019-4458-bd9f-fe2090cb5f12	d25dc90e-7736-4725-a1de-f8b4484d0a42	e25d2a9a-fdba-4864-bb94-013daa7e5de0	present	\N	2026-07-09 11:17:57.198746+05:30
ec0ecf1f-0b6d-4f11-8863-12e4216899c2	d25dc90e-7736-4725-a1de-f8b4484d0a42	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	absent	\N	2026-07-09 11:17:57.198746+05:30
59100306-025f-4612-8f11-a6d46807e44b	d25dc90e-7736-4725-a1de-f8b4484d0a42	aa18c05c-e280-453c-a87f-a368f8ad7de9	absent	\N	2026-07-09 11:17:57.198746+05:30
4e38b8d9-c894-4c7e-9505-6bea3659342f	d25dc90e-7736-4725-a1de-f8b4484d0a42	b4d82430-3e05-48a3-8f7d-28c94446aa00	absent	\N	2026-07-09 11:17:57.198746+05:30
22d7c284-ddf3-4b1b-997d-6d700dd137e7	d25dc90e-7736-4725-a1de-f8b4484d0a42	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	absent	\N	2026-07-09 11:17:57.198746+05:30
54eb25ee-d59f-4563-894d-aaca565ddf61	d25dc90e-7736-4725-a1de-f8b4484d0a42	583eb113-b74f-49f6-a0ba-cfb50dae6699	present	\N	2026-07-09 11:17:57.198746+05:30
a6cbdb87-60cb-4c33-b4ee-4d6e433574a0	d25dc90e-7736-4725-a1de-f8b4484d0a42	bb813af3-4184-4512-bb63-32fba48db8a0	present	\N	2026-07-09 11:17:57.198746+05:30
44720ba5-424a-4f25-9dc5-5f7f2001cbd5	d25dc90e-7736-4725-a1de-f8b4484d0a42	9029eb7c-ace9-41e8-a889-d92468fe16cd	present	\N	2026-07-09 11:17:57.198746+05:30
c0f75d2a-3d52-49ab-b32f-24352c56cfb4	d25dc90e-7736-4725-a1de-f8b4484d0a42	9a02ca9b-0234-4504-8ab5-2d4362f4d651	present	\N	2026-07-09 11:17:57.198746+05:30
e568da73-4550-4115-932a-2f5a7698d847	d25dc90e-7736-4725-a1de-f8b4484d0a42	ea289faa-0c02-495a-923c-049ff2c481a6	present	\N	2026-07-09 11:17:57.198746+05:30
130335c0-f320-47b4-8216-bad216471ada	d25dc90e-7736-4725-a1de-f8b4484d0a42	1534d25e-7fac-483a-9c8b-bccacdf111f0	present	\N	2026-07-09 11:17:57.198746+05:30
6dd2a6d3-c04e-4ed2-8917-8eeef9d9d385	d25dc90e-7736-4725-a1de-f8b4484d0a42	8251e1df-58ea-4d12-b02e-3062e78df907	present	\N	2026-07-09 11:17:57.198746+05:30
8d18b5c0-760d-4134-8f86-9ce8ea27c454	d25dc90e-7736-4725-a1de-f8b4484d0a42	ea3a30af-37a6-43e5-ade7-a7323f267787	absent	\N	2026-07-09 11:17:57.198746+05:30
957ad9ae-a5a0-48a7-bc62-efd8bf3ee2ef	d25dc90e-7736-4725-a1de-f8b4484d0a42	e8decff2-9160-4569-ac1d-711423e514a9	absent	\N	2026-07-09 11:17:57.198746+05:30
89d61700-24c2-433b-9479-c40c1245c62e	d25dc90e-7736-4725-a1de-f8b4484d0a42	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	present	\N	2026-07-09 11:17:57.198746+05:30
8612de55-d4cf-4559-866b-9f26d61cc625	d25dc90e-7736-4725-a1de-f8b4484d0a42	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	present	\N	2026-07-09 11:17:57.198746+05:30
f5d430fc-5560-425e-a7e0-77dbad942380	d25dc90e-7736-4725-a1de-f8b4484d0a42	7f54343e-a2c5-4acf-acd9-87c519f072c8	absent	\N	2026-07-09 11:17:57.198746+05:30
26e6c053-0cea-482c-a395-de90077ca737	d25dc90e-7736-4725-a1de-f8b4484d0a42	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	present	\N	2026-07-09 11:17:57.198746+05:30
3a2e2baf-720e-44b8-aecd-e079ed3c4d72	d25dc90e-7736-4725-a1de-f8b4484d0a42	845cf7b4-50ec-45ae-bfd9-6d669c02f537	absent	\N	2026-07-09 11:17:57.198746+05:30
49640abf-dabb-4157-9185-9cafab645f4b	d25dc90e-7736-4725-a1de-f8b4484d0a42	d730bf85-51ee-486b-a05f-b5e9feb19768	present	\N	2026-07-09 11:17:57.198746+05:30
8b6b94d2-c77d-4fe1-aa54-48fe0561d940	d25dc90e-7736-4725-a1de-f8b4484d0a42	3c288a85-886b-4e7d-a721-7244770314f5	present	\N	2026-07-09 11:17:57.198746+05:30
31972467-8260-41d9-8247-134e5e275aff	d25dc90e-7736-4725-a1de-f8b4484d0a42	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	present	\N	2026-07-09 11:17:57.198746+05:30
dc6fc1fa-681a-4e47-9922-4e6f4aed851a	d25dc90e-7736-4725-a1de-f8b4484d0a42	bd0a9878-cf3f-40e8-889f-c0f4ec694135	present	\N	2026-07-09 11:17:57.198746+05:30
ccba6fd5-b081-43dd-a916-5b487924575d	d25dc90e-7736-4725-a1de-f8b4484d0a42	d1edde10-3f65-4719-bcd3-78559468e971	present	\N	2026-07-09 11:17:57.198746+05:30
b4a43aea-000f-45d8-bd2d-d686f92e167d	d25dc90e-7736-4725-a1de-f8b4484d0a42	3960abbd-b2fc-4ecc-ba9f-965b756be518	absent	\N	2026-07-09 11:17:57.198746+05:30
dac87c4e-cbd0-4c15-81f3-cec00476c499	d25dc90e-7736-4725-a1de-f8b4484d0a42	74fe90b4-501f-4458-be0b-bcc42f08df21	present	\N	2026-07-09 11:17:57.198746+05:30
83344bac-37f1-424e-9726-9ffeebd52297	d25dc90e-7736-4725-a1de-f8b4484d0a42	3431c363-c8e1-4e66-9d56-b5eb0cda9723	present	\N	2026-07-09 11:17:57.198746+05:30
ea2af3b6-1c96-45a8-9474-74974490211b	d25dc90e-7736-4725-a1de-f8b4484d0a42	bf0a7707-1978-4a11-a011-4de82a53161f	present	\N	2026-07-09 11:17:57.198746+05:30
a51cbdbf-e3c9-4590-8ca3-0c170a6327e3	d25dc90e-7736-4725-a1de-f8b4484d0a42	4effd2d5-edf7-408f-8dc9-53705a2e2255	present	\N	2026-07-09 11:17:57.198746+05:30
\.


--
-- Data for Name: attendance_sheets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_sheets (id, class_id, teacher_id, attendance_date, created_at, updated_at, is_notified, notified_at) FROM stdin;
77405480-dc1b-46b1-9f22-a0dadcbc0699	828f4c08-6936-44db-be08-bf5507d5b0ed	8b8f5770-1217-47f4-982b-68fea944b6a2	2026-05-06	2026-05-06 14:33:34.075282+05:30	2026-05-06 14:33:34.075282+05:30	f	\N
19a13684-a896-49f6-8f44-48a4af8da717	828f4c08-6936-44db-be08-bf5507d5b0ed	8b8f5770-1217-47f4-982b-68fea944b6a2	2026-05-14	2026-05-14 12:04:36.55148+05:30	2026-05-14 12:04:36.55148+05:30	t	2026-05-14 21:54:23.850283+05:30
9bfc8c18-768d-4a4c-b9f7-1911b09e168c	64560975-90d7-409d-a04d-c3164438a794	70ed8260-d6df-4d85-8c40-a67e36d28e55	2026-05-14	2026-05-14 15:09:38.548787+05:30	2026-05-14 21:49:07.447929+05:30	t	2026-05-14 21:54:25.453537+05:30
f81da29f-0664-4854-96c3-3bbfed4e092e	64560975-90d7-409d-a04d-c3164438a794	70ed8260-d6df-4d85-8c40-a67e36d28e55	2026-05-15	2026-05-15 11:05:31.342076+05:30	2026-05-15 11:05:31.342076+05:30	t	2026-05-15 11:20:58.817813+05:30
8b052714-1896-4525-adbc-661ee9d405bd	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	60f8f109-15a2-4e2e-8617-37ab492fc1f3	2026-05-15	2026-05-15 18:41:17.19205+05:30	2026-05-15 18:41:17.19205+05:30	t	2026-05-15 22:00:52.139279+05:30
31428677-b2a9-4f69-b168-86b9e1d5da1f	64560975-90d7-409d-a04d-c3164438a794	70ed8260-d6df-4d85-8c40-a67e36d28e55	2026-05-20	2026-05-20 16:51:41.333267+05:30	2026-05-20 17:14:52.127756+05:30	t	2026-05-20 16:55:41.073058+05:30
d17efe7b-88c8-45ec-8438-29f8d8e04b7b	4bd02723-1c05-4f78-a894-6d79069bca75	1746cfe8-a032-4f38-b332-9b9094a7a560	2026-05-20	2026-05-20 17:18:37.691056+05:30	2026-05-20 17:21:36.22013+05:30	t	2026-05-20 17:20:38.934738+05:30
450cdced-1355-4287-94cc-ae6a42acfb9d	eae42b17-e510-452a-85aa-4bfc48f96ba5	b99f02a7-30a4-4e02-8a89-38d28559f699	2026-05-20	2026-05-20 17:34:51.445177+05:30	2026-05-20 17:34:51.445177+05:30	t	2026-05-20 17:36:40.791168+05:30
6662c896-a61a-4c70-b7df-19433b4c87a3	eae42b17-e510-452a-85aa-4bfc48f96ba5	b99f02a7-30a4-4e02-8a89-38d28559f699	2026-05-21	2026-05-21 14:13:01.073352+05:30	2026-05-21 14:13:01.073352+05:30	t	2026-05-21 14:14:27.016304+05:30
a7a1acb0-aef3-418d-a521-7720b1256c9f	4bd02723-1c05-4f78-a894-6d79069bca75	1746cfe8-a032-4f38-b332-9b9094a7a560	2026-07-06	2026-07-06 09:21:37.024287+05:30	2026-07-06 09:21:37.024287+05:30	t	2026-07-06 09:22:22.890645+05:30
c9371808-5136-405e-9732-c3dc2ac9b4a7	41c0a26f-37a4-4336-b50a-cfb9b4a894be	5c0ffca7-195e-42f0-806e-af8cfc01301d	2026-07-07	2026-07-07 10:28:22.13588+05:30	2026-07-07 10:28:22.13588+05:30	t	2026-07-07 10:41:03.187823+05:30
b921a7ac-7074-4824-9d2a-5ebe02cc6c81	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	091e001f-d386-487a-b978-7d4a7f98abfb	2026-07-07	2026-07-07 10:27:23.895957+05:30	2026-07-07 10:27:23.895957+05:30	t	2026-07-07 10:42:08.069474+05:30
6680ec98-43a8-41c1-af6f-db5b79c411b7	4bd02723-1c05-4f78-a894-6d79069bca75	1746cfe8-a032-4f38-b332-9b9094a7a560	2026-07-07	2026-07-07 10:27:56.083124+05:30	2026-07-07 10:27:56.083124+05:30	t	2026-07-07 10:42:16.313789+05:30
81053a30-e9cf-41b5-9d82-6f064e36f152	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	60f8f109-15a2-4e2e-8617-37ab492fc1f3	2026-07-07	2026-07-07 10:31:56.023068+05:30	2026-07-07 10:31:56.023068+05:30	t	2026-07-07 10:43:20.161878+05:30
3a1c90d2-4bf3-42eb-970f-df3397e878e9	0e566dff-0770-4286-bae9-417248b5f82a	20f1c12e-1a3f-4d38-9a95-6bda2728c3e3	2026-07-08	2026-07-08 09:48:04.435981+05:30	2026-07-08 09:48:04.435981+05:30	t	2026-07-08 10:40:56.130176+05:30
610336c4-eb09-4f29-8fe8-6e48c44e2f8e	828f4c08-6936-44db-be08-bf5507d5b0ed	8b8f5770-1217-47f4-982b-68fea944b6a2	2026-07-08	2026-07-08 09:51:44.690166+05:30	2026-07-08 09:51:44.690166+05:30	t	2026-07-08 10:41:26.813206+05:30
f9364389-fc69-4fe1-b59f-a2dd14f94826	4bd02723-1c05-4f78-a894-6d79069bca75	1746cfe8-a032-4f38-b332-9b9094a7a560	2026-07-08	2026-07-08 09:46:47.787213+05:30	2026-07-08 09:46:47.787213+05:30	t	2026-07-08 10:41:34.693981+05:30
21436a4e-e3b6-402a-81ea-56337f55588a	41c0a26f-37a4-4336-b50a-cfb9b4a894be	5c0ffca7-195e-42f0-806e-af8cfc01301d	2026-07-08	2026-07-08 09:47:37.695369+05:30	2026-07-08 09:47:37.695369+05:30	t	2026-07-08 10:41:37.853663+05:30
18a31be5-acbb-4ec6-840c-f76f0bc5cf3e	64560975-90d7-409d-a04d-c3164438a794	70ed8260-d6df-4d85-8c40-a67e36d28e55	2026-07-08	2026-07-08 09:47:16.996249+05:30	2026-07-08 09:47:16.996249+05:30	t	2026-07-08 10:41:47.53678+05:30
2b1a1f94-04bd-4d51-8c4b-e847700e26ca	64560975-90d7-409d-a04d-c3164438a794	70ed8260-d6df-4d85-8c40-a67e36d28e55	2026-07-09	2026-07-09 09:34:24.406099+05:30	2026-07-09 09:34:24.406099+05:30	t	2026-07-09 10:40:27.145997+05:30
d25dc90e-7736-4725-a1de-f8b4484d0a42	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	60f8f109-15a2-4e2e-8617-37ab492fc1f3	2026-07-09	2026-07-09 11:17:57.198746+05:30	2026-07-09 11:17:57.198746+05:30	t	2026-07-09 11:21:24.105031+05:30
5c74c659-316b-401e-97cb-559fa885884c	828f4c08-6936-44db-be08-bf5507d5b0ed	8b8f5770-1217-47f4-982b-68fea944b6a2	2026-07-09	2026-07-09 11:07:15.299293+05:30	2026-07-09 11:07:15.299293+05:30	t	2026-07-09 11:21:52.902235+05:30
6702179d-c02f-4ed2-bf7f-803dc27d4ad8	4bd02723-1c05-4f78-a894-6d79069bca75	1746cfe8-a032-4f38-b332-9b9094a7a560	2026-07-09	2026-07-09 11:05:56.235287+05:30	2026-07-09 11:05:56.235287+05:30	t	2026-07-09 11:22:00.592947+05:30
\.


--
-- Data for Name: backup_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.backup_logs (id, backup_name, file_name, file_path, file_size_bytes, status, created_at, restored_at) FROM stdin;
1	backup_2026_07_07_10_55_10.sql	backup_2026_07_07_10_55_10.sql	C:\\Users\\abc\\Desktop\\Test UI - Copy (4)\\backups\\backup_2026_07_07_10_55_10.sql	313027	completed	2026-07-07 10:55:10.789887	\N
\.


--
-- Data for Name: class_subject_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_subject_plans (id, grade, stream, fixed_subjects, language_options, religion_options, elective_category_1_options, elective_category_2_options, elective_category_3_options, is_active, created_at, updated_at) FROM stdin;
3bc1de52-2088-440f-8adf-f9de51508a94	5		Mathematics,English (as secondary language),Environment	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
1a17ee62-6619-4741-8327-df80f4df9553	7		Mathematics,English (as secondary language),Science,History	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam	ICT,Health and Physical Education,Accounting	Music,Arts,Dancing	Geography,Tamil,Human Studies	t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
efbfbdef-4832-40f2-b9cf-c9e0b9c6fbcb	9		Mathematics,English (as secondary language),Science,History	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam	ICT,Health and Physical Education,Accounting	Music,Arts,Dancing	Geography,Tamil,Human Studies	t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
59f47502-5b98-4212-ab96-81c6f1e168dc	10		Mathematics,English (as secondary language),Science,History	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam	ICT,Health and Physical Education,Accounting	Music,Arts,Dancing	Geography,Tamil,Human Studies	t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
e3051ae1-3de6-4859-b8db-e851f362633c	11		Mathematics,English (as secondary language),Science,History	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam	ICT,Health and Physical Education,Accounting	Music,Arts,Dancing	Geography,Tamil,Human Studies	t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
7280efd7-1099-4a4a-be72-a3a2b254caaf	12	biological	Biology,Chemistry,Physics	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
5c3a4f07-f5a9-4762-be21-1b5c7e9d3931	13	biological	Biology,Chemistry,Physics	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
e165dfcd-d6e1-4b42-900c-d73d9faeb9e7	12	science	Biology,Chemistry,Physics	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
991dbac6-8259-411a-b2a5-8c495c04a2da	13	science	Biology,Chemistry,Physics	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
2a78cab4-9ff3-474d-90dc-34bea58d828d	12	mathematical	Applied Mathematics,Pure Mathematics,Chemistry,Physics	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
507060d3-23d1-4108-8258-b341311d9bc8	13	mathematical	Applied Mathematics,Pure Mathematics,Chemistry,Physics	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
3381e474-950a-45b8-852b-fced6ef19426	12	art	Geography,ICT,Tamil	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
a9442fd0-844d-4aaa-af42-d90ef7ed78f3	13	art	Geography,ICT,Tamil	Sinhala,Tamil	Buddhism,Hindu,Catholic,Islam				t	2026-05-07 17:30:53.939517+05:30	2026-05-07 17:30:53.939517+05:30
940665d4-6138-475b-84fd-937efdb68ccb	6		Mathematics,English (as secondary language),Science,History,Sinhala,Buddhism			ICT,Health and Physical Education,Accounting	Music,Arts,Dancing	Geography,Tamil,Human Studies	t	2026-05-07 17:30:53.939517+05:30	2026-05-13 13:29:10.738832+05:30
749edc26-02b9-41df-b5a1-94b0c3b917a4	1		Mathematics, Environment, Sinhala, Buddhism						t	2026-05-07 17:30:53.939517+05:30	2026-05-13 14:21:18.179767+05:30
cb72b358-0aa6-44d4-a361-598b38ef1d56	8		Mathematics,English (as secondary language),Science,History			ICT,Health and Physical Education,Accounting	Music,Arts,Dancing, Western Music	Geography,Tamil,Human Studies	t	2026-05-07 17:30:53.939517+05:30	2026-05-15 17:51:20.7453+05:30
aac6b1ee-5d7b-4db3-a3e7-3fb821182b11	2		Mathematics,Environment,Sinhala, Buddhism						t	2026-05-07 17:30:53.939517+05:30	2026-05-15 18:33:25.114104+05:30
0313de32-e68d-456f-a789-d8711c39acd8	4		Mathematics,English (as secondary language),Accounting						t	2026-05-07 17:30:53.939517+05:30	2026-05-15 18:58:25.775241+05:30
68fe857a-a7af-4f67-80aa-1f8b8673f1c6	3		Mathematics,Tamil (as secondary language),Environment, buddhism						t	2026-05-07 17:30:53.939517+05:30	2026-05-26 19:53:23.802461+05:30
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classes (id, grade, section, academic_year, teacher_id, is_active, created_at, updated_at, stream, max_students) FROM stdin;
eae42b17-e510-452a-85aa-4bfc48f96ba5	11	A	2026	b99f02a7-30a4-4e02-8a89-38d28559f699	t	2026-05-05 22:10:47.182005+05:30	2026-05-06 09:58:18.958042+05:30		40
828f4c08-6936-44db-be08-bf5507d5b0ed	1	A	2026	8b8f5770-1217-47f4-982b-68fea944b6a2	t	2026-05-06 10:38:49.758684+05:30	2026-05-06 10:40:07.894199+05:30		30
64560975-90d7-409d-a04d-c3164438a794	6	A	2026	70ed8260-d6df-4d85-8c40-a67e36d28e55	t	2026-05-10 16:45:38.158435+05:30	2026-05-10 16:54:39.499084+05:30		40
4bd02723-1c05-4f78-a894-6d79069bca75	9	A	2026	1746cfe8-a032-4f38-b332-9b9094a7a560	t	2026-05-13 18:49:13.071636+05:30	2026-05-13 18:52:31.701949+05:30		40
e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2	A	2026	60f8f109-15a2-4e2e-8617-37ab492fc1f3	t	2026-05-13 18:48:55.664186+05:30	2026-05-15 16:47:36.837701+05:30		40
41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	A	2026	5c0ffca7-195e-42f0-806e-af8cfc01301d	t	2026-05-15 17:47:56.018879+05:30	2026-05-26 19:51:24.757727+05:30		40
0e566dff-0770-4286-bae9-417248b5f82a	1	B	2026	20f1c12e-1a3f-4d38-9a95-6bda2728c3e3	t	2026-07-03 09:42:54.349685+05:30	2026-07-03 09:45:20.429683+05:30		40
3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	1	C	2026	091e001f-d386-487a-b978-7d4a7f98abfb	t	2026-07-07 09:03:18.66045+05:30	2026-07-07 09:06:14.412126+05:30		40
25fdc3c5-5604-4064-8ef6-e6807f0a68b2	11	C	2026	\N	t	2026-07-07 16:17:40.141105+05:30	2026-07-07 16:17:40.141105+05:30		40
d4b034e1-9082-4d07-8ac2-7f8e1a58071c	2	C	2026	\N	t	2026-07-08 23:32:48.93834+05:30	2026-07-08 23:32:48.93834+05:30		40
a7b77203-09fc-4d43-97ca-c20dbc2480a1	2	B	2026	7899117d-02f7-4c18-b2af-0a3123959add	t	2026-07-08 23:32:40.300623+05:30	2026-07-09 11:21:46.040474+05:30		40
491b2018-686e-4490-99a5-dab630d9576e	5	A	2026	\N	t	2026-07-09 15:13:52.382578+05:30	2026-07-09 15:13:52.382578+05:30		40
4680c1d6-1246-4523-aa8e-18293c17aa38	4	A	2026	\N	t	2026-07-09 15:14:04.83312+05:30	2026-07-09 15:14:04.83312+05:30		40
94bff847-a7fb-49de-984b-79c4f6d77a6f	7	A	2026	\N	t	2026-07-09 15:14:21.719993+05:30	2026-07-09 15:14:21.719993+05:30		40
160662d3-ae47-409b-94e3-53a5e8104835	1	D	2026	\N	t	2026-07-09 15:14:57.702434+05:30	2026-07-09 15:14:57.702434+05:30		40
1c88a7af-ea5a-494c-8de6-b76a3a607eab	8	A	2026	\N	t	2026-07-09 15:15:19.839693+05:30	2026-07-09 15:15:19.839693+05:30		40
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (holiday_date, name, is_public_holiday, created_at) FROM stdin;
\.


--
-- Data for Name: notification_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_logs (id, student_id, notification_type, medium, recipient, message, status, sent_at) FROM stdin;
d1572eca-858e-4cb2-87d6-edaef2c732c7	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	term_test	email	pubudulakshan72@gmail.com	Term marks saved for Nadum	sent	2026-05-06 18:31:45.002808+05:30
b5f5b1bc-6bc1-4989-bf69-ff78d0ba2e99	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	term_test	sms	94766218578	Dear Charitha, Your child's Term 1 Grade 1 Class A marks has released,\nBuddhism - 80\nEnvironment - 90\nMathematics - 98\nSinhala - 87	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-06 18:31:45.01251+05:30
25194841-390c-4004-af7b-de6dae422207	adbe2730-fe44-44ac-bee9-f8888cf50569	term_test	email	pubudulakshan72@gmail.com	Term marks saved for Lashan wasudewa	sent	2026-05-07 12:27:04.072341+05:30
7f6f8f9e-d888-43b5-9f19-0d4f391d342d	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	term_test	email	pubudulakshan72@gmail.com	Term marks saved for Nadum	sent	2026-05-07 12:27:07.968642+05:30
8e9a5488-9862-4481-902f-24f9e7ee38db	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	attendance	sms	94766218578	Dear Amith, Your child Amindu present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.637477+05:30
ddd7a35a-d2ce-4fd3-a59e-8e5f51c3d4ce	db2737be-154b-4e11-961a-f605558ef0eb	attendance	sms	94766218578	Dear Jayantha Perera, Your child Bithula Pramod present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.649136+05:30
69c606d5-1891-4ef5-8fe5-d362c223672a	186e3d3e-396c-411c-9ed0-8b19aa596e15	attendance	sms	94766218578	Dear Nuwan Gamage, Your child Charuni Saleeka present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.652795+05:30
8c9bfc9a-5d4f-49f0-a6ab-24928cb19789	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	attendance	sms	94766218578	Dear Mahela, Your child gayeni absent at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.656341+05:30
d4c39cb4-889f-4c9b-a5b3-7d87ee53bf49	2da0cce0-e401-4a70-b12c-bfaf452c6593	attendance	sms	94766218578	Dear Tharindu Silva, Your child Jane Silva absent at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.660365+05:30
cecd8c31-dd9b-4e87-9279-f0c957844ff6	adbe2730-fe44-44ac-bee9-f8888cf50569	attendance	sms	94715436047	Dear Amal, Your child Lashan wasudewa present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.664174+05:30
960f1fe7-1e0b-492f-b439-5cc8ed26a9fb	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	attendance	sms	94766218578	Dear Charitha, Your child Nadum present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.667766+05:30
3135c4c4-f82b-4100-9e9f-ca71b0937fc9	e3ded0b9-e857-4b32-83b9-7c167372a544	attendance	sms	94766218578	Dear Ajantha, Your child Rashila present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.670535+05:30
ab55e578-dfed-47c1-9af2-a0012a9ce8ff	3870b309-9c01-4c72-af60-1338fc95f35d	attendance	sms	94766218578	Dear Nimal, Your child Suhara absent at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.674493+05:30
04eb6306-48cb-41e1-9376-16aaad8124f0	93667668-78ac-408a-a626-267a7d2607ab	attendance	sms	94766218578	Dear anila, Your child Suhara present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.678183+05:30
669d15b3-c6e5-4008-83b1-4db1554dbe28	0314a791-ea42-429e-a632-38e8dd8ecdde	attendance	sms	94766218578	Dear sumeda fernando, Your child Tharushi Sithara present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.681793+05:30
bbdc9721-1717-4dee-b1ef-1ae0a38c2faa	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	attendance	sms	94766218578	Dear Asela, Your child Thilini present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.68549+05:30
0f0abcff-89b1-41b1-aafe-1984eb940636	a50e217d-21ce-415d-8035-c37b3cf89a71	attendance	sms	94766218578	Dear Thushara alwis, Your child Yasiru Nawod present at school on 14/05/2026 at Grade 1 Class A.	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 19:55:59.688698+05:30
32e59686-869f-4b83-bd21-534729e40d24	836fd154-cdfd-49f0-82eb-a55e67ec7406	registration	sms	94766218578	Hi Mahinda, Aseni has been registered to Grade 1 Class A. Student Code: 1037	failed: SMS configuration missing. Set API_TOKEN and SENDER_ID in .env.	2026-05-14 21:33:17.317468+05:30
ffb22aef-4812-4570-a405-e062a797e5f3	5dd90925-434b-4342-9691-392bb979b295	registration	sms	94766218578	Hi Aruja, Matheesha has been registered to Grade 1 Class A. Student Code: 1087	sent	2026-05-14 21:35:29.584798+05:30
80289eca-ee8a-446c-857d-ed7498fed9c6	b47af724-c5f2-4b30-b5c1-9add8ca43645	term_test	sms	94766218578	Dear Amila, Your child's Term 1 Grade 6 Class A marks has released,\nMathematics - 80	sent	2026-05-15 11:47:01.091753+05:30
3848399e-2bd5-4014-b868-2ca4bc2037d0	00999c6b-5480-499d-9e70-a99987eb9d64	term_test	sms	94766218578	Dear Amala senanayaka, Your child's Term 1 Grade 6 Class A marks has released,\nMathematics - 98	sent	2026-05-15 11:47:02.627843+05:30
cbb2df19-4b64-44c8-a666-b696d5fb3cd4	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	term_test	sms	94766218578	Dear Mahin, Your child's Term 1 Grade 6 Class A marks has released,\nMathematics - 75	sent	2026-05-15 11:47:04.201913+05:30
9bd67e7f-63c3-4d1e-be59-91a59d42be70	5e956353-c70e-4433-aa21-cf0a9bcf3602	term_test	sms	94766218578	Dear Rajpaksha, Your child's Term 1 Grade 6 Class A marks has released,\nMathematics - 76	sent	2026-05-15 11:47:06.064233+05:30
59b9aa45-1dac-4c6d-8c39-53f47b46ddbd	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	term_test	sms	94766218578	Dear Nimal, Your child's Term 1 Grade 6 Class A marks has released,\nMathematics - 87	sent	2026-05-15 11:47:07.659309+05:30
dd435e89-1127-4412-8cc6-a5281ee42689	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	term_test	sms	94766218578	Dear ruwan, Your child's Term 1 Grade 6 Class A marks has released,\nMathematics - 68	sent	2026-05-15 11:47:09.149058+05:30
62c30641-7544-4726-a1ce-0b7033d5de4a	9a02ca9b-0234-4504-8ab5-2d4362f4d651	registration	sms	94766218578	Hi Suren, Nadun Lakshitha has been registered to Grade 2 Class A. Student Code: 1300	sent	2026-05-20 17:30:02.150735+05:30
61e6473a-6be8-4562-8a76-04ebe98140cc	286385dc-7884-42da-992f-6891fd1bccb5	registration	sms	94766218578	Hi Athula, Achini has been registered to Grade 11 Class A. Student Code: 2000	sent	2026-05-20 17:33:13.077908+05:30
79245f9b-78e8-4f23-83f1-328b3dc06e77	9e271530-fd95-4be5-819d-a534e09a83c3	registration	sms	94766218578	Hi sunamapama, Chamara has been registered to Grade 11 Class A. Student Code: 2001	sent	2026-05-20 17:34:41.323783+05:30
218ecaa8-cb3f-484e-902e-0cf750899a41	286385dc-7884-42da-992f-6891fd1bccb5	attendance	sms	0766218578	Dear Parent, Your child Achini present at school on 21/05/2026 at Grade 11 Class A.	sent	2026-05-21 14:14:25.379112+05:30
9e9bddd7-09df-456f-948a-e079f1598b86	9e271530-fd95-4be5-819d-a534e09a83c3	attendance	sms	0766218578	Dear Parent, Your child Chamara absent at school on 21/05/2026 at Grade 11 Class A.	sent	2026-05-21 14:14:27.008954+05:30
19112cab-ee08-4d98-ac36-c5c54b72b744	b47af724-c5f2-4b30-b5c1-9add8ca43645	term_test	sms	94766218578	Dear Amila, Heshani's Term 1 Grade 6 Class A marks have been released.\nScience - 70	sent	2026-05-25 14:16:35.449513+05:30
8f414fdf-3afa-4592-ad74-8f51bd3d7c5e	00999c6b-5480-499d-9e70-a99987eb9d64	term_test	sms	94766218578	Dear Amala senanayaka, Janani Ishara's Term 1 Grade 6 Class A marks have been released.\nScience - 60	sent	2026-05-25 14:16:37.069366+05:30
0e937a2a-8cc9-4476-9316-1018a98974ce	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	term_test	sms	94766218578	Dear Mahin, Namal's Term 1 Grade 6 Class A marks have been released.\nScience - 80	sent	2026-05-25 14:16:38.69906+05:30
96380c8d-bb7a-4cc4-a83f-3d7ce662f4b0	5e956353-c70e-4433-aa21-cf0a9bcf3602	term_test	sms	94766218578	Dear Rajpaksha, Piyath's Term 1 Grade 6 Class A marks have been released.\nScience - 96	sent	2026-05-25 14:16:40.340003+05:30
8bccf230-2d68-4b5f-9ed1-e9a605d57171	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	term_test	sms	94766218578	Dear Nimal, Ridmi's Term 1 Grade 6 Class A marks have been released.\nScience - 67	sent	2026-05-25 14:16:42.086772+05:30
80d8da39-bef1-4f34-9c3f-c281f125e4bd	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	term_test	sms	94766218578	Dear ruwan, Saleeka's Term 1 Grade 6 Class A marks have been released.\nScience - 98	sent	2026-05-25 14:16:43.71995+05:30
70909fd1-725d-4de9-b7a3-8d8caaf07b0d	cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	registration	sms	94766218578	Hi Sunil Perera, Anjali Perera has been registered to Grade 1 Class C. Student Code: 2120	sent	2026-07-07 09:39:21.611163+05:30
8b814128-f44f-4afa-b76b-0c668a49c078	b47af724-c5f2-4b30-b5c1-9add8ca43645	term_test	sms	94766218578	Dear Amila, Heshani's Term 2 Grade 6 Class A marks have been released.\nAccounting - \nArts - \nBuddhism - 77\nDancing - \nEnglish (as secondary language) - 45\nGeography - \nHealth and Physical Education - \nHistory - 67\nHuman Studies - \nICT - 67\nMathematics - 67\nMusic - 90\nScience - 77\nSinhala - 56\nTamil - 45	sent	2026-05-26 18:28:55.993329+05:30
34f45203-4b58-4318-ad4c-ce95e070afdb	00999c6b-5480-499d-9e70-a99987eb9d64	term_test	sms	94766218578	Dear Amala senanayaka, Janani Ishara's Term 2 Grade 6 Class A marks have been released.\nAccounting - \nArts - 90\nBuddhism - 67\nDancing - \nEnglish (as secondary language) - 56\nGeography - \nHealth and Physical Education - 66\nHistory - 56\nHuman Studies - \nICT - \nMathematics - 67\nMusic - \nScience - 67\nSinhala - 56\nTamil - 45	sent	2026-05-26 18:28:57.554868+05:30
468d1414-2ec5-406a-a107-238fae83dc11	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	term_test	sms	94766218578	Dear Mahin, Namal's Term 2 Grade 6 Class A marks have been released.\nAccounting - \nArts - \nBuddhism - 67\nDancing - \nEnglish (as secondary language) - 56\nGeography - 45\nHealth and Physical Education - 56\nHistory - 56\nHuman Studies - \nICT - \nMathematics - 78\nMusic - 89\nScience - 56\nSinhala - 56\nTamil - 	sent	2026-05-26 18:28:59.113151+05:30
b0a6cd12-5436-4686-ba63-c09b3db9f3c6	5e956353-c70e-4433-aa21-cf0a9bcf3602	term_test	sms	94766218578	Dear Rajpaksha, Piyath's Term 2 Grade 6 Class A marks have been released.\nAccounting - 89\nArts - \nBuddhism - 67\nDancing - 67\nEnglish (as secondary language) - 78\nGeography - \nHealth and Physical Education - \nHistory - 56\nHuman Studies - 78\nICT - \nMathematics - 78\nMusic - \nScience - 56\nSinhala - 56\nTamil - 	sent	2026-05-26 18:29:00.641368+05:30
4dad07cb-5cc7-4fbb-a827-b314c7906cf0	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	term_test	sms	94766218578	Dear Nimal, Ridmi's Term 2 Grade 6 Class A marks have been released.\nAccounting - \nArts - \nBuddhism - 67\nDancing - \nEnglish (as secondary language) - 67\nGeography - 45\nHealth and Physical Education - \nHistory - 56\nHuman Studies - \nICT - 45\nMathematics - 65\nMusic - 67\nScience - 34\nSinhala - 56\nTamil - 	sent	2026-05-26 18:29:02.2794+05:30
943ce3b3-bb60-473a-9492-408e7b63c4cf	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	term_test	sms	94766218578	Dear ruwan, Saleeka's Term 2 Grade 6 Class A marks have been released.\nAccounting - \nArts - \nBuddhism - 67\nDancing - \nEnglish (as secondary language) - 68\nGeography - 45\nHealth and Physical Education - \nHistory - 56\nHuman Studies - \nICT - 67\nMathematics - 78\nMusic - 56\nScience - 56\nSinhala - 56\nTamil - 	sent	2026-05-26 18:29:03.827198+05:30
54cfde06-3e62-4797-9f99-24ebad835be6	b47af724-c5f2-4b30-b5c1-9add8ca43645	term_test	sms	94766218578	Dear Amila, Heshani's Term 3 Grade 6 Class A marks have been released.\nBuddhism - 77\nEnglish (as secondary language) - 89\nHistory - 56\nICT - 67\nMathematics - 90\nMusic - 78\nScience - 56\nSinhala - 56\nTamil - 87	sent	2026-05-26 18:35:45.191482+05:30
1eed0565-54c0-474a-a4fc-28ab5ee53820	00999c6b-5480-499d-9e70-a99987eb9d64	term_test	sms	94766218578	Dear Amala senanayaka, Janani Ishara's Term 3 Grade 6 Class A marks have been released.\nArts - 78\nBuddhism - 77\nEnglish (as secondary language) - 89\nHealth and Physical Education - 98\nHistory - 56\nMathematics - 78\nScience - 45\nSinhala - 56\nTamil - 78	sent	2026-05-26 18:35:46.733649+05:30
939bf677-e385-4f46-b94a-4914eb435f4e	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	term_test	sms	94766218578	Dear Mahin, Namal's Term 3 Grade 6 Class A marks have been released.\nBuddhism - 67\nEnglish (as secondary language) - 88\nGeography - 67\nHealth and Physical Education - 98\nHistory - 56\nMathematics - 78\nMusic - 78\nScience - 66\nSinhala - 56	sent	2026-05-26 18:35:48.207678+05:30
dfc67bf8-7e85-498b-9909-4f9e2522e273	5e956353-c70e-4433-aa21-cf0a9bcf3602	term_test	sms	94766218578	Dear Rajpaksha, Piyath's Term 3 Grade 6 Class A marks have been released.\nAccounting - 78\nBuddhism - 67\nDancing - 77\nEnglish (as secondary language) - 56\nHistory - 56\nHuman Studies - 78\nMathematics - 67\nScience - 67\nSinhala - 56	sent	2026-05-26 18:35:49.739601+05:30
c6012d8e-76f3-4577-9c68-a37dd8ff8d3b	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	term_test	sms	94766218578	Dear Nimal, Ridmi's Term 3 Grade 6 Class A marks have been released.\nBuddhism - 67\nEnglish (as secondary language) - 45\nGeography - 67\nHistory - 56\nICT - 67\nMathematics - 56\nMusic - 78\nScience - 56\nSinhala - 56	sent	2026-05-26 18:35:51.229233+05:30
aff210bd-96d4-42c9-bcae-641deb7fe97e	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	term_test	sms	94766218578	Dear ruwan, Saleeka's Term 3 Grade 6 Class A marks have been released.\nBuddhism - 67\nEnglish (as secondary language) - 67\nGeography - 67\nHistory - 56\nICT - 67\nMathematics - 45\nMusic - 78\nScience - 78\nSinhala - 56	sent	2026-05-26 18:35:53.18849+05:30
2f9271f7-725b-4c24-a54b-015fc10ab4e5	7b6562b8-be72-4df1-a0b9-702c9ceec431	registration	sms	94766218578	Hi Amila Silva, Ramith Silva has been registered to Grade 3 Class A. Student Code: 3000	sent	2026-05-26 19:57:55.049777+05:30
a005bb63-988d-49bb-a7ec-e87e5e3bd738	f6a128a7-8725-4952-bd78-cf852e1846a8	registration	sms	94766218578	Hi Roshan Perera, Shalini Perera has been registered to Grade 3 Class A. Student Code: 3001	sent	2026-05-26 19:59:09.243077+05:30
0dbaec84-f9fe-4c0c-876e-f625ac285560	7b6562b8-be72-4df1-a0b9-702c9ceec431	term_test	sms	94766218578	Dear Amila Silva, Ramith Silva's Term 1 Grade 3 Class A marks have been released.\nbuddhism - 89\nEnvironment - 78\nMathematics - 90\nTamil (as secondary language) - 80	sent	2026-05-26 23:46:27.396807+05:30
3a2725f4-c3d8-47c8-8a71-62afb98d985b	f6a128a7-8725-4952-bd78-cf852e1846a8	term_test	sms	94766218578	Dear Roshan Perera, Shalini Perera's Term 1 Grade 3 Class A marks have been released.\nbuddhism - 93\nEnvironment - 78\nMathematics - 90\nTamil (as secondary language) - 89	sent	2026-05-26 23:46:28.88699+05:30
9448eab6-2b4a-4bc8-bb07-fbb6ff27adf0	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	registration	sms	94766218578	Hi Athula Perara, Mithuni Perera has been registered to Grade 9 Class A. Student Code: 3005	sent	2026-05-28 19:55:28.862529+05:30
8c8bf0ff-2e31-4a96-9bea-19677ad169b8	eb48778c-f7c9-4361-be6f-8d9a2eccab19	registration	sms	94766218578	Hi Amarasena, Dasuni almeda has been registered to Grade 9 Class A. Student Code: 3004	sent	2026-05-28 20:05:17.706626+05:30
2f5e9aec-9dca-46d5-9890-2a61d2657e60	53d675a4-a5b1-4f09-8034-e00cbd9a460c	term_test	sms	94766218578	Dear Kamal, Ashadi's Term 1 Grade 9 Class A marks have been released.\nEnglish (as secondary language) - 80\nGeography - 78\nHealth and Physical Education - 89\nHistory - 89\nMathematics - 90\nMusic - 89\nScience - 78	sent	2026-06-30 09:57:36.515824+05:30
b2d87b2d-11ca-40c2-b6bf-b4dc3aff0ac3	53d675a4-a5b1-4f09-8034-e00cbd9a460c	term_test	email	pubudulakshan72@gmail.com	Dear Kamal, Ashadi's Term 1 Grade 9 Class A marks have been released.\nEnglish (as secondary language) - 80\nGeography - 78\nHealth and Physical Education - 89\nHistory - 89\nMathematics - 90\nMusic - 89\nScience - 78	sent	2026-06-30 09:57:40.689712+05:30
f533e799-d59a-42f3-8b5b-93e75d1c4392	eb48778c-f7c9-4361-be6f-8d9a2eccab19	term_test	sms	94766218578	Dear Amarasena, Dasuni almeda's Term 1 Grade 9 Class A marks have been released.\nEnglish (as secondary language) - 80\nHistory - 89\nICT - 67\nMathematics - 90\nMusic - 89\nScience - 78\nTamil - 67	sent	2026-06-30 09:57:42.357419+05:30
2e719bfa-ae7f-4f1c-be3b-72030147d306	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	term_test	sms	94766218578	Dear Athula Perara, Mithuni Perera's Term 1 Grade 9 Class A marks have been released.\nEnglish (as secondary language) - 90\nGeography - 78\nHealth and Physical Education - 89\nHistory - 78\nMathematics - 80\nMusic - 98\nScience - 78	sent	2026-06-30 09:57:43.997856+05:30
84f3a9d4-2338-4fa0-ba59-4edeb6f7da7a	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	term_test	email	pubudulakshan72@gmail.com	Dear Athula Perara, Mithuni Perera's Term 1 Grade 9 Class A marks have been released.\nEnglish (as secondary language) - 90\nGeography - 78\nHealth and Physical Education - 89\nHistory - 78\nMathematics - 80\nMusic - 98\nScience - 78	sent	2026-06-30 09:57:48.183451+05:30
5c265790-3112-49f4-9e5d-f45f9b026509	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	term_test	sms	94766218578	Dear Amarasena, Sahan Perera's Term 1 Grade 9 Class A marks have been released.\nEnglish (as secondary language) - 78\nHistory - 67\nICT - 76\nMathematics - 78\nMusic - 89\nScience - 78\nTamil - 67	sent	2026-06-30 09:57:49.836763+05:30
52debfe9-ef63-4b4c-9487-9ab38e10613f	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	term_test	sms	94766218578	Dear Amarasena, Thisun Perera's Term 1 Grade 9 Class A marks have been released.\nEnglish (as secondary language) - 78\nHistory - 67\nICT - 77\nMathematics - 89\nMusic - 89\nScience - 78\nTamil - 67	sent	2026-06-30 09:57:51.470361+05:30
384fdb07-b4bc-44cb-9f18-e7fcb1541968	7b6562b8-be72-4df1-a0b9-702c9ceec431	term_test	sms	94766218578	Dear Amila Silva, Ramith Silva's Term 3 Grade 3 Class A marks have been released.\nClass Rank: 1\nTotal Marks: 295\nbuddhism - 89\nEnvironment - 67\nMathematics - 60\nTamil (as secondary language) - 79	sent	2026-06-30 21:29:29.796316+05:30
ff55e567-0f4e-4880-a9d6-ac224afbd3bf	7b6562b8-be72-4df1-a0b9-702c9ceec431	term_test	email	pubudulakshan72@gmail.com	Dear Amila Silva, Ramith Silva's Term 3 Grade 3 Class A marks have been released.\nClass Rank: 1\nTotal Marks: 295\nbuddhism - 89\nEnvironment - 67\nMathematics - 60\nTamil (as secondary language) - 79	sent	2026-06-30 21:29:34.66681+05:30
44e0f287-aef6-423c-bb87-04bfa31532cb	f6a128a7-8725-4952-bd78-cf852e1846a8	term_test	sms	94766218578	Dear Roshan Perera, Shalini Perera's Term 3 Grade 3 Class A marks have been released.\nClass Rank: 2\nTotal Marks: 335\nbuddhism - 92\nEnvironment - 89\nMathematics - 80\nTamil (as secondary language) - 74	sent	2026-06-30 21:29:36.249127+05:30
71819a0c-7559-4afa-b046-3ad577348434	f6a128a7-8725-4952-bd78-cf852e1846a8	term_test	email	pubudulakshan72@gmail.com	Dear Roshan Perera, Shalini Perera's Term 3 Grade 3 Class A marks have been released.\nClass Rank: 2\nTotal Marks: 335\nbuddhism - 92\nEnvironment - 89\nMathematics - 80\nTamil (as secondary language) - 74	sent	2026-06-30 21:29:40.466259+05:30
ffae0fa1-0d8b-4faa-849d-06b4c016047c	7b6562b8-be72-4df1-a0b9-702c9ceec431	term_test	sms	94766218578	Dear Amila Silva, Ramith Silva's Term 2 Grade 3 Class A marks have been released.\nClass Rank: 1\nTotal Marks: 320\nbuddhism - 67\nEnvironment - 78\nMathematics - 88\nTamil (as secondary language) - 87	sent	2026-06-30 22:05:46.019345+05:30
1785d178-d600-4544-9486-cd45c116174a	7b6562b8-be72-4df1-a0b9-702c9ceec431	term_test	email	pubudulakshan72@gmail.com	Dear Amila Silva, Ramith Silva's Term 2 Grade 3 Class A marks have been released.\nClass Rank: 1\nTotal Marks: 320\nbuddhism - 67\nEnvironment - 78\nMathematics - 88\nTamil (as secondary language) - 87	sent	2026-06-30 22:05:50.985032+05:30
965cb876-8939-468b-9ceb-984ad6696ecf	f6a128a7-8725-4952-bd78-cf852e1846a8	term_test	sms	94766218578	Dear Roshan Perera, Shalini Perera's Term 2 Grade 3 Class A marks have been released.\nClass Rank: 2\nTotal Marks: 323\nbuddhism - 75\nEnvironment - 98\nMathematics - 83\nTamil (as secondary language) - 67	sent	2026-06-30 22:05:52.453278+05:30
f727b39f-5817-4dc3-be27-000fe8dd2622	f6a128a7-8725-4952-bd78-cf852e1846a8	term_test	email	pubudulakshan72@gmail.com	Dear Roshan Perera, Shalini Perera's Term 2 Grade 3 Class A marks have been released.\nClass Rank: 2\nTotal Marks: 323\nbuddhism - 75\nEnvironment - 98\nMathematics - 83\nTamil (as secondary language) - 67	sent	2026-06-30 22:05:56.384461+05:30
bf26539f-de10-48cb-a328-d5027bd2f278	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	registration	sms	94766218578	Hi Samantha Siriwardana, Adeesha Siriwardana has been registered to Grade 1 Class B. Student Code: 1014	sent	2026-07-03 10:19:24.715615+05:30
0cfbdbab-a4a4-4784-ae75-5a03e2bc9439	af93e596-e524-4830-b1e6-78051eb850b6	registration	sms	94766218578	Hi Seetha perra, Maneesha Gimhan has been registered to Grade 1 Class B. Student Code: 6000	sent	2026-07-03 10:42:20.175404+05:30
8e4e73be-ed82-452c-a288-301e8dbeca5f	877deab2-5b88-4573-8fce-c4e52706b7e0	registration	sms	94766218578	Hi Aruna Perara, Maheeshi Savindya has been registered to Grade 1 Class B. Student Code: 6001	sent	2026-07-03 10:42:20.175918+05:30
9e1fdc0c-6812-4aea-840e-c52974230810	b24a3354-4780-415a-9934-aebff21f9096	registration	sms	94766218578	Hi Upananda Jayasinghe, Dimuthu Lakshan has been registered to Grade 1 Class B. Student Code: 6002	sent	2026-07-03 10:42:20.184353+05:30
17445e5a-2f71-4a8d-8df9-5dab3934b738	53d675a4-a5b1-4f09-8034-e00cbd9a460c	attendance	sms	0766218578	Dear Parent, Your child Ashadi present at school on 06/07/2026 at Grade 9 Class A.	sent	2026-07-06 09:22:16.557955+05:30
bed2777f-9b34-4342-b890-957fd3a50a34	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	attendance	sms	766218578	Dear Parent, Your child Sahan Perera late at school on 06/07/2026 at Grade 9 Class A. Reason: Transport Issues.	sent	2026-07-06 09:22:18.183974+05:30
131bcebd-304d-4c47-8095-8c6406a8c0cc	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	attendance	sms	766218578	Dear Parent, Your child Thisun Perera absent at school on 06/07/2026 at Grade 9 Class A.	sent	2026-07-06 09:22:19.817528+05:30
e5914c67-b7b8-495d-aa85-812b8ab27214	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	attendance	sms	0766218578	Dear Parent, Your child Mithuni Perera present at school on 06/07/2026 at Grade 9 Class A.	sent	2026-07-06 09:22:21.30827+05:30
a06713fa-3b12-4e2e-9f9d-b1e5549ae2cf	eb48778c-f7c9-4361-be6f-8d9a2eccab19	attendance	sms	766218578	Dear Parent, Your child Dasuni almeda absent at school on 06/07/2026 at Grade 9 Class A.	sent	2026-07-06 09:22:22.885161+05:30
5b50178d-be36-4c97-a28a-52a11dd1b916	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	term_test	sms	94766218578	Dear Samantha Siriwardana, Adeesha Siriwardana's Term 2 Grade 1 Class B marks have been released.\nClass Rank: 1\nTotal Marks: 314\nBuddhism - 90\nEnvironment - 67\nMathematics - 90\nSinhala - 67	sent	2026-07-07 08:59:28.619718+05:30
be12595f-8180-4b23-8a9f-f3d697d32d85	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	term_test	email	pubudulakshan72@gmail.com	Dear Samantha Siriwardana, Adeesha Siriwardana's Term 2 Grade 1 Class B marks have been released.\nClass Rank: 1\nTotal Marks: 314\nBuddhism - 90\nEnvironment - 67\nMathematics - 90\nSinhala - 67	sent	2026-07-07 08:59:33.000393+05:30
355133f0-daab-4da3-b02e-7b5c0a21780b	b24a3354-4780-415a-9934-aebff21f9096	term_test	sms	94766218578	Dear Upananda Jayasinghe, Dimuthu Lakshan's Term 2 Grade 1 Class B marks have been released.\nClass Rank: 2\nTotal Marks: 312\nBuddhism - 78\nEnvironment - 78\nMathematics - 78\nSinhala - 78	sent	2026-07-07 08:59:34.646161+05:30
4662aef0-1f11-4560-99eb-49af937b8d88	b24a3354-4780-415a-9934-aebff21f9096	term_test	email	pubudulakshan72@gmail.com	Dear Upananda Jayasinghe, Dimuthu Lakshan's Term 2 Grade 1 Class B marks have been released.\nClass Rank: 2\nTotal Marks: 312\nBuddhism - 78\nEnvironment - 78\nMathematics - 78\nSinhala - 78	sent	2026-07-07 08:59:38.9659+05:30
3965a22d-a625-440f-9174-cd9b2d9b9394	877deab2-5b88-4573-8fce-c4e52706b7e0	term_test	sms	94766218578	Dear Aruna Perara, Maheeshi Savindya's Term 2 Grade 1 Class B marks have been released.\nClass Rank: 3\nTotal Marks: 310\nBuddhism - 78\nEnvironment - 89\nMathematics - 78\nSinhala - 65	sent	2026-07-07 08:59:40.57004+05:30
43f86772-355b-4028-87c8-8a8d009debdf	877deab2-5b88-4573-8fce-c4e52706b7e0	term_test	email	pubudulakshan72@gmail.com	Dear Aruna Perara, Maheeshi Savindya's Term 2 Grade 1 Class B marks have been released.\nClass Rank: 3\nTotal Marks: 310\nBuddhism - 78\nEnvironment - 89\nMathematics - 78\nSinhala - 65	sent	2026-07-07 08:59:44.633105+05:30
fba4f844-46aa-4607-97d1-27fbd36fe34f	af93e596-e524-4830-b1e6-78051eb850b6	term_test	sms	94766218578	Dear Seetha perra, Maneesha Gimhan's Term 2 Grade 1 Class B marks have been released.\nClass Rank: 4\nTotal Marks: 263\nBuddhism - 56\nEnvironment - 84\nMathematics - 56\nSinhala - 67	sent	2026-07-07 08:59:46.310254+05:30
6f9d83c5-1647-4749-bba0-46ae7cc6b34c	af93e596-e524-4830-b1e6-78051eb850b6	term_test	email	pubudulakshan72@gmail.com	Dear Seetha perra, Maneesha Gimhan's Term 2 Grade 1 Class B marks have been released.\nClass Rank: 4\nTotal Marks: 263\nBuddhism - 56\nEnvironment - 84\nMathematics - 56\nSinhala - 67	sent	2026-07-07 08:59:50.181854+05:30
71f9e538-ddf2-42cb-89fd-aee34951e7e3	39b4f62a-e087-4eef-946d-f40dddde350d	registration	sms	94766218578	Hi Chandrika Perera, Sachintha Niroshan has been registered to Grade 1 Class C. Student Code: 2116	sent	2026-07-07 09:39:21.445966+05:30
64ddabf6-42e7-4113-9caa-dd0b5a6aa50a	5e245f6a-ad3a-4202-860e-60f2c0ba5c55	registration	sms	94766218578	Hi Somapala Silva, Kamal Silva has been registered to Grade 1 Class C. Student Code: 2101	sent	2026-07-07 09:39:21.450498+05:30
2126237c-828f-4280-a462-9d48f227829c	b28be76a-b92a-4165-a570-502cfd236b57	registration	sms	94766218578	Hi Anura Bandara, Amal Peris has been registered to Grade 1 Class C. Student Code: 2115	sent	2026-07-07 09:39:21.467689+05:30
46fdb8ed-3244-4544-bd23-679868eb8531	76fa6ddc-f8a9-4159-a844-1a717ed3bc29	registration	sms	94766218578	Hi Kusum Silva, Janith Ekanayake has been registered to Grade 1 Class C. Student Code: 2117	sent	2026-07-07 09:39:21.503333+05:30
f4e3a691-1eba-4c7c-a3d3-e585531b52e1	01d86598-3dc3-4b11-974a-d229fb4b6af5	registration	sms	94766218578	Hi Rohana Kumara, Isuru Sampath has been registered to Grade 1 Class C. Student Code: 2113	sent	2026-07-07 09:39:21.519746+05:30
4278c0d6-d4af-4a6f-976a-adb7e8ab79b8	3465cf1c-6a60-48a9-8409-5deaea64d19f	registration	sms	94766218578	Hi Mahinda Fernando, Ravindu Karunaratne has been registered to Grade 1 Class C. Student Code: 2118	sent	2026-07-07 09:39:21.525142+05:30
77b21999-3975-4b7a-b047-7a121d4e4d15	d839e6c4-853f-43f2-87ef-ed49a6715999	registration	sms	94766218578	Hi Sunil Perera, Nimal Perera has been registered to Grade 1 Class C. Student Code: 2100	sent	2026-07-07 09:39:21.542543+05:30
f5204c32-3b64-4e3d-b354-dfd976a98a11	ee855393-dc17-44e8-9851-76fe172f2c53	registration	sms	94766218578	Hi Indrani Kumari, Shehan De Silva has been registered to Grade 1 Class C. Student Code: 2119	sent	2026-07-07 09:39:22.009968+05:30
340f6de8-a9ab-4e44-bff3-cb5031f6a2fd	7f72d70c-f822-4258-9c60-c49c3b518bb7	registration	sms	94766218578	Hi Indrani Kumari, Tharushi Sewwandi has been registered to Grade 1 Class C. Student Code: 2129	sent	2026-07-07 09:39:22.113129+05:30
d6605fc5-9a83-452b-963d-8c1f8cdade95	d19da57c-0fe2-4445-9ee1-3666e15dc012	registration	sms	94766218578	Hi Chandrika Perera, Shashika Hansani has been registered to Grade 1 Class C. Student Code: 2136	sent	2026-07-07 09:39:22.125667+05:30
5e2f5665-e5b5-4826-956c-7beb3877bcc9	a1438d43-6950-4284-882e-a2f24f725c22	registration	sms	94766218578	Hi Kusum Silva, Dilki Madushani has been registered to Grade 1 Class C. Student Code: 2127	sent	2026-07-07 09:39:22.141839+05:30
ff5390a5-c948-468f-a134-80b9199d3d0c	acef1596-f9e7-46db-afff-ee5584022f4d	registration	sms	94766218578	Hi Chandrika Perera, Tharindu Senanayake has been registered to Grade 1 Class C. Student Code: 2106	sent	2026-07-07 09:39:22.167802+05:30
455e3b51-7b13-46b5-a741-313ccdc3bfa7	6c37736f-b10a-4262-8ae3-9dd9087e5099	registration	sms	94766218578	Hi Indrani Kumari, Sewmini Jayasuriya has been registered to Grade 1 Class C. Student Code: 2139	sent	2026-07-07 09:39:22.186774+05:30
69345471-5607-41ac-a14c-7a931a4a1647	22237097-4cab-4b29-8000-d6fc35341589	registration	sms	94766218578	Hi Anura Bandara, Hiruni Perera has been registered to Grade 1 Class C. Student Code: 2135	sent	2026-07-07 09:39:22.01293+05:30
0b821b70-6bbc-4b10-963f-cf05da4db649	dc4c4fcf-cd11-4824-a5fc-b33a2b440563	registration	sms	94766218578	Hi Kusum Silva, Nadeesha Madushika has been registered to Grade 1 Class C. Student Code: 2137	sent	2026-07-07 09:39:22.047819+05:30
0f4906a4-4c46-4951-9254-21fe60e20a04	b29b84ed-5055-464e-b02d-75f7984db2cd	registration	sms	94766218578	Hi Chandrika Perera, Umeshi Perera has been registered to Grade 1 Class C. Student Code: 2126	sent	2026-07-07 09:39:22.085645+05:30
1313bbcf-2b60-44ba-a7ee-ee49e1b766b8	dbd310a9-cbd9-4e39-916f-280d88424395	registration	sms	94766218578	Hi Mahinda Fernando, Sachini Kumari has been registered to Grade 1 Class C. Student Code: 2128	sent	2026-07-07 09:39:22.112722+05:30
e8711fdd-7844-4819-ae69-0194c4f5dae1	5fee4389-662f-4e8f-bc8c-54f0acc25920	registration	sms	94766218578	Hi Ajith Fernando, Saman Kumara has been registered to Grade 1 Class C. Student Code: 2102	sent	2026-07-07 09:39:22.186931+05:30
354ff427-6b2d-4bda-bcf3-fd06d9f2112f	ff07f896-ce93-4634-9be8-aa5caff17922	registration	sms	94766218578	Hi Mahinda Fernando, Supun Bandara has been registered to Grade 1 Class C. Student Code: 2108	sent	2026-07-07 09:39:22.187201+05:30
8cc452aa-3461-4a93-a4a1-3a76ef5a10a6	69ddd74f-769e-4225-bf84-6fe36504a018	registration	sms	94766218578	Hi Somapala Silva, Dinushi Silva has been registered to Grade 1 Class C. Student Code: 2121	sent	2026-07-07 09:39:22.204426+05:30
5de07308-c76a-4b7f-beaa-505a62c5a486	6c59b04c-50e9-4c78-9802-55e11789511f	registration	sms	94766218578	Hi Sunil Perera, Gayan Lakmal has been registered to Grade 1 Class C. Student Code: 2110	sent	2026-07-07 09:39:22.349664+05:30
9f0ee67f-9390-4ede-825d-1b38364ef980	d875c077-b63e-4ed4-ae80-2e489074f7b7	registration	sms	94766218578	Hi Somapala Silva, Ashan Dilshan has been registered to Grade 1 Class C. Student Code: 2111	sent	2026-07-07 09:39:22.437004+05:30
d2188a9a-31e2-4a02-8f7d-c3b6d4e1eb59	33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	registration	sms	94766218578	Hi Sujeewa Jayasinghe, Nuwan Chathuranga has been registered to Grade 1 Class C. Student Code: 2114	sent	2026-07-07 09:39:22.517292+05:30
5c79645f-d085-4c4b-8594-0962db844fa9	3e57df1b-6a5d-42c4-bf05-43232953ca09	registration	sms	94766218578	Hi Ajith Fernando, Sanduni Wijeratne has been registered to Grade 1 Class C. Student Code: 2132	sent	2026-07-07 09:39:22.742715+05:30
e43a4957-c873-4746-9c11-e729a5006da3	43b82bf1-7e23-4c2c-aaca-321b74de92c4	registration	sms	94766218578	Hi Rohana Kumara, Ayesha Nisansala has been registered to Grade 1 Class C. Student Code: 2133	sent	2026-07-07 09:39:22.754428+05:30
095fb0f0-0c3e-4626-abc0-fc201d4728aa	2d58f4c5-44f0-4af8-872f-71f7bec32f12	registration	sms	94766218578	Hi Rohana Kumara, Nethmi Jayawardena has been registered to Grade 1 Class C. Student Code: 2123	sent	2026-07-07 09:39:22.819018+05:30
1c8c1f38-975b-4482-aea6-79ae391c0d60	dcd84cc3-984a-42fe-881b-884251662e6a	registration	sms	94766218578	Hi Sunil Perera, Yasasmi Fernando has been registered to Grade 1 Class C. Student Code: 2130	sent	2026-07-07 09:39:23.34741+05:30
f176eeb2-f921-4e0b-bd3b-38e6c5de0864	85bfef6f-3286-4710-8317-7b71bee456d2	registration	sms	94766218578	Hi Kusum Silva, Lahiru Madushan has been registered to Grade 1 Class C. Student Code: 2107	sent	2026-07-07 09:39:23.359359+05:30
0d9b1cad-5f45-481e-970b-25909c3ec96a	17921d74-7486-4d11-98d9-448be5f04af4	registration	sms	94766218578	Hi Ajith Fernando, Kavindi Fernando has been registered to Grade 1 Class C. Student Code: 2122	sent	2026-07-07 09:39:23.39369+05:30
9befb0c8-2acf-41f1-98fc-488a380cf93c	eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	registration	sms	94766218578	Hi Somapala Silva, Imesha Lakmali has been registered to Grade 1 Class C. Student Code: 2131	sent	2026-07-07 09:39:23.410184+05:30
5fec71dd-03b6-4057-b6b2-9a114d375deb	2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	registration	sms	94766218578	Hi Anura Bandara, Ruwan Wijesinghe has been registered to Grade 1 Class C. Student Code: 2105	sent	2026-07-07 09:39:23.427809+05:30
20ba65bb-b3dc-4930-a43e-e6669a628de9	fd83d560-17d1-4063-89e4-b0e56bf19b39	registration	sms	94766218578	Hi Mahinda Fernando, Chamodi Kaushalya has been registered to Grade 1 Class C. Student Code: 2138	sent	2026-07-07 09:39:23.442623+05:30
10beef45-12cb-4da6-a674-2af4c8278923	b7cc526c-3425-4e94-b8eb-15b08e77ed8e	registration	sms	94766218578	Hi Ajith Fernando, Pradeep Ranasinghe has been registered to Grade 1 Class C. Student Code: 2112	sent	2026-07-07 09:39:23.568283+05:30
89308749-ea0c-462d-9650-a8f8a635988e	8d944d69-764c-4af6-837b-e10e1b2fd533	registration	sms	94766218578	Hi Sujeewa Jayasinghe, Maleesha Dilrukshi has been registered to Grade 1 Class C. Student Code: 2134	sent	2026-07-07 09:39:23.95545+05:30
a194110a-fd65-4d32-9a79-8f386ed8ac45	f79df6f8-c599-4767-803a-3fa522f7e538	registration	sms	94766218578	Hi Anura Bandara, Hashini Bandara has been registered to Grade 1 Class C. Student Code: 2125	sent	2026-07-07 09:39:23.998671+05:30
91c3e81d-eb52-4cd0-bb6a-ec9bcd6e8b81	821ebc49-8c56-4662-b5fe-dc7da1623cf5	registration	sms	94766218578	Hi Sujeewa Jayasinghe, Piumi Senaratne has been registered to Grade 1 Class C. Student Code: 2124	sent	2026-07-07 09:39:24.068772+05:30
d9a20bb6-c8f2-4ca4-b927-fd91fcb39ca7	e4567f9f-d50e-4598-8e38-473c09467f6b	registration	sms	94766218578	Hi Rohana Kumara, Kasun Fernando has been registered to Grade 1 Class C. Student Code: 2103	sent	2026-07-07 09:39:24.568057+05:30
ca797f79-1bd1-4f51-9a6d-f9a13b4ce003	9489fc67-83b4-4c5e-91e4-657967153e6f	registration	sms	94766218578	Hi Sujeewa Jayasinghe, Dinesh Jayasinghe has been registered to Grade 1 Class C. Student Code: 2104	sent	2026-07-07 09:39:24.629892+05:30
093b2112-88a9-483b-8d52-60913eb1586e	429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	registration	sms	94766218578	Hi Indrani Kumari, Chathura Gunasekara has been registered to Grade 1 Class C. Student Code: 2109	sent	2026-07-07 09:39:24.650325+05:30
bec29a4b-bd2f-4624-b147-b461f5865641	7b6562b8-be72-4df1-a0b9-702c9ceec431	attendance	sms	0766218578	Dear Parent, Your child Ramith Silva present at school on 07/07/2026 at Grade 3 Class A.	sent	2026-07-07 10:41:01.638623+05:30
dff04f79-815f-4572-a4ee-f1159fa921ce	f6a128a7-8725-4952-bd78-cf852e1846a8	attendance	sms	0766218578	Dear Parent, Your child Shalini Perera present at school on 07/07/2026 at Grade 3 Class A.	sent	2026-07-07 10:41:03.18264+05:30
2a68d285-9142-4bc3-bf7d-c71494b99318	d839e6c4-853f-43f2-87ef-ed49a6715999	attendance	sms	766218578	Dear Parent, Your child Nimal Perera present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:04.703658+05:30
63665e4e-c036-49fd-884b-a0b1c699391d	5e245f6a-ad3a-4202-860e-60f2c0ba5c55	attendance	sms	766218578	Dear Parent, Your child Kamal Silva present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:06.290218+05:30
2bff7b36-1858-4213-b70f-ce0ab569534c	5fee4389-662f-4e8f-bc8c-54f0acc25920	attendance	sms	766218578	Dear Parent, Your child Saman Kumara present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:07.862416+05:30
00aae5d3-4c98-4e86-adf2-98245c7335ff	e4567f9f-d50e-4598-8e38-473c09467f6b	attendance	sms	766218578	Dear Parent, Your child Kasun Fernando present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:09.360065+05:30
334c8071-fa2a-4223-aa9d-4e4cfc036c81	9489fc67-83b4-4c5e-91e4-657967153e6f	attendance	sms	766218578	Dear Parent, Your child Dinesh Jayasinghe present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:10.92502+05:30
b16d61ba-cb86-4a91-9d6d-c6d27cdbdf6d	2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	attendance	sms	766218578	Dear Parent, Your child Ruwan Wijesinghe present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:12.457474+05:30
a8b11625-66a8-4a83-9af8-c1c49604571d	acef1596-f9e7-46db-afff-ee5584022f4d	attendance	sms	766218578	Dear Parent, Your child Tharindu Senanayake present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:13.96181+05:30
64511c11-a385-4850-a2aa-bc17be7f787b	85bfef6f-3286-4710-8317-7b71bee456d2	attendance	sms	766218578	Dear Parent, Your child Lahiru Madushan present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:15.456874+05:30
95589017-2e36-41b8-b3b2-27290a1fdfa5	ff07f896-ce93-4634-9be8-aa5caff17922	attendance	sms	766218578	Dear Parent, Your child Supun Bandara present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:16.943073+05:30
78a2a0c3-76fe-4da5-b747-8848d6861e2c	429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	attendance	sms	766218578	Dear Parent, Your child Chathura Gunasekara present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:18.474153+05:30
441442c8-8094-4060-8ee7-eb40e71b932c	6c59b04c-50e9-4c78-9802-55e11789511f	attendance	sms	766218578	Dear Parent, Your child Gayan Lakmal absent at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:20.001165+05:30
f1e387d0-8a17-4068-9f4a-d8709723dbf3	d875c077-b63e-4ed4-ae80-2e489074f7b7	attendance	sms	766218578	Dear Parent, Your child Ashan Dilshan late at school on 07/07/2026 at Grade 1 Class C. Reason: Transport Issues.	sent	2026-07-07 10:41:21.541846+05:30
1e650d13-610b-4232-81e2-41b3f682faf8	b7cc526c-3425-4e94-b8eb-15b08e77ed8e	attendance	sms	766218578	Dear Parent, Your child Pradeep Ranasinghe present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:23.106157+05:30
8188bd62-3e70-40b1-903b-57378761d1b5	01d86598-3dc3-4b11-974a-d229fb4b6af5	attendance	sms	766218578	Dear Parent, Your child Isuru Sampath present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:25.56724+05:30
d50c5dde-95d1-45b4-8c81-7697a919b354	33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	attendance	sms	766218578	Dear Parent, Your child Nuwan Chathuranga absent at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:27.192529+05:30
85a51025-aeec-4f17-99df-39164a650f1e	b28be76a-b92a-4165-a570-502cfd236b57	attendance	sms	766218578	Dear Parent, Your child Amal Peris present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:28.697551+05:30
58ef8bfe-851d-4b41-b3e6-d58f2d668623	39b4f62a-e087-4eef-946d-f40dddde350d	attendance	sms	766218578	Dear Parent, Your child Sachintha Niroshan present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:30.296936+05:30
51e1aa47-a6dd-480e-9c39-28cfd8113c53	76fa6ddc-f8a9-4159-a844-1a717ed3bc29	attendance	sms	766218578	Dear Parent, Your child Janith Ekanayake present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:31.820623+05:30
dfefd30c-6393-4859-af88-5fdec1c99100	3465cf1c-6a60-48a9-8409-5deaea64d19f	attendance	sms	766218578	Dear Parent, Your child Ravindu Karunaratne present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:33.393774+05:30
cc443164-19ea-411b-a90e-cd318149fadc	ee855393-dc17-44e8-9851-76fe172f2c53	attendance	sms	766218578	Dear Parent, Your child Shehan De Silva present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:35.127482+05:30
d0331c54-321c-45a5-872f-f99f842458ce	cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	attendance	sms	766218578	Dear Parent, Your child Anjali Perera present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:36.689895+05:30
ee930dce-310b-4d79-94aa-11abb6ed4d28	69ddd74f-769e-4225-bf84-6fe36504a018	attendance	sms	766218578	Dear Parent, Your child Dinushi Silva present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:38.578903+05:30
f8426968-b9d2-4bb2-9a37-f28c719d77e2	17921d74-7486-4d11-98d9-448be5f04af4	attendance	sms	766218578	Dear Parent, Your child Kavindi Fernando present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:40.681278+05:30
44363588-7118-40e0-89cf-17c258b0ad6b	2d58f4c5-44f0-4af8-872f-71f7bec32f12	attendance	sms	766218578	Dear Parent, Your child Nethmi Jayawardena present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:42.273722+05:30
6e688225-74c7-4d6a-b1ce-8f6c007d66ad	821ebc49-8c56-4662-b5fe-dc7da1623cf5	attendance	sms	766218578	Dear Parent, Your child Piumi Senaratne present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:43.959457+05:30
f1a7ac9f-0082-40c5-b894-913b3117be39	f79df6f8-c599-4767-803a-3fa522f7e538	attendance	sms	766218578	Dear Parent, Your child Hashini Bandara present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:45.661982+05:30
6044d7eb-aa07-421d-a38f-ce9c412ac692	b29b84ed-5055-464e-b02d-75f7984db2cd	attendance	sms	766218578	Dear Parent, Your child Umeshi Perera present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:47.184546+05:30
5e8c7265-2058-455c-a13b-8f7d4664448e	a1438d43-6950-4284-882e-a2f24f725c22	attendance	sms	766218578	Dear Parent, Your child Dilki Madushani present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:48.797263+05:30
78a43d1a-8e8e-40ab-8fd9-ecf1116713b2	dbd310a9-cbd9-4e39-916f-280d88424395	attendance	sms	766218578	Dear Parent, Your child Sachini Kumari present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:50.379736+05:30
d341e2ed-e73e-4c14-9419-dc38a25d96f0	7f72d70c-f822-4258-9c60-c49c3b518bb7	attendance	sms	766218578	Dear Parent, Your child Tharushi Sewwandi present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:52.016718+05:30
0390b1d0-f17c-4a67-8747-7d1398ba9056	dcd84cc3-984a-42fe-881b-884251662e6a	attendance	sms	766218578	Dear Parent, Your child Yasasmi Fernando present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:53.623236+05:30
4b243d77-fad1-4e2c-83a6-7c81e7c6578d	eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	attendance	sms	766218578	Dear Parent, Your child Imesha Lakmali present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:55.168895+05:30
6c5c81e4-f239-4252-808a-071b40a775e1	3e57df1b-6a5d-42c4-bf05-43232953ca09	attendance	sms	766218578	Dear Parent, Your child Sanduni Wijeratne present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:56.81687+05:30
eb9c7542-44e4-4323-a6d5-c6adb8558801	43b82bf1-7e23-4c2c-aaca-321b74de92c4	attendance	sms	766218578	Dear Parent, Your child Ayesha Nisansala present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:41:58.42866+05:30
2ceaa620-d724-4e56-9353-eb0313179d95	8d944d69-764c-4af6-837b-e10e1b2fd533	attendance	sms	766218578	Dear Parent, Your child Maleesha Dilrukshi present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:42:00.014238+05:30
fe1728db-0d50-4646-9f89-b494539638e3	22237097-4cab-4b29-8000-d6fc35341589	attendance	sms	766218578	Dear Parent, Your child Hiruni Perera present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:42:01.628295+05:30
ce348f63-4efe-40a5-9630-d447a86836a9	d19da57c-0fe2-4445-9ee1-3666e15dc012	attendance	sms	766218578	Dear Parent, Your child Shashika Hansani present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:42:03.336269+05:30
8b53de51-377b-4051-8f07-5e4b07091f97	dc4c4fcf-cd11-4824-a5fc-b33a2b440563	attendance	sms	766218578	Dear Parent, Your child Nadeesha Madushika present at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:42:04.87571+05:30
04d9e1e7-2c9b-42aa-8421-55fdadadb785	fd83d560-17d1-4063-89e4-b0e56bf19b39	attendance	sms	766218578	Dear Parent, Your child Chamodi Kaushalya absent at school on 07/07/2026 at Grade 1 Class C.	sent	2026-07-07 10:42:06.510266+05:30
3e4fffef-6696-4fc1-9fa0-9a9307efde3d	6c37736f-b10a-4262-8ae3-9dd9087e5099	attendance	sms	766218578	Dear Parent, Your child Sewmini Jayasuriya late at school on 07/07/2026 at Grade 1 Class C. Reason: Transport Issues.	sent	2026-07-07 10:42:08.065042+05:30
d877aeed-fe44-499c-8a20-6e16c5e7167f	53d675a4-a5b1-4f09-8034-e00cbd9a460c	attendance	sms	0766218578	Dear Parent, Your child Ashadi present at school on 07/07/2026 at Grade 9 Class A.	sent	2026-07-07 10:42:09.789012+05:30
70e3d059-bce0-437d-8d3d-d986b73b73a5	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	attendance	sms	766218578	Dear Parent, Your child Sahan Perera present at school on 07/07/2026 at Grade 9 Class A.	sent	2026-07-07 10:42:11.413182+05:30
72b54576-ff59-4c27-ba2e-537d0671886f	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	attendance	sms	766218578	Dear Parent, Your child Thisun Perera present at school on 07/07/2026 at Grade 9 Class A.	sent	2026-07-07 10:42:12.909611+05:30
68a69b82-2290-4f68-8408-ae0afe771ff6	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	attendance	sms	0766218578	Dear Parent, Your child Mithuni Perera absent at school on 07/07/2026 at Grade 9 Class A.	sent	2026-07-07 10:42:14.779691+05:30
9c9607d4-2e8f-4158-b42f-b6871c62e042	eb48778c-f7c9-4361-be6f-8d9a2eccab19	attendance	sms	766218578	Dear Parent, Your child Dasuni almeda present at school on 07/07/2026 at Grade 9 Class A.	sent	2026-07-07 10:42:16.307841+05:30
e81730d5-ce21-4f39-bf0b-8e715a9c85e0	742d2ddc-aa8a-4090-aebd-4af2df9821f5	attendance	sms	766218578	Dear Parent, Your child Ashen Wijesinghe present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:17.812036+05:30
36d58b22-87ed-4921-9dc5-31209ad9db7b	e8decff2-9160-4569-ac1d-711423e514a9	attendance	sms	766218578	Dear Parent, Your child Piumi Senanayake present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:19.305563+05:30
3417bac3-89a5-4027-8300-e20d4978328a	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	attendance	sms	766218578	Dear Parent, Your child Lakshan Peris present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:20.872188+05:30
cb291f98-c23e-4c0e-89c5-f548ba20a80b	60a28492-4654-4cbb-98fc-b1c49ca1303c	attendance	sms	766218578	Dear Parent, Your child Hiruni Madushika absent at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:22.394021+05:30
7865baa7-6475-4bac-9140-fe942f88f285	b2540f04-3218-465c-9c23-c61dc3c7b1fb	attendance	sms	766218578	Dear Parent, Your child Dilshan Karunaratne absent at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:24.040774+05:30
9d5b5b9d-aedf-40fe-980f-ff75654962d5	ea289faa-0c02-495a-923c-049ff2c481a6	attendance	sms	766218578	Dear Parent, Your child Nethmi Peiris present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:25.513034+05:30
b8e9f612-4567-4f7d-9960-66c0dd8e4b55	845cf7b4-50ec-45ae-bfd9-6d669c02f537	attendance	sms	766218578	Dear Parent, Your child Sajith Ranasinghe present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:27.050015+05:30
920bc22a-e195-4ba4-bb2f-a573a535e54c	0351f9a0-303c-4504-8941-ee3e1a1c592f	attendance	sms	766218578	Dear Parent, Your child Imesha Fernando absent at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:28.587701+05:30
ae2f7949-2740-4de7-afbd-89054374986f	aa18c05c-e280-453c-a87f-a368f8ad7de9	attendance	sms	766218578	Dear Parent, Your child Kavindu Wickramasinghe present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:30.115769+05:30
4b0a27a9-fb3f-46aa-bf0e-8ce1776cacf2	74fe90b4-501f-4458-be0b-bcc42f08df21	attendance	sms	766218578	Dear Parent, Your child Tharushi Silva present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:31.755233+05:30
a7270405-2eca-4c5e-846e-f5b93433b2b2	ea3a30af-37a6-43e5-ade7-a7323f267787	attendance	sms	766218578	Dear Parent, Your child Pasindu Gunawardena present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:33.294084+05:30
a42465cb-3d9c-4cb6-8a44-03db014ab270	4effd2d5-edf7-408f-8dc9-53705a2e2255	attendance	sms	766218578	Dear Parent, Your child Yasara Ekanayake present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:34.87786+05:30
502dfc70-36b2-4cb5-8500-a01a60801cf8	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	attendance	sms	766218578	Dear Parent, Your child Chamodi Rajapaksha present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:36.356333+05:30
3619e240-d494-4805-bdcd-5fe2d9c009fb	bf0a7707-1978-4a11-a011-4de82a53161f	attendance	sms	766218578	Dear Parent, Your child Vihanga De Silva absent at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:37.934303+05:30
ed41db07-a16e-48cf-81b9-029134350d57	8251e1df-58ea-4d12-b02e-3062e78df907	attendance	sms	766218578	Dear Parent, Your child Nipun Samarasinghe present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:39.435444+05:30
eb5bd527-d32f-4e45-acb3-b15e5f4ad940	3c288a85-886b-4e7d-a721-7244770314f5	attendance	sms	766218578	Dear Parent, Your child Sanduni Jayawardena present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:41.003053+05:30
9cb641af-fd99-4dab-afc2-6d26f83e078f	4537a978-3748-49c4-bef2-8e95a922e0df	attendance	sms	766218578	Dear Parent, Your child Charith Bandara present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:42.54378+05:30
ac78e945-b436-4983-a83a-2a9755a9a67b	583eb113-b74f-49f6-a0ba-cfb50dae6699	attendance	sms	766218578	Dear Parent, Your child Madhavi Kulathunga present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:44.118861+05:30
be7df3fe-7a63-48fa-9fe4-b525ff07d152	bd0a9878-cf3f-40e8-889f-c0f4ec694135	attendance	sms	766218578	Dear Parent, Your child Shehan Rodrigo present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:45.628664+05:30
97fd4c29-2ded-4813-8f01-aa236f70fc63	7ad6633e-67bd-429c-8440-f0d9ffb52c79	attendance	sms	766218578	Dear Parent, Your child Ayesha Pathum present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:47.149517+05:30
9a62d6a6-2f04-4b50-b355-17edf82151c6	e25d2a9a-fdba-4864-bb94-013daa7e5de0	attendance	sms	766218578	Dear Parent, Your child Kamal Perera present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:48.751321+05:30
39cc5ba5-3a0e-43fb-8379-5cef3fe36612	1534d25e-7fac-483a-9c8b-bccacdf111f0	attendance	sms	766218578	Dear Parent, Your child Nimal Silva present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:50.360219+05:30
87575b99-74e1-48fe-a6c9-6528db0c0ea8	d1edde10-3f65-4719-bcd3-78559468e971	attendance	sms	766218578	Dear Parent, Your child Sunil Fernando present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:51.857865+05:30
daf671b1-01a4-4331-b4f6-50ac23da6fe9	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	attendance	sms	766218578	Dear Parent, Your child Kasun Jayasinghe present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:53.371554+05:30
73adcbf9-2342-4c49-96d6-6d8e354588ad	83db7a74-a6fa-488b-bd32-cd5af189bbd8	attendance	sms	766218578	Dear Parent, Your child Dinesh Bandara present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:55.169143+05:30
01ceec47-3f14-4573-b94c-cf101d5bca0f	7f54343e-a2c5-4acf-acd9-87c519f072c8	attendance	sms	766218578	Dear Parent, Your child Ruwan Kumara present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:56.66188+05:30
cad40bbc-3345-48db-9750-7f94c6160aa4	d730bf85-51ee-486b-a05f-b5e9feb19768	attendance	sms	766218578	Dear Parent, Your child Saman Gunawardena present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:58.193833+05:30
ca3b1a60-8bf2-481a-b2c7-a950279270e3	cdd0fae5-dbda-4df3-a312-61c7e6974419	attendance	sms	766218578	Dear Parent, Your child Chathura Rajapaksha present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:42:59.686931+05:30
00ef48bf-0332-42c8-9e61-7e96fd966d94	b4d82430-3e05-48a3-8f7d-28c94446aa00	attendance	sms	766218578	Dear Parent, Your child Lahiru Ekanayake present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:01.225654+05:30
bd185b5e-993b-42e4-b0c8-efbf0bf016ca	3960abbd-b2fc-4ecc-ba9f-965b756be518	attendance	sms	766218578	Dear Parent, Your child Tharindu Wijesinghe present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:03.377394+05:30
b4361444-6c4e-46a0-bc30-0c32560d8913	71d4ec30-abdb-4dff-a672-47b47604f20e	attendance	sms	766218578	Dear Parent, Your child Ishara Dias present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:04.863496+05:30
39b08fc3-4e9d-4b68-9254-143285d54906	a6a60d97-3011-49c5-ae68-a11ade339992	attendance	sms	766218578	Dear Parent, Your child Dilshan Karunaratne absent at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:06.325863+05:30
b9dd4e7a-bf0d-495b-9bd4-8bf747927e17	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	attendance	sms	766218578	Dear Parent, Your child Prabath Senanayake present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:07.999786+05:30
b605e404-b233-4ad3-93bb-b7684de2653b	75e7cc1e-02df-46c8-8235-7e0d43a4f520	attendance	sms	766218578	Dear Parent, Your child Gayan Madushanka present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:09.558588+05:30
056b536c-69cd-45c5-bd6e-073d2c00cfa2	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	attendance	sms	766218578	Dear Parent, Your child Shehan Peiris absent at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:11.074826+05:30
c32a3181-06bb-4a08-8835-91663290e535	9029eb7c-ace9-41e8-a889-d92468fe16cd	attendance	sms	766218578	Dear Parent, Your child Nadeesha Abeysekara present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:12.551304+05:30
4db12a58-8364-433e-89bd-00f781870d39	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	attendance	sms	766218578	Dear Parent, Your child Rashmi Rathnayake present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:14.125258+05:30
cf2f91a9-f382-4a72-9607-ec9140699f33	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	attendance	sms	766218578	Dear Parent, Your child Sachini Hettiarachchi present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:15.629178+05:30
54e3848d-2f44-40e9-9978-fc76666aebee	3431c363-c8e1-4e66-9d56-b5eb0cda9723	attendance	sms	766218578	Dear Parent, Your child Thilini Pathirana present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:17.092426+05:30
475316d2-657c-4cf0-a499-fde4ae1848b8	bb813af3-4184-4512-bb63-32fba48db8a0	attendance	sms	766218578	Dear Parent, Your child Madushi De Mel present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:18.623056+05:30
1ff9c856-a582-45ee-86d5-52d495e710c0	9a02ca9b-0234-4504-8ab5-2d4362f4d651	attendance	sms	0766218578	Dear Parent, Your child Nadun Lakshitha present at school on 07/07/2026 at Grade 2 Class A.	sent	2026-07-07 10:43:20.157095+05:30
e3b89964-a231-40d3-8101-af92f5433108	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	term_test	sms	94766218578	Dear Samantha Siriwardana, Adeesha Siriwardana's Term 1 Grade 1 Class B marks have been released.\nClass Rank: 1\nTotal Marks: 326\nBuddhism - 78\nEnvironment - 90\nMathematics - 80\nSinhala - 78	sent	2026-07-08 10:27:27.798507+05:30
16b84202-1d88-45db-ba8b-348d6462cf65	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	term_test	email	pubudulakshan72@gmail.com	Dear Samantha Siriwardana, Adeesha Siriwardana's Term 1 Grade 1 Class B marks have been released.\nClass Rank: 1\nTotal Marks: 326\nBuddhism - 78\nEnvironment - 90\nMathematics - 80\nSinhala - 78	sent	2026-07-08 10:27:31.853597+05:30
e793be1b-42a9-41ad-a400-61cca9676379	b24a3354-4780-415a-9934-aebff21f9096	term_test	sms	94766218578	Dear Upananda Jayasinghe, Dimuthu Lakshan's Term 1 Grade 1 Class B marks have been released.\nClass Rank: 2\nTotal Marks: 317\nBuddhism - 67\nEnvironment - 78\nMathematics - 80\nSinhala - 92	sent	2026-07-08 10:27:33.450852+05:30
b717a188-0f6e-4b6d-981f-b179bacedf54	b24a3354-4780-415a-9934-aebff21f9096	term_test	email	pubudulakshan72@gmail.com	Dear Upananda Jayasinghe, Dimuthu Lakshan's Term 1 Grade 1 Class B marks have been released.\nClass Rank: 2\nTotal Marks: 317\nBuddhism - 67\nEnvironment - 78\nMathematics - 80\nSinhala - 92	sent	2026-07-08 10:27:37.291362+05:30
26333061-87db-459b-87d4-d996946fa2d2	877deab2-5b88-4573-8fce-c4e52706b7e0	term_test	sms	94766218578	Dear Aruna Perara, Maheeshi Savindya's Term 1 Grade 1 Class B marks have been released.\nClass Rank: 3\nTotal Marks: 300\nBuddhism - 56\nEnvironment - 98\nMathematics - 90\nSinhala - 56	sent	2026-07-08 10:27:39.094875+05:30
35ded339-31cd-46e5-8691-54252b1534a8	b24a3354-4780-415a-9934-aebff21f9096	term_test	sms	94766218578	Dear Upananda Jayasinghe, Dimuthu Lakshan's Term 3 Grade 1 Class B marks have been released.\nClass Rank: 1\nTotal Marks: 309\nBuddhism - 78\nEnvironment - 78\nMathematics - 75\nSinhala - 78	sent	2026-07-08 10:27:40.625533+05:30
1ad4433f-b924-48ef-8104-6b2cc1103451	877deab2-5b88-4573-8fce-c4e52706b7e0	term_test	email	pubudulakshan72@gmail.com	Dear Aruna Perara, Maheeshi Savindya's Term 1 Grade 1 Class B marks have been released.\nClass Rank: 3\nTotal Marks: 300\nBuddhism - 56\nEnvironment - 98\nMathematics - 90\nSinhala - 56	sent	2026-07-08 10:27:43.073604+05:30
576d85ef-857d-4c39-abcc-ce47757aca5f	b24a3354-4780-415a-9934-aebff21f9096	term_test	email	pubudulakshan72@gmail.com	Dear Upananda Jayasinghe, Dimuthu Lakshan's Term 3 Grade 1 Class B marks have been released.\nClass Rank: 1\nTotal Marks: 309\nBuddhism - 78\nEnvironment - 78\nMathematics - 75\nSinhala - 78	sent	2026-07-08 10:27:44.294241+05:30
7d89c7f6-3dad-46cd-8dfe-e369cc96923a	af93e596-e524-4830-b1e6-78051eb850b6	term_test	sms	94766218578	Dear Seetha perra, Maneesha Gimhan's Term 1 Grade 1 Class B marks have been released.\nClass Rank: 4\nTotal Marks: 291\nBuddhism - 67\nEnvironment - 67\nMathematics - 90\nSinhala - 67	sent	2026-07-08 10:27:44.56065+05:30
974886dd-c434-4576-8ee7-22097e7b80d3	5e956353-c70e-4433-aa21-cf0a9bcf3602	attendance	sms	0766218578	Dear Parent, Your child Piyath present at school on 08/07/2026 at Grade 6 Class A.	sent	2026-07-08 10:41:44.207599+05:30
e885199b-f8d0-4701-a0ba-6ecb36cfd358	877deab2-5b88-4573-8fce-c4e52706b7e0	term_test	sms	94766218578	Dear Aruna Perara, Maheeshi Savindya's Term 3 Grade 1 Class B marks have been released.\nClass Rank: 2\nTotal Marks: 305\nBuddhism - 89\nEnvironment - 89\nMathematics - 60\nSinhala - 67	sent	2026-07-08 10:27:46.208881+05:30
df7c48d4-f506-494a-9986-a12e2f073bf5	af93e596-e524-4830-b1e6-78051eb850b6	term_test	email	pubudulakshan72@gmail.com	Dear Seetha perra, Maneesha Gimhan's Term 1 Grade 1 Class B marks have been released.\nClass Rank: 4\nTotal Marks: 291\nBuddhism - 67\nEnvironment - 67\nMathematics - 90\nSinhala - 67	sent	2026-07-08 10:27:48.43695+05:30
aaa6c2ca-8036-492e-896e-effb48749a7e	877deab2-5b88-4573-8fce-c4e52706b7e0	term_test	email	pubudulakshan72@gmail.com	Dear Aruna Perara, Maheeshi Savindya's Term 3 Grade 1 Class B marks have been released.\nClass Rank: 2\nTotal Marks: 305\nBuddhism - 89\nEnvironment - 89\nMathematics - 60\nSinhala - 67	sent	2026-07-08 10:27:50.68206+05:30
da7957ef-9675-4097-b828-f3be45e937c4	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	term_test	sms	94766218578	Dear Samantha Siriwardana, Adeesha Siriwardana's Term 3 Grade 1 Class B marks have been released.\nClass Rank: 3\nTotal Marks: 291\nBuddhism - 67\nEnvironment - 67\nMathematics - 70\nSinhala - 87	sent	2026-07-08 10:27:52.205886+05:30
034d1f34-ff4c-4f44-be29-23f3d5697428	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	term_test	email	pubudulakshan72@gmail.com	Dear Samantha Siriwardana, Adeesha Siriwardana's Term 3 Grade 1 Class B marks have been released.\nClass Rank: 3\nTotal Marks: 291\nBuddhism - 67\nEnvironment - 67\nMathematics - 70\nSinhala - 87	sent	2026-07-08 10:27:56.020967+05:30
cb5dc3a0-14c5-4e75-8db1-a94418e893fa	af93e596-e524-4830-b1e6-78051eb850b6	term_test	sms	94766218578	Dear Seetha perra, Maneesha Gimhan's Term 3 Grade 1 Class B marks have been released.\nClass Rank: 4\nTotal Marks: 191\nBuddhism - 56\nEnvironment - 45\nMathematics - 45\nSinhala - 45	sent	2026-07-08 10:27:57.627681+05:30
c6997b92-b346-4ed5-b209-fedb7d8d956f	af93e596-e524-4830-b1e6-78051eb850b6	term_test	email	pubudulakshan72@gmail.com	Dear Seetha perra, Maneesha Gimhan's Term 3 Grade 1 Class B marks have been released.\nClass Rank: 4\nTotal Marks: 191\nBuddhism - 56\nEnvironment - 45\nMathematics - 45\nSinhala - 45	sent	2026-07-08 10:28:01.553211+05:30
452f8244-08c2-4dcf-b278-6a8563d93485	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	attendance	sms	0766218578	Dear Parent, Your child Adeesha Siriwardana present at school on 08/07/2026 at Grade 1 Class B.	sent	2026-07-08 10:40:51.44634+05:30
9b6bc26f-d727-432f-8fce-f28bc3be4e9f	af93e596-e524-4830-b1e6-78051eb850b6	attendance	sms	766218578	Dear Parent, Your child Maneesha Gimhan present at school on 08/07/2026 at Grade 1 Class B.	sent	2026-07-08 10:40:53.006167+05:30
0c76e7e2-32ac-4cd8-b55a-9d4678c79aa2	877deab2-5b88-4573-8fce-c4e52706b7e0	attendance	sms	766218578	Dear Parent, Your child Maheeshi Savindya absent at school on 08/07/2026 at Grade 1 Class B.	sent	2026-07-08 10:40:54.565596+05:30
e1f155ff-e0aa-41e0-a7f4-b4735202b267	b24a3354-4780-415a-9934-aebff21f9096	attendance	sms	766218578	Dear Parent, Your child Dimuthu Lakshan present at school on 08/07/2026 at Grade 1 Class B.	sent	2026-07-08 10:40:56.125943+05:30
64f6dbf0-8be5-40e4-9366-f5fd95da632d	0314a791-ea42-429e-a632-38e8dd8ecdde	attendance	sms	0766218578	Dear Parent, Your child Tharushi Sithara absent at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:40:57.765555+05:30
931f7d56-a47c-4ce9-9372-0115cc80fbaf	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	attendance	sms	0766218578	Dear Parent, Your child Nadum present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:40:59.338337+05:30
8c7d8f4c-b543-49ae-9042-3c4a71cadc38	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	attendance	sms	0766218578	Dear Parent, Your child Amindu present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:01.052189+05:30
f6254ba7-e42f-4556-8fbc-1c0a32b43c6b	adbe2730-fe44-44ac-bee9-f8888cf50569	attendance	sms	0715436047	Dear Parent, Your child Lashan wasudewa present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:02.655736+05:30
f7c73721-1923-4b56-9a41-bca8c4193b96	a50e217d-21ce-415d-8035-c37b3cf89a71	attendance	sms	0766218578	Dear Parent, Your child Yasiru Nawod present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:04.328005+05:30
1c6b9d5c-a28f-4297-97ac-cefb0904534b	186e3d3e-396c-411c-9ed0-8b19aa596e15	attendance	sms	766218578	Dear Parent, Your child Charuni Saleeka present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:05.967792+05:30
f6d0581e-0730-4f54-a3d1-edf8a9030ec9	db2737be-154b-4e11-961a-f605558ef0eb	attendance	sms	766218578	Dear Parent, Your child Bithula Pramod present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:08.725528+05:30
a84c7116-a416-4f10-a5cf-6c182ce2cd8d	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	attendance	sms	0766218578	Dear Parent, Your child Thilini present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:10.287492+05:30
b1346b0b-6951-4d17-9b55-b186b8669a31	e3ded0b9-e857-4b32-83b9-7c167372a544	attendance	sms	766218578	Dear Parent, Your child Rashila present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:11.886216+05:30
a45dcf2d-2f0d-41cd-96f1-409b7df57e0d	93667668-78ac-408a-a626-267a7d2607ab	attendance	sms	0766218578	Dear Parent, Your child Suhara present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:13.526276+05:30
c975ea38-9b37-4f09-90b6-a8c5d6bbc24a	3870b309-9c01-4c72-af60-1338fc95f35d	attendance	sms	0766218578	Dear Parent, Your child Suhara absent at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:15.086154+05:30
96a42b44-e235-420e-8f9c-26226962b9d2	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	attendance	sms	0766218578	Dear Parent, Your child gayeni absent at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:16.696341+05:30
59eb7cf5-3073-474d-971e-56a9b15060c3	2da0cce0-e401-4a70-b12c-bfaf452c6593	attendance	sms	0766218578	Dear Parent, Your child Jane Silva present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:18.265887+05:30
291eed22-f169-4402-ae75-16bb59c6658c	ac21cfd7-4584-466d-a740-eb25d6baca2d	attendance	sms	0766218578	Dear Parent, Your child Chichi absent at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:19.805357+05:30
42b76a20-7b77-41cd-9b88-98471a10bd9b	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	attendance	sms	0766218578	Dear Parent, Your child Maleesha present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:22.007663+05:30
4ae00dc4-9568-4f14-a8c8-a97f162910a9	d16622d3-5780-4188-b1d9-67254a2e59c2	attendance	sms	0766218578	Dear Parent, Your child Limini absent at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:23.527515+05:30
51a6ac97-ca70-4d53-bfff-003e21b1bfa2	836fd154-cdfd-49f0-82eb-a55e67ec7406	attendance	sms	0766218578	Dear Parent, Your child Aseni present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:25.129422+05:30
0ecefcd1-31f9-422a-9908-0afc9a9f605f	5dd90925-434b-4342-9691-392bb979b295	attendance	sms	0766218578	Dear Parent, Your child Matheesha present at school on 08/07/2026 at Grade 1 Class A.	sent	2026-07-08 10:41:26.809256+05:30
1416087e-3d53-432a-a2fe-d181664c8558	53d675a4-a5b1-4f09-8034-e00cbd9a460c	attendance	sms	0766218578	Dear Parent, Your child Ashadi present at school on 08/07/2026 at Grade 9 Class A.	sent	2026-07-08 10:41:28.387653+05:30
34a19a07-790b-4ba0-84ea-adb294e409c3	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	attendance	sms	766218578	Dear Parent, Your child Sahan Perera present at school on 08/07/2026 at Grade 9 Class A.	sent	2026-07-08 10:41:29.967595+05:30
dcaeb58a-3115-4062-94d3-7d02d73e64da	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	attendance	sms	766218578	Dear Parent, Your child Thisun Perera absent at school on 08/07/2026 at Grade 9 Class A.	sent	2026-07-08 10:41:31.527511+05:30
58db3602-1bc3-4a3c-8d3f-7319bdc07298	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	attendance	sms	0766218578	Dear Parent, Your child Mithuni Perera absent at school on 08/07/2026 at Grade 9 Class A.	sent	2026-07-08 10:41:33.089146+05:30
c36a4559-59b6-41e1-852a-df30d52b9c2e	eb48778c-f7c9-4361-be6f-8d9a2eccab19	attendance	sms	766218578	Dear Parent, Your child Dasuni almeda present at school on 08/07/2026 at Grade 9 Class A.	sent	2026-07-08 10:41:34.687707+05:30
37e3f489-1e6d-40e3-87f7-e34911728920	7b6562b8-be72-4df1-a0b9-702c9ceec431	attendance	sms	0766218578	Dear Parent, Your child Ramith Silva present at school on 08/07/2026 at Grade 3 Class A.	sent	2026-07-08 10:41:36.248156+05:30
c6694287-4936-4f83-9f11-e3c66ebc8312	f6a128a7-8725-4952-bd78-cf852e1846a8	attendance	sms	0766218578	Dear Parent, Your child Shalini Perera absent at school on 08/07/2026 at Grade 3 Class A.	sent	2026-07-08 10:41:37.848106+05:30
add500c5-91fc-47a1-bf10-8ea1002c4ea8	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	attendance	sms	0766218578	Dear Parent, Your child Saleeka present at school on 08/07/2026 at Grade 6 Class A.	sent	2026-07-08 10:41:39.448376+05:30
ee7ac5ac-03a6-4fbb-86d7-71619025f5a8	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	attendance	sms	0766218578	Dear Parent, Your child Ridmi absent at school on 08/07/2026 at Grade 6 Class A.	sent	2026-07-08 10:41:40.978328+05:30
3e7129d1-36b9-41db-a300-db557836b2f8	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	attendance	sms	0766218578	Dear Parent, Your child Namal absent at school on 08/07/2026 at Grade 6 Class A.	sent	2026-07-08 10:41:42.567687+05:30
ca3cb6cd-2b1a-4ecf-b30e-0a2466a2b464	00999c6b-5480-499d-9e70-a99987eb9d64	attendance	sms	0766218578	Dear Parent, Your child Janani Ishara absent at school on 08/07/2026 at Grade 6 Class A.	sent	2026-07-08 10:41:45.789446+05:30
365e34bc-20c9-45cb-884a-2259305bef08	b47af724-c5f2-4b30-b5c1-9add8ca43645	attendance	sms	0766218578	Dear Parent, Your child Heshani present at school on 08/07/2026 at Grade 6 Class A.	sent	2026-07-08 10:41:47.529779+05:30
ce131e3f-df05-485a-8ecd-d3d2f403881c	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	attendance	sms	0766218578	Dear Parent, Your child Saleeka absent at school on 09/07/2026 at Grade 6 Class A.	sent	2026-07-09 10:40:19.442553+05:30
5711d124-1081-4b86-8cc9-25f209ffcb60	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	attendance	sms	0766218578	Dear Parent, Your child Ridmi absent at school on 09/07/2026 at Grade 6 Class A.	sent	2026-07-09 10:40:21.085874+05:30
3e03c6c8-220c-4a00-8fc1-8af0c9a1aa36	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	attendance	sms	0766218578	Dear Parent, Your child Namal late at school on 09/07/2026 at Grade 6 Class A. Reason: Transport Issues.	sent	2026-07-09 10:40:22.603727+05:30
c6c8ce6f-d00b-4eaf-bd81-0a2a75b589a7	5e956353-c70e-4433-aa21-cf0a9bcf3602	attendance	sms	0766218578	Dear Parent, Your child Piyath absent at school on 09/07/2026 at Grade 6 Class A.	sent	2026-07-09 10:40:24.079705+05:30
d9421642-5993-419c-90f3-60db51bcd9a1	00999c6b-5480-499d-9e70-a99987eb9d64	attendance	sms	0766218578	Dear Parent, Your child Janani Ishara present at school on 09/07/2026 at Grade 6 Class A.	sent	2026-07-09 10:40:25.615708+05:30
56f592cb-f217-4e97-a435-f506d90af18b	b47af724-c5f2-4b30-b5c1-9add8ca43645	attendance	sms	0766218578	Dear Parent, Your child Heshani present at school on 09/07/2026 at Grade 6 Class A.	sent	2026-07-09 10:40:27.140118+05:30
6979fbe5-a327-4f60-9099-a95102586b8a	742d2ddc-aa8a-4090-aebd-4af2df9821f5	attendance	sms	766218578	Dear Parent, Your child Ashen Wijesinghe present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:19.75124+05:30
19a77ac1-07d0-491c-827d-383f83c71cc4	e8decff2-9160-4569-ac1d-711423e514a9	attendance	sms	766218578	Dear Parent, Your child Piumi Senanayake absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:22.242772+05:30
9b18bb94-d928-4ec7-bc7b-e2f03b25e0fd	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	attendance	sms	766218578	Dear Parent, Your child Lakshan Peris absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:23.758358+05:30
40d32aaa-17f8-457c-b352-265735d10e7b	60a28492-4654-4cbb-98fc-b1c49ca1303c	attendance	sms	766218578	Dear Parent, Your child Hiruni Madushika absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:25.269191+05:30
68f190d4-7e10-4612-a59b-659492e9fd4c	b2540f04-3218-465c-9c23-c61dc3c7b1fb	attendance	sms	766218578	Dear Parent, Your child Dilshan Karunaratne present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:26.764075+05:30
63deb64c-63b8-4104-aed3-18230e5acacf	ea289faa-0c02-495a-923c-049ff2c481a6	attendance	sms	766218578	Dear Parent, Your child Nethmi Peiris present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:28.338318+05:30
71fc1f35-a706-4659-a738-1ec9032243db	845cf7b4-50ec-45ae-bfd9-6d669c02f537	attendance	sms	766218578	Dear Parent, Your child Sajith Ranasinghe absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:30.693918+05:30
ed2b4c70-b18f-4737-bc54-de00c521abb5	0351f9a0-303c-4504-8941-ee3e1a1c592f	attendance	sms	766218578	Dear Parent, Your child Imesha Fernando absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:32.194135+05:30
c1e401e6-7dec-4a6e-9254-c1ec04698b03	aa18c05c-e280-453c-a87f-a368f8ad7de9	attendance	sms	766218578	Dear Parent, Your child Kavindu Wickramasinghe absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:33.749601+05:30
d40b93a1-2dc5-4241-a018-2e5f39ac45cc	74fe90b4-501f-4458-be0b-bcc42f08df21	attendance	sms	766218578	Dear Parent, Your child Tharushi Silva present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:35.337762+05:30
4f8e0ca0-b3db-4c9f-9870-c063cc3353f3	ea3a30af-37a6-43e5-ade7-a7323f267787	attendance	sms	766218578	Dear Parent, Your child Pasindu Gunawardena absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:36.855611+05:30
41c36f6c-1760-4b6e-b512-70a53729c357	4effd2d5-edf7-408f-8dc9-53705a2e2255	attendance	sms	766218578	Dear Parent, Your child Yasara Ekanayake present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:38.407372+05:30
bacf951f-5708-4980-856b-4025d48be092	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	attendance	sms	766218578	Dear Parent, Your child Chamodi Rajapaksha absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:39.893628+05:30
1b0ed175-9979-48b8-b427-e14bb38b0ad0	bf0a7707-1978-4a11-a011-4de82a53161f	attendance	sms	766218578	Dear Parent, Your child Vihanga De Silva present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:41.426231+05:30
91321887-9f57-4424-bc2e-8ac2d17e29cb	8251e1df-58ea-4d12-b02e-3062e78df907	attendance	sms	766218578	Dear Parent, Your child Nipun Samarasinghe present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:42.947757+05:30
4188cf0e-8180-4f79-9a4d-5151f6828438	3c288a85-886b-4e7d-a721-7244770314f5	attendance	sms	766218578	Dear Parent, Your child Sanduni Jayawardena present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:44.468705+05:30
4341bfa4-e27e-4b41-b649-5c3ce704160d	4537a978-3748-49c4-bef2-8e95a922e0df	attendance	sms	766218578	Dear Parent, Your child Charith Bandara present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:45.999585+05:30
048a9d49-a8af-4d4b-9938-da2794c9fa0f	583eb113-b74f-49f6-a0ba-cfb50dae6699	attendance	sms	766218578	Dear Parent, Your child Madhavi Kulathunga present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:47.550256+05:30
fce324fd-3b95-451b-bf41-51b513f345f4	bd0a9878-cf3f-40e8-889f-c0f4ec694135	attendance	sms	766218578	Dear Parent, Your child Shehan Rodrigo present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:49.061964+05:30
9d7e8555-e741-43dc-aab5-21b36e231b0b	7ad6633e-67bd-429c-8440-f0d9ffb52c79	attendance	sms	766218578	Dear Parent, Your child Ayesha Pathum present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:50.652272+05:30
ef677e0c-b9a6-45bb-98a1-e4e9cfcc776c	e25d2a9a-fdba-4864-bb94-013daa7e5de0	attendance	sms	766218578	Dear Parent, Your child Kamal Perera present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:52.800705+05:30
adf9b42e-700c-4822-bbe3-c3531b899305	1534d25e-7fac-483a-9c8b-bccacdf111f0	attendance	sms	766218578	Dear Parent, Your child Nimal Silva present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:54.405064+05:30
034c2cd9-3887-469b-9b9d-b9f5a6c5a403	d1edde10-3f65-4719-bcd3-78559468e971	attendance	sms	766218578	Dear Parent, Your child Sunil Fernando present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:55.948456+05:30
b0676646-5224-4291-ae31-7df3af1282b7	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	attendance	sms	766218578	Dear Parent, Your child Kasun Jayasinghe absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:57.461317+05:30
596e49d7-3b8a-40e9-878c-b26bd2dd1d8a	83db7a74-a6fa-488b-bd32-cd5af189bbd8	attendance	sms	766218578	Dear Parent, Your child Dinesh Bandara present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:20:58.964979+05:30
79fc7f2e-4e5f-4b19-8b24-bf57a516f143	7f54343e-a2c5-4acf-acd9-87c519f072c8	attendance	sms	766218578	Dear Parent, Your child Ruwan Kumara absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:00.463309+05:30
36a626da-ca8b-4d78-b417-806c4b507d70	d730bf85-51ee-486b-a05f-b5e9feb19768	attendance	sms	766218578	Dear Parent, Your child Saman Gunawardena present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:02.065115+05:30
8b44c6a7-c0a7-4148-8b16-a5e63ac88902	cdd0fae5-dbda-4df3-a312-61c7e6974419	attendance	sms	766218578	Dear Parent, Your child Chathura Rajapaksha present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:03.557865+05:30
08bb79f0-03b0-4c88-8669-623ab02090c4	b4d82430-3e05-48a3-8f7d-28c94446aa00	attendance	sms	766218578	Dear Parent, Your child Lahiru Ekanayake absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:05.087131+05:30
19bfffb2-4662-4c0e-ba99-e143b2013677	3960abbd-b2fc-4ecc-ba9f-965b756be518	attendance	sms	766218578	Dear Parent, Your child Tharindu Wijesinghe absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:07.27695+05:30
71b605b5-510c-4e3a-9551-145b8bea6627	71d4ec30-abdb-4dff-a672-47b47604f20e	attendance	sms	766218578	Dear Parent, Your child Ishara Dias present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:08.74913+05:30
0a66bf20-e05f-432b-9913-3d726f472281	a6a60d97-3011-49c5-ae68-a11ade339992	attendance	sms	766218578	Dear Parent, Your child Dilshan Karunaratne absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:10.260176+05:30
8b5829a9-93b4-4e1f-a7c4-6cb5f56e2217	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	attendance	sms	766218578	Dear Parent, Your child Prabath Senanayake present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:11.83436+05:30
a4f102bc-8a0a-4db9-bc75-f85ef2625a48	75e7cc1e-02df-46c8-8235-7e0d43a4f520	attendance	sms	766218578	Dear Parent, Your child Gayan Madushanka absent at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:13.341586+05:30
608b195f-70b7-4272-8895-6292db73ee37	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	attendance	sms	766218578	Dear Parent, Your child Shehan Peiris present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:14.994857+05:30
40764fb2-9b10-4aa8-a769-4b65d7d2d84d	9029eb7c-ace9-41e8-a889-d92468fe16cd	attendance	sms	766218578	Dear Parent, Your child Nadeesha Abeysekara present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:16.486198+05:30
a21a33ed-b415-4b4d-872b-1b8d6ba19ff6	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	attendance	sms	766218578	Dear Parent, Your child Rashmi Rathnayake present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:18.048758+05:30
99f84d4c-20fd-4450-8337-e67133300306	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	attendance	sms	766218578	Dear Parent, Your child Sachini Hettiarachchi present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:19.530552+05:30
7ff9c978-5e32-4b54-a409-268506ccbb03	3431c363-c8e1-4e66-9d56-b5eb0cda9723	attendance	sms	766218578	Dear Parent, Your child Thilini Pathirana present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:21.072566+05:30
c1acabb6-7917-409c-a591-6c6c3d21f3e7	bb813af3-4184-4512-bb63-32fba48db8a0	attendance	sms	766218578	Dear Parent, Your child Madushi De Mel present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:22.612012+05:30
37c9e5e9-0468-4206-9019-5e4b0d6867de	9a02ca9b-0234-4504-8ab5-2d4362f4d651	attendance	sms	0766218578	Dear Parent, Your child Nadun Lakshitha present at school on 09/07/2026 at Grade 2 Class A.	sent	2026-07-09 11:21:24.099987+05:30
a4f11892-6d9a-437c-b55f-3c0b5c5ef865	0314a791-ea42-429e-a632-38e8dd8ecdde	attendance	sms	0766218578	Dear Parent, Your child Tharushi Sithara present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:25.627462+05:30
5f49e91a-960b-4d92-9ebf-8575697353e2	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	attendance	sms	0766218578	Dear Parent, Your child Nadum present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:27.11818+05:30
08bccbc9-8180-449d-9b88-9842aea66221	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	attendance	sms	0766218578	Dear Parent, Your child Amindu present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:28.631978+05:30
eea3483d-2af5-42de-b225-75c9cd644e75	adbe2730-fe44-44ac-bee9-f8888cf50569	attendance	sms	0715436047	Dear Parent, Your child Lashan wasudewa present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:30.183761+05:30
0e3e9c8f-8ddc-4435-9fa4-8213d436bf34	a50e217d-21ce-415d-8035-c37b3cf89a71	attendance	sms	0766218578	Dear Parent, Your child Yasiru Nawod present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:32.603792+05:30
c14b09f6-6a25-4521-80ff-c8bb6ac8a654	186e3d3e-396c-411c-9ed0-8b19aa596e15	attendance	sms	766218578	Dear Parent, Your child Charuni Saleeka absent at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:34.156651+05:30
f50781df-3d3e-4c33-b1df-a9d15a17f253	db2737be-154b-4e11-961a-f605558ef0eb	attendance	sms	766218578	Dear Parent, Your child Bithula Pramod present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:35.668862+05:30
3f32e9b9-2885-4fb4-8a14-d2e44986c1d7	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	attendance	sms	0766218578	Dear Parent, Your child Thilini absent at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:37.277994+05:30
7a5f6ca4-cfcc-4586-9aa7-867678b45a26	e3ded0b9-e857-4b32-83b9-7c167372a544	attendance	sms	766218578	Dear Parent, Your child Rashila present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:38.79917+05:30
6dbe2ecd-e8d5-4cb5-8c72-49168ae294cf	93667668-78ac-408a-a626-267a7d2607ab	attendance	sms	0766218578	Dear Parent, Your child Suhara absent at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:40.504685+05:30
9bd748a5-0f15-47ed-8dd7-4071902f1a33	3870b309-9c01-4c72-af60-1338fc95f35d	attendance	sms	0766218578	Dear Parent, Your child Suhara absent at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:42.001921+05:30
bece4ed2-2833-4dfd-bd7c-ccbbae54b975	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	attendance	sms	0766218578	Dear Parent, Your child gayeni present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:43.575401+05:30
6b7e3de1-9411-4f84-928c-f06ed31ff9e7	2da0cce0-e401-4a70-b12c-bfaf452c6593	attendance	sms	0766218578	Dear Parent, Your child Jane Silva present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:45.14921+05:30
0a22d628-9fdb-409d-adbe-b51eaef233a8	ac21cfd7-4584-466d-a740-eb25d6baca2d	attendance	sms	0766218578	Dear Parent, Your child Chichi absent at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:46.722221+05:30
71d4f5d1-d3cf-414f-8225-92f8a495d265	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	attendance	sms	0766218578	Dear Parent, Your child Maleesha absent at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:48.256084+05:30
10c0967b-11c9-420b-82cb-60beff51c463	d16622d3-5780-4188-b1d9-67254a2e59c2	attendance	sms	0766218578	Dear Parent, Your child Limini present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:49.754422+05:30
08ae5f6d-d006-46f3-8553-12d7dbfc16b6	836fd154-cdfd-49f0-82eb-a55e67ec7406	attendance	sms	0766218578	Dear Parent, Your child Aseni absent at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:51.303303+05:30
2fbd25d6-fdec-47f1-98f2-307d9710e0ae	5dd90925-434b-4342-9691-392bb979b295	attendance	sms	0766218578	Dear Parent, Your child Matheesha present at school on 09/07/2026 at Grade 1 Class A.	sent	2026-07-09 11:21:52.896362+05:30
5fa77a09-abbd-4067-ab55-d55a16f7a882	53d675a4-a5b1-4f09-8034-e00cbd9a460c	attendance	sms	0766218578	Dear Parent, Your child Ashadi present at school on 09/07/2026 at Grade 9 Class A.	sent	2026-07-09 11:21:54.438398+05:30
81df2e35-4345-451b-9683-60dd30185b44	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	attendance	sms	766218578	Dear Parent, Your child Sahan Perera absent at school on 09/07/2026 at Grade 9 Class A.	sent	2026-07-09 11:21:55.974354+05:30
1ebbbf43-b097-44b8-9b80-761d8530bb07	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	attendance	sms	766218578	Dear Parent, Your child Thisun Perera present at school on 09/07/2026 at Grade 9 Class A.	sent	2026-07-09 11:21:57.480946+05:30
4cee4701-a2c4-44d2-8eca-c0e19ca9428d	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	attendance	sms	0766218578	Dear Parent, Your child Mithuni Perera absent at school on 09/07/2026 at Grade 9 Class A.	sent	2026-07-09 11:21:59.008876+05:30
6b2b167e-cabd-4fa6-94cf-30f3a44a74dd	eb48778c-f7c9-4361-be6f-8d9a2eccab19	attendance	sms	766218578	Dear Parent, Your child Dasuni almeda absent at school on 09/07/2026 at Grade 9 Class A.	sent	2026-07-09 11:22:00.587852+05:30
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value, updated_at) FROM stdin;
urgent_threshold	60	2026-05-06 09:52:21.445255+05:30
warning_threshold	80	2026-05-06 09:52:21.445255+05:30
attendance_threshold	80	2026-05-06 09:52:21.445255+05:30
attendance_open_time	07:32	2026-07-09 11:05:34.701496+05:30
attendance_close_time	11:20	2026-07-09 11:05:34.70517+05:30
attendance_timezone	Asia/Colombo	2026-07-09 11:05:34.706018+05:30
\.


--
-- Data for Name: student_class_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_class_assignments (id, student_id, class_id, assigned_at, removed_at) FROM stdin;
ea3e4fad-2888-41a2-a082-dbf4ea7b3d43	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-06	\N
8b0a76ec-8059-4e29-a3b8-ffe313cbaa88	adbe2730-fe44-44ac-bee9-f8888cf50569	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-06	\N
b2c153a4-265b-42f8-9fe7-45d5fa6333d8	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-10	\N
fc041518-770d-43ef-8056-07c5e3a8fa6d	0314a791-ea42-429e-a632-38e8dd8ecdde	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-12	\N
88cb561d-9f2c-4312-808f-baeecc7b8273	a50e217d-21ce-415d-8035-c37b3cf89a71	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-12	\N
7f4591e8-95dc-4971-a8f9-ffb408fd5e0f	2da0cce0-e401-4a70-b12c-bfaf452c6593	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-12	\N
47879eb2-1d77-45bc-9972-c489fd85b856	186e3d3e-396c-411c-9ed0-8b19aa596e15	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-12	\N
593c04d8-b498-440b-b2cd-93a3615d36b2	db2737be-154b-4e11-961a-f605558ef0eb	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-12	\N
e77b2340-2ea4-4ed1-ac96-e8b67150a737	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2026-05-13	\N
ca2d1b81-a46f-4507-94da-f2753eaf400a	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2026-05-13	\N
8dbff2c3-b89d-4990-b3b9-e7ebbb961188	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-13	\N
91f59fc0-991b-43cd-8952-57badeb2966e	e3ded0b9-e857-4b32-83b9-7c167372a544	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-13	\N
32c4f608-c2ba-465f-9492-becf40670280	93667668-78ac-408a-a626-267a7d2607ab	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-13	\N
d6cd439f-86f4-43f6-9e6f-76692f26e739	3870b309-9c01-4c72-af60-1338fc95f35d	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-13	\N
78830b22-85ab-422c-976d-e5e9f8a8c9fd	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2026-05-13	\N
fd0e0688-91b3-49a0-94a3-b75ba118717d	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2026-05-13	\N
40f45fae-8c47-4690-992c-930e4b86f250	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-13	\N
752a4431-4945-4acd-9cbc-26f1dbfbf94d	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2026-05-13	\N
33923f45-a5a8-4c53-99bb-0b56e4d4eabc	53d675a4-a5b1-4f09-8034-e00cbd9a460c	4bd02723-1c05-4f78-a894-6d79069bca75	2026-05-13	\N
66b3f5eb-4fdf-4c69-b155-e89345d4e832	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2026-05-14	\N
2f3f3c21-698a-445f-9970-168fcc6e0b80	ac21cfd7-4584-466d-a740-eb25d6baca2d	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-14	\N
3b14a163-2bb7-476a-8ad9-8070ff5ffdf0	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-14	\N
6638de00-ae18-4e6a-a213-1372d2b493a9	d16622d3-5780-4188-b1d9-67254a2e59c2	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-14	\N
a229db06-c685-4441-88b0-7be01bd59b2a	836fd154-cdfd-49f0-82eb-a55e67ec7406	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-14	\N
68c2eb19-0e13-47b7-813f-15b72f0df485	5dd90925-434b-4342-9691-392bb979b295	828f4c08-6936-44db-be08-bf5507d5b0ed	2026-05-14	\N
bbb0c210-ccbd-43d2-a77b-04b5f9437fbc	742d2ddc-aa8a-4090-aebd-4af2df9821f5	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
41246139-7c2c-45b4-b373-7d9e11215394	e8decff2-9160-4569-ac1d-711423e514a9	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
7f70fa5e-d81d-48cc-9dff-0dba241bfb79	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
4d07ed1b-15ed-4097-8672-3d70b20b0e95	60a28492-4654-4cbb-98fc-b1c49ca1303c	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
193a1d0f-b012-4543-ac48-85e146b3b436	b2540f04-3218-465c-9c23-c61dc3c7b1fb	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
2c847424-516a-469d-a724-9e840b168428	ea289faa-0c02-495a-923c-049ff2c481a6	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
47881e92-79c5-45f8-9f3a-6fda7dc16490	845cf7b4-50ec-45ae-bfd9-6d669c02f537	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
184c3d29-047c-41f4-ab6a-11d6a0ac1df3	0351f9a0-303c-4504-8941-ee3e1a1c592f	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
a396ef77-7935-4e3d-aec5-f8d625e8a096	aa18c05c-e280-453c-a87f-a368f8ad7de9	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
8ef5d056-36a2-4049-8ab7-744bdc6663cc	74fe90b4-501f-4458-be0b-bcc42f08df21	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
d5751103-d564-4dce-a33b-9d32bd010452	ea3a30af-37a6-43e5-ade7-a7323f267787	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
8932e2c0-27b6-4d0a-8505-fa40cb3b177a	4effd2d5-edf7-408f-8dc9-53705a2e2255	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
ea4c1136-6b61-40ed-865d-ceef77883b8d	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
204e6d81-c182-4233-9bb1-0275f490a405	bf0a7707-1978-4a11-a011-4de82a53161f	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
dadd50ae-7f56-49d6-96f8-8a2cccd6c89b	8251e1df-58ea-4d12-b02e-3062e78df907	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
894d441a-74f9-4dcd-b785-9a14be901ab2	3c288a85-886b-4e7d-a721-7244770314f5	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
d1a40902-a643-4179-85ca-de3d3333aeb7	4537a978-3748-49c4-bef2-8e95a922e0df	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
99e4a66c-d2cb-4caf-8afb-6745bca0de54	583eb113-b74f-49f6-a0ba-cfb50dae6699	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
a1f2785d-6e86-4d08-9912-f204e6101ddc	bd0a9878-cf3f-40e8-889f-c0f4ec694135	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
e0b71286-918e-496d-bcc0-31ca56546399	7ad6633e-67bd-429c-8440-f0d9ffb52c79	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
567a2958-0066-41af-9b7b-75cd93fb1c2d	e25d2a9a-fdba-4864-bb94-013daa7e5de0	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
ae512723-359d-48a1-9d5d-c80a47d16837	1534d25e-7fac-483a-9c8b-bccacdf111f0	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
00aa3d63-2fcb-45dd-895b-3fc11fe25d29	d1edde10-3f65-4719-bcd3-78559468e971	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
f943434e-e88a-4528-a78b-d30cf341d6c0	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
b44853f9-9a8f-43ad-987e-294e0b302345	83db7a74-a6fa-488b-bd32-cd5af189bbd8	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
1f98a883-6538-4d97-9bd9-4ab12b42bc17	7f54343e-a2c5-4acf-acd9-87c519f072c8	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
64eba152-5963-4284-857b-2b86d0c61294	d730bf85-51ee-486b-a05f-b5e9feb19768	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
42da67c8-4bdb-469d-b7cf-c0e353d55263	cdd0fae5-dbda-4df3-a312-61c7e6974419	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
caa18bbf-5d6a-42e8-b415-34587ea21a18	b4d82430-3e05-48a3-8f7d-28c94446aa00	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
f40916b4-874d-4a7a-86e1-7d49ea93ef7e	3960abbd-b2fc-4ecc-ba9f-965b756be518	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
faecf9b3-bd3f-4585-98dc-fd28e49ad5b2	71d4ec30-abdb-4dff-a672-47b47604f20e	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
3b69e11a-95bc-4cf8-a239-4fa7466dc0e4	a6a60d97-3011-49c5-ae68-a11ade339992	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
1426335f-a979-4546-b8f2-703d2602c000	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
5b839e58-d3f6-44dc-ae50-c5d2cc66ff36	75e7cc1e-02df-46c8-8235-7e0d43a4f520	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
63e7e0ef-bc77-456d-b6df-42baad3f29a0	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
90ffd10a-cf10-49e3-ab86-654a6d987827	9029eb7c-ace9-41e8-a889-d92468fe16cd	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
1aa8f80c-7cdd-405d-8934-25b00d9b52a6	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
ec436b8d-9c07-479b-8989-535b8606e231	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
7719acd3-759a-446c-8987-f223cf2d2cf6	3431c363-c8e1-4e66-9d56-b5eb0cda9723	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
16a4b6a7-d108-47f7-b70e-5c4e0da72471	bb813af3-4184-4512-bb63-32fba48db8a0	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-15	\N
73da52e6-6e7f-42e8-a03e-effb91fa4261	9a02ca9b-0234-4504-8ab5-2d4362f4d651	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	2026-05-20	\N
9a0578fe-fe5f-49a5-838e-7ad139fce4e4	286385dc-7884-42da-992f-6891fd1bccb5	eae42b17-e510-452a-85aa-4bfc48f96ba5	2026-05-20	\N
cc03eaff-0fe7-4599-b3c8-b37b7f42b06e	9e271530-fd95-4be5-819d-a534e09a83c3	eae42b17-e510-452a-85aa-4bfc48f96ba5	2026-05-20	\N
c682dea3-3664-4c9c-bb6f-af5cc2decf34	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2026-05-26	\N
42dd94f1-2390-47ff-ac4c-de4eab46e57a	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2026-05-26	\N
4386353e-e6ac-45bb-b91b-87c44f00db44	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	4bd02723-1c05-4f78-a894-6d79069bca75	2026-05-28	\N
8761362d-dbe8-41a2-b9fc-1db1d47d4db7	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	4bd02723-1c05-4f78-a894-6d79069bca75	2026-05-28	\N
68d9fdb7-0ef9-49e2-aa9e-05ba3a00f0e0	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	4bd02723-1c05-4f78-a894-6d79069bca75	2026-05-28	\N
0a136c1a-f017-46ec-a6ab-a99eede6a534	eb48778c-f7c9-4361-be6f-8d9a2eccab19	4bd02723-1c05-4f78-a894-6d79069bca75	2026-05-28	\N
69e0cf5c-4d25-4137-b761-dd07042f7aa9	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	2026-07-03	\N
0d60e47f-1902-4842-868c-2d4651b9f406	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	2026-07-03	\N
a52f3fe3-8ccc-4cc2-aa19-7d0014c1417b	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	2026-07-03	\N
02b028f6-fb9f-477b-8fe0-43b23c4ec61a	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	2026-07-03	\N
2c86aaa8-ae15-4607-a610-11496e5da788	d839e6c4-853f-43f2-87ef-ed49a6715999	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
82f31702-6c08-41b1-bfba-ec01acca6262	5e245f6a-ad3a-4202-860e-60f2c0ba5c55	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
b027f15d-f79a-4117-a478-834cc9553351	5fee4389-662f-4e8f-bc8c-54f0acc25920	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
6804cc8f-c01a-441d-ad52-3fd5b7dae48f	e4567f9f-d50e-4598-8e38-473c09467f6b	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
52131af4-630a-4168-99bb-43e3bcf12799	9489fc67-83b4-4c5e-91e4-657967153e6f	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
90ed2d5c-82cf-4f4e-bf0e-a284b875592b	2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
35be2209-f52b-4668-960e-31d08d8ba0a8	acef1596-f9e7-46db-afff-ee5584022f4d	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
515b359c-68ab-4a61-b16b-ee8671dfb281	85bfef6f-3286-4710-8317-7b71bee456d2	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
8b78ed45-dd4a-428a-aad2-d748ecdc734c	ff07f896-ce93-4634-9be8-aa5caff17922	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
930e14b4-5d30-433d-8cec-0ab9ce56c808	429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
647a17a6-60fa-4750-9ad5-ad6bc7176c62	6c59b04c-50e9-4c78-9802-55e11789511f	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
d99f0087-6b2a-4c09-9938-5c09ba7dd5d0	d875c077-b63e-4ed4-ae80-2e489074f7b7	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
6776056a-0665-4d1c-ae1f-b238f6139c0c	b7cc526c-3425-4e94-b8eb-15b08e77ed8e	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
8d800132-bda1-400d-b6f0-15652f2a6872	01d86598-3dc3-4b11-974a-d229fb4b6af5	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
4e8028a0-6a92-4079-9386-3501c8eba87b	33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
0f1e34b7-1bb2-4fab-9788-b3ce9a8aa923	b28be76a-b92a-4165-a570-502cfd236b57	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
c0bd12a2-d7ae-4882-b8ed-c07d5beb0366	39b4f62a-e087-4eef-946d-f40dddde350d	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
c4add73a-a318-475a-8594-dc6a93ac0990	76fa6ddc-f8a9-4159-a844-1a717ed3bc29	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
0cb6593b-2eeb-4174-aae4-ac7ed704f1e3	3465cf1c-6a60-48a9-8409-5deaea64d19f	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
2976b18f-8b99-46e9-bf9d-e2390fc43807	ee855393-dc17-44e8-9851-76fe172f2c53	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
4ae36339-7ff3-4b9f-b24f-8a5cd9c9f3df	cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
01665cb4-e53a-4502-a591-d57fa5c44de6	69ddd74f-769e-4225-bf84-6fe36504a018	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
616b9e16-8dab-4c4e-904f-67a7dad6defe	17921d74-7486-4d11-98d9-448be5f04af4	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
0eaa39a4-9555-46c4-838a-604659f396cc	2d58f4c5-44f0-4af8-872f-71f7bec32f12	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
00996ce3-a1bb-465a-9db0-5b5bd0362791	821ebc49-8c56-4662-b5fe-dc7da1623cf5	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
338d2545-9b45-49c3-8ade-51d6c9c9967d	f79df6f8-c599-4767-803a-3fa522f7e538	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
112328ae-9c9e-444f-9faa-0ba28f603efa	b29b84ed-5055-464e-b02d-75f7984db2cd	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
81444260-c513-4200-babf-11e2c67c8f20	a1438d43-6950-4284-882e-a2f24f725c22	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
615a0109-9b59-4f07-9bc0-f814f0eedc5d	dbd310a9-cbd9-4e39-916f-280d88424395	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
4eed8c6d-bee8-46bb-8a37-f76bc1f8c54e	7f72d70c-f822-4258-9c60-c49c3b518bb7	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
4820ee99-1f93-492f-98ef-839caa02025f	dcd84cc3-984a-42fe-881b-884251662e6a	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
51364619-d9f1-487d-a30a-ce2833f04a2d	eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
a5fde013-9834-4e07-9671-1377514fcb18	3e57df1b-6a5d-42c4-bf05-43232953ca09	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
6c5e92b9-8bc8-4db2-85a6-f6325830a87e	43b82bf1-7e23-4c2c-aaca-321b74de92c4	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
80831d33-b26c-4f87-8814-6191e38708c7	8d944d69-764c-4af6-837b-e10e1b2fd533	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
4977aa7a-6749-4bb4-a9b0-c5e048f82049	22237097-4cab-4b29-8000-d6fc35341589	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
94927bd4-85ad-4e74-b048-12c41663084e	d19da57c-0fe2-4445-9ee1-3666e15dc012	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
01cab51b-1944-4c57-9b6f-487c03c8c643	dc4c4fcf-cd11-4824-a5fc-b33a2b440563	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
7d51683d-d875-46bd-8dd9-f6c5bcfe65d6	fd83d560-17d1-4063-89e4-b0e56bf19b39	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
dd7d28a5-b890-4387-8163-1bb37c685504	6c37736f-b10a-4262-8ae3-9dd9087e5099	3b6ced30-19f3-4b61-a8c0-79b64d8b7c59	2026-07-07	\N
\.


--
-- Data for Name: student_subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_subjects (id, student_id, subject_id, is_elective, created_at) FROM stdin;
ddb8d9c7-a8c0-4e03-a9a6-06af73cb5db8	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-06 12:08:50.960514+05:30
c4985a14-ca91-4f21-97dd-a98e28923cb3	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-06 12:08:50.960514+05:30
2d322842-63b9-4b95-b6d7-bf6ea9ac45b9	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-06 12:08:50.960514+05:30
5a9cf006-e10b-4d22-9c76-0d4c5af59b60	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-06 12:08:50.960514+05:30
dc047aeb-691a-472a-9b17-add891a429af	adbe2730-fe44-44ac-bee9-f8888cf50569	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-06 22:42:19.126842+05:30
fac2d632-30f4-46c8-8f43-bba76ba6a954	adbe2730-fe44-44ac-bee9-f8888cf50569	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-06 22:42:19.126842+05:30
4d0d7a8e-568f-4412-8994-e93b17fe54d0	adbe2730-fe44-44ac-bee9-f8888cf50569	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-06 22:42:19.126842+05:30
efb42834-d360-4246-a142-84452ce12cc5	adbe2730-fe44-44ac-bee9-f8888cf50569	98393ed5-d184-419e-ae6f-96ecbe10be87	f	2026-05-06 22:42:19.126842+05:30
3bbc0caf-3a09-44e6-90e1-00ba9caebce2	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-10 18:49:58.973693+05:30
29828e3c-6636-4256-8a20-65eb8cbbeec3	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-10 18:49:58.973693+05:30
a9f90218-b486-439b-8bd4-566eef9d930a	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-10 18:49:58.973693+05:30
964a91fd-bfdc-4336-a1d5-b07323d669d5	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-10 18:49:58.973693+05:30
bded891b-2c77-482c-a457-2a88edef4e6b	0314a791-ea42-429e-a632-38e8dd8ecdde	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-12 11:29:36.185236+05:30
8621bb32-eb06-428f-875e-989b5339dc72	0314a791-ea42-429e-a632-38e8dd8ecdde	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-12 11:29:36.185236+05:30
0816a4f8-3ef6-496d-8912-06208e74b64b	0314a791-ea42-429e-a632-38e8dd8ecdde	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-12 11:29:36.185236+05:30
f2622cb5-9619-4806-9e56-2e29ff8c1b9c	0314a791-ea42-429e-a632-38e8dd8ecdde	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-12 11:29:36.185236+05:30
28212774-ac7b-459f-b2ea-7c4d08549b45	a50e217d-21ce-415d-8035-c37b3cf89a71	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-12 11:46:24.602474+05:30
d65e0a77-8e6f-4e54-a6ef-bbbdc512cc43	a50e217d-21ce-415d-8035-c37b3cf89a71	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-12 11:46:24.602474+05:30
fc61d684-9f78-4f94-849d-1a6dcff1744a	a50e217d-21ce-415d-8035-c37b3cf89a71	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-12 11:46:24.602474+05:30
6b1440c8-fec7-4b27-8446-d87f7bb4ede2	a50e217d-21ce-415d-8035-c37b3cf89a71	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-12 11:46:24.602474+05:30
56dddca9-5ff1-4335-8857-6b0b0e951a83	2da0cce0-e401-4a70-b12c-bfaf452c6593	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-12 11:52:12.067222+05:30
b513deb5-0bc8-4c78-b75e-d3a65ef21143	2da0cce0-e401-4a70-b12c-bfaf452c6593	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-12 11:52:12.067222+05:30
9a9527b7-2807-48d2-90e0-2fbcab4a5bff	2da0cce0-e401-4a70-b12c-bfaf452c6593	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-12 11:52:12.067222+05:30
03dbacc2-1d0e-421f-9925-dad7081af4b2	2da0cce0-e401-4a70-b12c-bfaf452c6593	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-12 11:52:12.067222+05:30
48a22c56-cee1-42a2-81dd-9b388f59cfce	186e3d3e-396c-411c-9ed0-8b19aa596e15	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-12 13:07:02.937498+05:30
c31e8226-8c76-479d-9448-655dc16e947a	186e3d3e-396c-411c-9ed0-8b19aa596e15	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-12 13:07:02.937498+05:30
198022b0-a81c-4e17-a5c6-2f9093de3b54	186e3d3e-396c-411c-9ed0-8b19aa596e15	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-12 13:07:02.937498+05:30
dc7eb694-4f0c-405c-a83a-c40d85ef8790	186e3d3e-396c-411c-9ed0-8b19aa596e15	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-12 13:07:02.937498+05:30
026b00c3-28ec-4362-bafc-8aa7c9cec058	db2737be-154b-4e11-961a-f605558ef0eb	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-12 18:37:17.565816+05:30
37b4fea2-12eb-42f0-9776-0100c852c43e	db2737be-154b-4e11-961a-f605558ef0eb	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-12 18:37:17.565816+05:30
c483a684-e793-4189-8e27-f5536ac136d4	db2737be-154b-4e11-961a-f605558ef0eb	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-12 18:37:17.565816+05:30
0fcfdace-b994-4e5a-95fa-b3c350e1289b	db2737be-154b-4e11-961a-f605558ef0eb	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-12 18:37:17.565816+05:30
63d75a30-770e-40b8-818e-81a57ec643e4	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 13:55:48.732643+05:30
01bbdbbd-ed2a-4edb-9e44-fe6b205872af	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-13 13:55:48.732643+05:30
105c5a27-1027-4d82-8f93-aaac73aee779	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-13 13:55:48.732643+05:30
03843bc2-4b2d-4f35-a7a4-16fb00a54fdc	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-13 13:55:48.732643+05:30
cf3e27ae-840c-4068-87b5-4ae7b844d11b	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 13:55:48.732643+05:30
5a00ebba-688d-4f22-9b31-8f4d0227192d	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 13:55:48.732643+05:30
062dde2e-97b7-4512-9d9a-374f8157a0b4	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	9df5a7a7-50ee-474c-85e7-d6822fbae030	t	2026-05-13 13:55:48.732643+05:30
540c778d-1af3-4ae0-976f-88ad68f04be3	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-13 13:55:48.732643+05:30
d3634d56-b175-4326-b593-0a7d659b9fa5	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	51050e72-c564-416b-880f-89bcb9d65d53	t	2026-05-13 13:55:48.732643+05:30
1f145edf-e523-495a-9ee0-5e40c29e3833	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 13:56:46.987496+05:30
18e4c8cd-30d8-4dcb-be05-5b533719dcd1	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-13 13:56:46.987496+05:30
d1654d5a-e9aa-411b-878c-86428b8677d3	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-13 13:56:46.987496+05:30
247bf52a-c397-453e-b5e5-a8e2daf1de2f	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-13 13:56:46.987496+05:30
5c7795ce-c9a3-4481-ac3e-992749ed2a1b	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 13:56:46.987496+05:30
afa7ea36-f912-4499-8e5f-c2c3580c5404	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 13:56:46.987496+05:30
2f809b2c-e878-4437-a6b0-6e92f9e62f7e	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	9df5a7a7-50ee-474c-85e7-d6822fbae030	t	2026-05-13 13:56:46.987496+05:30
1f565fec-6c1e-486b-b8e5-1318f2a2f619	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-13 13:56:46.987496+05:30
0e4f95b3-7161-4c6e-9255-358914e9ec2f	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	51050e72-c564-416b-880f-89bcb9d65d53	t	2026-05-13 13:56:46.987496+05:30
1647a880-262d-49e3-bd35-34aea84a9943	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 15:06:22.543803+05:30
2e363984-5524-49db-9c30-db246ba96cc3	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-13 15:06:22.543803+05:30
8269c711-4a2a-4c4a-9e29-407b8327ee50	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 15:06:22.543803+05:30
527d9160-b3c6-43d6-a5bb-9120e1b828f8	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 15:06:22.543803+05:30
f4bbfab3-b2d1-4b5c-906c-eb33313a321a	e3ded0b9-e857-4b32-83b9-7c167372a544	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 15:09:52.605311+05:30
1a04c865-fce9-4648-bbab-e8f35a1b678b	e3ded0b9-e857-4b32-83b9-7c167372a544	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-13 15:09:52.605311+05:30
29f1d871-2ee7-4ed3-9e91-f26b41528d71	e3ded0b9-e857-4b32-83b9-7c167372a544	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 15:09:52.605311+05:30
aded2374-5b87-48e0-b177-66d986d7a618	e3ded0b9-e857-4b32-83b9-7c167372a544	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 15:09:52.605311+05:30
eb7ca2f8-8731-4930-a2f0-18d21336337f	93667668-78ac-408a-a626-267a7d2607ab	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 15:32:22.715511+05:30
d7414b9a-2669-457e-b8a8-b0eb1f3c453f	93667668-78ac-408a-a626-267a7d2607ab	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-13 15:32:22.715511+05:30
94af889a-d52f-45f1-b40f-4f6b5b026f1b	93667668-78ac-408a-a626-267a7d2607ab	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 15:32:22.715511+05:30
bdf862d0-a31a-45cc-8800-012d75587771	93667668-78ac-408a-a626-267a7d2607ab	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 15:32:22.715511+05:30
b4806dd7-f4d3-4225-a65b-9ce7f5f49611	3870b309-9c01-4c72-af60-1338fc95f35d	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 15:33:43.92728+05:30
8393c601-1fb8-47d4-9d38-d194cc3e34f6	3870b309-9c01-4c72-af60-1338fc95f35d	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-13 15:33:43.92728+05:30
168087d2-dfda-4d55-8178-8809e8d0f095	3870b309-9c01-4c72-af60-1338fc95f35d	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 15:33:43.92728+05:30
8a5c06bb-4f01-4fc1-a06b-50f262a53112	3870b309-9c01-4c72-af60-1338fc95f35d	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 15:33:43.92728+05:30
40822c68-7489-4604-93df-53f272a08002	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 15:56:17.738133+05:30
7c60ed73-f893-4be0-a814-571cb0ce7c3a	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-13 15:56:17.738133+05:30
3878961f-e353-4b58-9151-b1c0a3f6f50c	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-13 15:56:17.738133+05:30
e066afd5-bf9d-4bd9-aeb9-635bd85d5423	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-13 15:56:17.738133+05:30
77541fe6-7550-49fe-87fe-118988d07e98	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 15:56:17.738133+05:30
a7370661-6280-4840-b881-a1fdf66330d5	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 15:56:17.738133+05:30
ae03e354-dab1-49c4-a5c5-d727e88a5021	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	8b7303c4-9149-4688-88ca-8aa116cd652c	t	2026-05-13 15:56:17.738133+05:30
cd391f75-f9c1-4afa-9b1a-70175a32afe3	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-13 15:56:17.738133+05:30
94e94756-fff6-4c97-b6ab-53bbb50940b1	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	51050e72-c564-416b-880f-89bcb9d65d53	t	2026-05-13 15:56:17.738133+05:30
c182d062-4d8f-4183-8e98-aea22e020379	5e956353-c70e-4433-aa21-cf0a9bcf3602	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 15:57:13.95479+05:30
f7f739ae-d701-4651-8863-7ff9b19a8844	5e956353-c70e-4433-aa21-cf0a9bcf3602	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-13 15:57:13.95479+05:30
5a430e34-1e03-4ccd-90b9-4929d2842dc0	5e956353-c70e-4433-aa21-cf0a9bcf3602	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-13 15:57:13.95479+05:30
08bf8218-5ab5-48ae-a8c9-3a88c968e24b	5e956353-c70e-4433-aa21-cf0a9bcf3602	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-13 15:57:13.95479+05:30
79f37738-767d-45e2-8649-74c430cebec7	5e956353-c70e-4433-aa21-cf0a9bcf3602	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 15:57:13.95479+05:30
d0d3be7e-682d-4288-aaa9-b8a645461d04	5e956353-c70e-4433-aa21-cf0a9bcf3602	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 15:57:13.95479+05:30
90ef8ece-7db0-401d-9917-7317aaf3b67c	5e956353-c70e-4433-aa21-cf0a9bcf3602	943b5378-a3cc-4c57-9e7f-5db54cb10cb3	t	2026-05-13 15:57:13.95479+05:30
cea4a6c3-1b39-48e9-b2b2-0abddbbb0b1f	5e956353-c70e-4433-aa21-cf0a9bcf3602	c7e93f84-d12a-4775-b717-842b494d5ed8	t	2026-05-13 15:57:13.95479+05:30
74153fdd-9521-4f97-b07f-35927540ef4d	5e956353-c70e-4433-aa21-cf0a9bcf3602	74da8036-d5f6-4af7-b7eb-575894653b6b	t	2026-05-13 15:57:13.95479+05:30
de640b45-af49-4263-b391-3c4ed90fcc3e	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 15:58:13.533656+05:30
b48a8f3a-99e6-456d-8a54-65cba5a938cf	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-13 15:58:13.533656+05:30
863d1bc4-eeca-4a53-b49b-0c06c46d68ab	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 15:58:13.533656+05:30
b31f80b4-84f5-4440-ae37-5c9c4e52179f	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 15:58:13.533656+05:30
77477e5c-d16f-4690-ab9c-bd97ed0d9126	b47af724-c5f2-4b30-b5c1-9add8ca43645	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 16:41:40.955401+05:30
17cd0ff9-ee96-4ead-9afc-4c7e7b061f78	b47af724-c5f2-4b30-b5c1-9add8ca43645	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-13 16:41:40.955401+05:30
957d1240-deff-4317-bb39-a56f0bd32004	b47af724-c5f2-4b30-b5c1-9add8ca43645	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-13 16:41:40.955401+05:30
a7e6cfac-5a71-4b18-b785-cf8e69bc00a3	b47af724-c5f2-4b30-b5c1-9add8ca43645	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-13 16:41:40.955401+05:30
13b2f433-e8d8-4f83-a60a-c28e5b20b339	b47af724-c5f2-4b30-b5c1-9add8ca43645	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-13 16:41:40.955401+05:30
7c230085-f2b8-4d6b-ac76-7cfe6b7e5399	b47af724-c5f2-4b30-b5c1-9add8ca43645	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-13 16:41:40.955401+05:30
2461b427-b20b-4c3a-9c7b-26cc3b950856	b47af724-c5f2-4b30-b5c1-9add8ca43645	9df5a7a7-50ee-474c-85e7-d6822fbae030	t	2026-05-13 16:41:40.955401+05:30
23a8b884-65e7-4913-b7c7-6f790d37f930	b47af724-c5f2-4b30-b5c1-9add8ca43645	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-13 16:41:40.955401+05:30
1fd3a503-397e-4787-9286-24352ff88f7a	b47af724-c5f2-4b30-b5c1-9add8ca43645	e3b71d41-c839-4ccb-8674-e8af8e908bf3	t	2026-05-13 16:41:40.955401+05:30
6a3a4f99-8834-486c-b8d1-c8cb8befb1d5	53d675a4-a5b1-4f09-8034-e00cbd9a460c	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-13 19:56:23.852513+05:30
2bc8f2ec-5500-486b-8ccb-68d58e80783a	53d675a4-a5b1-4f09-8034-e00cbd9a460c	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-13 19:56:23.852513+05:30
37d59cc2-d9b4-483b-833d-c04426de7068	53d675a4-a5b1-4f09-8034-e00cbd9a460c	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-13 19:56:23.852513+05:30
492cc00c-1e01-4a98-94d9-05aa3cf26cb1	53d675a4-a5b1-4f09-8034-e00cbd9a460c	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-13 19:56:23.852513+05:30
137077d1-c8a5-4fff-94fa-b1d1208cd270	53d675a4-a5b1-4f09-8034-e00cbd9a460c	8b7303c4-9149-4688-88ca-8aa116cd652c	t	2026-05-13 19:56:23.852513+05:30
9c9a9566-695e-446f-a2f1-5c68850c83d3	53d675a4-a5b1-4f09-8034-e00cbd9a460c	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-13 19:56:23.852513+05:30
09bb8af4-48e5-4ab5-a66f-66e185c10941	53d675a4-a5b1-4f09-8034-e00cbd9a460c	51050e72-c564-416b-880f-89bcb9d65d53	t	2026-05-13 19:56:23.852513+05:30
eae48796-196a-4a3d-8063-12e166f01441	00999c6b-5480-499d-9e70-a99987eb9d64	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-14 19:38:52.457095+05:30
75717680-1590-4ff2-916b-6fae0d32a014	00999c6b-5480-499d-9e70-a99987eb9d64	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-14 19:38:52.457095+05:30
c4c40672-218c-46d4-80f1-6674e7835bd4	00999c6b-5480-499d-9e70-a99987eb9d64	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-14 19:38:52.457095+05:30
c5c227d0-b72a-42d2-a2d1-815f19013c08	00999c6b-5480-499d-9e70-a99987eb9d64	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-14 19:38:52.457095+05:30
e67ba524-dd79-47b4-af13-9146586ebacd	00999c6b-5480-499d-9e70-a99987eb9d64	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-14 19:38:52.457095+05:30
e8751cb3-ac5c-42b8-a438-fcb4e2255fb3	00999c6b-5480-499d-9e70-a99987eb9d64	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-14 19:38:52.457095+05:30
cc054bb3-f4e1-4ed8-a96e-7b16893c7b9a	00999c6b-5480-499d-9e70-a99987eb9d64	8b7303c4-9149-4688-88ca-8aa116cd652c	t	2026-05-14 19:38:52.457095+05:30
a107c718-c335-4252-94fa-d816b65823a2	00999c6b-5480-499d-9e70-a99987eb9d64	5d46a339-5b39-4742-908a-228e3067e7ff	t	2026-05-14 19:38:52.457095+05:30
67dd5ff9-f86f-4b6a-9707-f992afb9b66a	00999c6b-5480-499d-9e70-a99987eb9d64	e3b71d41-c839-4ccb-8674-e8af8e908bf3	t	2026-05-14 19:38:52.457095+05:30
04a7a58d-9728-49a1-b4cb-cebfb10cef34	ac21cfd7-4584-466d-a740-eb25d6baca2d	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-14 20:49:13.608467+05:30
acf63b93-c9ad-413e-a6a4-e2cf0abd876c	ac21cfd7-4584-466d-a740-eb25d6baca2d	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-14 20:49:13.608467+05:30
138645c3-7cd3-4bb9-af67-787b89e56650	ac21cfd7-4584-466d-a740-eb25d6baca2d	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-14 20:49:13.608467+05:30
3b8a2fd6-79f5-43e7-a2e4-19350a5aef22	ac21cfd7-4584-466d-a740-eb25d6baca2d	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-14 20:49:13.608467+05:30
66ebe2e7-741d-4b7e-a809-4c96d62d4fe0	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-14 20:51:23.197398+05:30
b203af96-0497-4d25-9ebd-06f453be2309	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-14 20:51:23.197398+05:30
81a1a714-d75c-4f10-b455-18c66aea72b1	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-14 20:51:23.197398+05:30
8cb23f77-3f55-4666-9a46-f56671602fe7	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-14 20:51:23.197398+05:30
8b8f789d-02b0-4ab4-934e-fd6425bbd8d0	d16622d3-5780-4188-b1d9-67254a2e59c2	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-14 21:22:36.374023+05:30
ca7b92a2-7cbc-40e2-9f30-c741c33e61ea	d16622d3-5780-4188-b1d9-67254a2e59c2	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-14 21:22:36.374023+05:30
1390e62a-e9d4-42b6-8ba7-d013886e6963	d16622d3-5780-4188-b1d9-67254a2e59c2	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-14 21:22:36.374023+05:30
af840bf9-a68f-4bed-9bd7-2d51be46f628	d16622d3-5780-4188-b1d9-67254a2e59c2	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-14 21:22:36.374023+05:30
664ffeae-d8c9-4bba-bb29-05935e8ddac5	836fd154-cdfd-49f0-82eb-a55e67ec7406	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-14 21:33:17.251306+05:30
bc8a21aa-1ad3-41df-9ef8-33c8817800b3	836fd154-cdfd-49f0-82eb-a55e67ec7406	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-14 21:33:17.251306+05:30
fcca37dd-9d18-47b1-9be9-b990bb3616b9	836fd154-cdfd-49f0-82eb-a55e67ec7406	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-14 21:33:17.251306+05:30
b3087d5a-8bb7-4ec8-84aa-421b9cb2b9bc	836fd154-cdfd-49f0-82eb-a55e67ec7406	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-14 21:33:17.251306+05:30
5eaa34eb-29de-46d7-a5f0-42ef9c8a84b4	5dd90925-434b-4342-9691-392bb979b295	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-14 21:35:26.692188+05:30
a0f328ba-f95c-45e3-a45f-8dd5e9219f46	5dd90925-434b-4342-9691-392bb979b295	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-14 21:35:26.692188+05:30
d22ec7b6-87a8-40ad-a62a-2fbc0fe2ad5b	5dd90925-434b-4342-9691-392bb979b295	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-14 21:35:26.692188+05:30
e1c1262b-beae-4deb-b0b5-a1b46ce65193	5dd90925-434b-4342-9691-392bb979b295	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-14 21:35:26.692188+05:30
46de1cd5-a04e-4318-af18-a47a595057a0	742d2ddc-aa8a-4090-aebd-4af2df9821f5	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.628233+05:30
20e46713-7f93-41f1-8e49-e55ac76c56f5	742d2ddc-aa8a-4090-aebd-4af2df9821f5	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.628233+05:30
40d3ba3e-f4f6-4ab5-81cf-4a94c39958a1	e8decff2-9160-4569-ac1d-711423e514a9	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.762424+05:30
a35a6daa-5389-4e8e-a55b-e2afc8e2abe0	e8decff2-9160-4569-ac1d-711423e514a9	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.762424+05:30
8b92880d-e601-4b96-9236-6017216d6e7e	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.779336+05:30
a4be62f7-6f4f-4a99-99c3-d87718738945	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.779336+05:30
e67882b6-cdaf-4cef-a7df-76e891af81d4	60a28492-4654-4cbb-98fc-b1c49ca1303c	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.796465+05:30
4e852511-ec42-4264-a671-f5818ef4906a	60a28492-4654-4cbb-98fc-b1c49ca1303c	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.796465+05:30
007162e4-1df1-4699-a3cd-2774597b06b5	b2540f04-3218-465c-9c23-c61dc3c7b1fb	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.810368+05:30
4642909c-4fe3-4a37-bf22-ec1af04864b6	b2540f04-3218-465c-9c23-c61dc3c7b1fb	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.810368+05:30
11d861f7-7273-4a7c-866d-358964ff9d5d	ea289faa-0c02-495a-923c-049ff2c481a6	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.828553+05:30
92b27c10-52cf-4584-8a84-44dd97b4df8d	ea289faa-0c02-495a-923c-049ff2c481a6	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.828553+05:30
1aa80cb1-fcd7-4670-9b6c-e4a100ce5d66	845cf7b4-50ec-45ae-bfd9-6d669c02f537	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.84704+05:30
48a44411-fa30-47d1-ba91-7d8b97a73a78	845cf7b4-50ec-45ae-bfd9-6d669c02f537	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.84704+05:30
b4d7a8f4-ecaa-4979-84cf-37b9f619e761	0351f9a0-303c-4504-8941-ee3e1a1c592f	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.862323+05:30
2627fec2-ddca-4f9a-a71f-3d87e5ebf392	0351f9a0-303c-4504-8941-ee3e1a1c592f	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.862323+05:30
e2d70c2e-9e65-4ef0-b1d9-962330510cee	aa18c05c-e280-453c-a87f-a368f8ad7de9	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.87833+05:30
59bd0b68-b70e-41fc-99a3-0709e558a968	aa18c05c-e280-453c-a87f-a368f8ad7de9	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.87833+05:30
831475c5-249e-41ef-bab1-4954603bf0e5	74fe90b4-501f-4458-be0b-bcc42f08df21	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.896755+05:30
9280443d-61ad-46f2-a0d5-0622e1737377	74fe90b4-501f-4458-be0b-bcc42f08df21	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.896755+05:30
0488a187-8e96-43cb-9b2a-7f5564a35149	ea3a30af-37a6-43e5-ade7-a7323f267787	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.912104+05:30
07c1f82f-b4f5-4b0e-8ed7-a7e1d59826a9	ea3a30af-37a6-43e5-ade7-a7323f267787	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.912104+05:30
d4c77736-6c18-4930-b071-fc6eeb37566e	4effd2d5-edf7-408f-8dc9-53705a2e2255	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.927048+05:30
5e0780e5-4d46-4cd5-bc7e-84691d5747e8	4effd2d5-edf7-408f-8dc9-53705a2e2255	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.927048+05:30
bcae17e2-7419-4e43-93d4-692f9c828447	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.944831+05:30
67d18e7f-0dde-4beb-9d0c-7930fed70b8a	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.944831+05:30
bdebc958-e5f5-4113-ae7a-d7b1f6fcd015	bf0a7707-1978-4a11-a011-4de82a53161f	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.962715+05:30
b0bc082c-c866-44e2-bcde-ad00ed622922	bf0a7707-1978-4a11-a011-4de82a53161f	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.962715+05:30
2c522653-d9e2-409a-b1b8-ffd22a1c1047	8251e1df-58ea-4d12-b02e-3062e78df907	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.981502+05:30
5414fad5-ad41-4739-90c0-7ff2cd7e198b	8251e1df-58ea-4d12-b02e-3062e78df907	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.981502+05:30
42a78979-7ad4-4a44-8ce4-10683f590b1e	3c288a85-886b-4e7d-a721-7244770314f5	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:01.999343+05:30
ec18732c-77ae-4ebe-bf90-1c6f62106347	3c288a85-886b-4e7d-a721-7244770314f5	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:01.999343+05:30
e5fa7acc-5ac2-41ea-bde8-959ea2995874	4537a978-3748-49c4-bef2-8e95a922e0df	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:02.011498+05:30
4b729c73-268c-4394-9a86-71dbdf19afaa	4537a978-3748-49c4-bef2-8e95a922e0df	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:02.011498+05:30
d0aae764-eaea-470b-a60a-5026edad5495	583eb113-b74f-49f6-a0ba-cfb50dae6699	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:02.029868+05:30
905df625-3881-407f-8c06-08be2570125e	583eb113-b74f-49f6-a0ba-cfb50dae6699	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:02.029868+05:30
6648ebfa-a93e-498d-a0bf-e38a6f94305b	bd0a9878-cf3f-40e8-889f-c0f4ec694135	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:02.046783+05:30
b4ece1f6-eaec-4bd7-9b3d-6405e05c4471	bd0a9878-cf3f-40e8-889f-c0f4ec694135	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:02.046783+05:30
4d8a3c19-63f1-4319-ab9e-4a93b9d6b815	7ad6633e-67bd-429c-8440-f0d9ffb52c79	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 17:33:02.061015+05:30
69390425-f813-4464-bb97-f4c2280bb445	7ad6633e-67bd-429c-8440-f0d9ffb52c79	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 17:33:02.061015+05:30
71844d20-824a-4f59-a7af-6d8b964b928f	e25d2a9a-fdba-4864-bb94-013daa7e5de0	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.114256+05:30
1b9f5b5a-f17c-4d01-9a40-94409dea03c6	e25d2a9a-fdba-4864-bb94-013daa7e5de0	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.114256+05:30
fd629c0e-547a-4cf6-807e-f3d1a04ae7a9	e25d2a9a-fdba-4864-bb94-013daa7e5de0	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.114256+05:30
80f3db12-2516-4fad-8890-ee0cdfbca793	e25d2a9a-fdba-4864-bb94-013daa7e5de0	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.114256+05:30
deca7fc4-98da-4f57-812c-9999b674357e	1534d25e-7fac-483a-9c8b-bccacdf111f0	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.394608+05:30
f50aeee0-7de9-43c1-99cf-7e3ed215c69d	1534d25e-7fac-483a-9c8b-bccacdf111f0	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.394608+05:30
b68be2d5-544a-4a18-8c85-ecdadf613c3a	1534d25e-7fac-483a-9c8b-bccacdf111f0	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.394608+05:30
8874212e-d47d-4a6e-a36e-4e76727e6652	1534d25e-7fac-483a-9c8b-bccacdf111f0	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.394608+05:30
8e31ce0d-f08d-4d7a-aebf-72575e1555ea	d1edde10-3f65-4719-bcd3-78559468e971	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.451444+05:30
a5ae5d60-1376-4b07-ae3b-62e959cd7a0a	d1edde10-3f65-4719-bcd3-78559468e971	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.451444+05:30
030e0114-3a1e-4b73-b13a-c99e8652ed1e	d1edde10-3f65-4719-bcd3-78559468e971	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.451444+05:30
7797b966-0899-4dd2-8ab2-acb891839b57	d1edde10-3f65-4719-bcd3-78559468e971	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.451444+05:30
da3ec191-39a9-46b5-a4aa-2ccaba15205a	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.492092+05:30
a278d0ee-4893-4818-b9ad-d06557f9b237	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.492092+05:30
26e7a294-c4b1-401b-92bd-241356d1431f	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.492092+05:30
5b5ec2a6-b788-442c-a2df-cfe853e1c7f4	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.492092+05:30
9df2287f-6571-4b4c-8be5-ae1b213633e9	83db7a74-a6fa-488b-bd32-cd5af189bbd8	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.541231+05:30
87918815-13a3-40c5-a4ba-9e7df1c1f5ad	83db7a74-a6fa-488b-bd32-cd5af189bbd8	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.541231+05:30
046f7c81-8710-4f2f-b2bb-35ba67d6c27b	83db7a74-a6fa-488b-bd32-cd5af189bbd8	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.541231+05:30
294d3ef2-e66f-45f1-add6-e77dc71220d2	83db7a74-a6fa-488b-bd32-cd5af189bbd8	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.541231+05:30
7c4b925f-86a3-4514-9f88-f885fe6d53ec	7f54343e-a2c5-4acf-acd9-87c519f072c8	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.620341+05:30
60e5c4e1-834e-4ac4-8474-924c1697c985	7f54343e-a2c5-4acf-acd9-87c519f072c8	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.620341+05:30
b93e23cd-f06b-4380-91a3-d08eca9a2371	7f54343e-a2c5-4acf-acd9-87c519f072c8	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.620341+05:30
15e01a83-c950-4c1a-b082-7cc93e2b41f7	7f54343e-a2c5-4acf-acd9-87c519f072c8	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.620341+05:30
bb234082-4436-4600-9dd0-1f570c7a940f	d730bf85-51ee-486b-a05f-b5e9feb19768	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.690777+05:30
fbb906fe-6fcf-4dc3-b680-cd0917614952	d730bf85-51ee-486b-a05f-b5e9feb19768	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.690777+05:30
79992db9-2049-4997-906c-d1d5898b1f32	d730bf85-51ee-486b-a05f-b5e9feb19768	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.690777+05:30
791a6042-f36a-46d9-85b5-43efe9ef8473	d730bf85-51ee-486b-a05f-b5e9feb19768	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.690777+05:30
1f1c47f2-b33d-4546-9bbb-3c338e5753da	cdd0fae5-dbda-4df3-a312-61c7e6974419	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.744237+05:30
0d9ffffb-4e68-417a-85b6-77e807aad4c8	cdd0fae5-dbda-4df3-a312-61c7e6974419	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.744237+05:30
c0d01206-650d-4429-8cfa-fd3132a3c26d	cdd0fae5-dbda-4df3-a312-61c7e6974419	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.744237+05:30
ccba4f9e-d57a-4f6d-b478-e44f5027950b	cdd0fae5-dbda-4df3-a312-61c7e6974419	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.744237+05:30
ae161df9-b838-4cf2-9356-8fb503cb31aa	b4d82430-3e05-48a3-8f7d-28c94446aa00	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.79875+05:30
3b373079-e511-44de-b9e6-f1562b2c7b59	b4d82430-3e05-48a3-8f7d-28c94446aa00	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.79875+05:30
743b2f56-3f7f-45d6-8696-4458617e4db7	b4d82430-3e05-48a3-8f7d-28c94446aa00	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.79875+05:30
3c3d7c95-4ed6-48b6-a62b-e7fe84bcc0c2	b4d82430-3e05-48a3-8f7d-28c94446aa00	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.79875+05:30
822dc66b-c3a7-4efd-ba3f-ac720ff71672	3960abbd-b2fc-4ecc-ba9f-965b756be518	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.86321+05:30
a91c86b8-5e22-484c-b8c4-fe594bafd526	3960abbd-b2fc-4ecc-ba9f-965b756be518	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.86321+05:30
417efd42-f0f7-4e7f-8abb-97dd90296995	3960abbd-b2fc-4ecc-ba9f-965b756be518	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.86321+05:30
b7562553-5d63-4dc6-bbf4-d66de8c7b183	3960abbd-b2fc-4ecc-ba9f-965b756be518	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.86321+05:30
e7e3604a-08ff-406e-b28c-25b7ca88c548	71d4ec30-abdb-4dff-a672-47b47604f20e	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.912594+05:30
0d26fd6e-3c9a-4831-9d4c-828e2d11b60a	71d4ec30-abdb-4dff-a672-47b47604f20e	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.912594+05:30
9bbbca74-2a09-4a8e-9c11-a5f9570dfca4	71d4ec30-abdb-4dff-a672-47b47604f20e	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.912594+05:30
0b12e34d-1192-48b6-8680-ed5cae1476d6	71d4ec30-abdb-4dff-a672-47b47604f20e	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.912594+05:30
2d25e438-3ec2-4ee8-90da-8d6c601dbdbf	a6a60d97-3011-49c5-ae68-a11ade339992	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.946999+05:30
86a5c02d-21f2-4f8a-8381-a1f8613cfd95	a6a60d97-3011-49c5-ae68-a11ade339992	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.946999+05:30
691f9159-133f-4545-97d5-d208841e1f02	a6a60d97-3011-49c5-ae68-a11ade339992	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.946999+05:30
5853182c-9823-4fe0-8a51-a0f22358a12a	a6a60d97-3011-49c5-ae68-a11ade339992	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.946999+05:30
752593ec-f0b8-4839-9920-74a2edc3ea87	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:11.984268+05:30
0526e3c8-e9fb-41cc-9f43-21475754f957	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:11.984268+05:30
2bceac03-6634-470b-9451-b4883d23bfc0	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:11.984268+05:30
3ddf36b2-9d3b-4e68-a0d7-bdb651df06d6	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:11.984268+05:30
6578f7dc-2da1-49bc-9824-0e65f01e7d7a	75e7cc1e-02df-46c8-8235-7e0d43a4f520	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:12.034266+05:30
1d62588e-af42-4109-aca7-c956e0496299	75e7cc1e-02df-46c8-8235-7e0d43a4f520	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:12.034266+05:30
df258340-000d-4bc6-93de-8c6bceec3448	75e7cc1e-02df-46c8-8235-7e0d43a4f520	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:12.034266+05:30
420de8ea-cab8-4f06-ac42-a1316fc7adea	75e7cc1e-02df-46c8-8235-7e0d43a4f520	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:12.034266+05:30
cd634880-97f0-4045-a5fc-d042c6ae20e6	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:12.073733+05:30
17d1d868-bad2-4042-a0e9-734515182315	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:12.073733+05:30
c9318b8b-c229-4a44-bf35-527e8bcfe4e6	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:12.073733+05:30
018cc97e-8957-4e01-a5c6-5a33a0b75467	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:12.073733+05:30
1f0a295a-7fc8-4a46-a8fb-a32992a496fe	9029eb7c-ace9-41e8-a889-d92468fe16cd	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:12.123705+05:30
49c4a262-c8a5-49f8-a6d9-cc15af809c2c	9029eb7c-ace9-41e8-a889-d92468fe16cd	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:12.123705+05:30
bc002990-19a8-490d-b38c-4b68fa009ce0	9029eb7c-ace9-41e8-a889-d92468fe16cd	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:12.123705+05:30
5cf8b696-b394-4374-b296-5082dd14cf55	9029eb7c-ace9-41e8-a889-d92468fe16cd	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:12.123705+05:30
fd6bd7db-77a2-4a83-b1e6-34f6ece2eac8	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:12.171009+05:30
89eb2a93-8ffc-4807-b3ca-6ab9ed7263c6	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:12.171009+05:30
fdd5906c-4842-4542-9ef0-123ecfe00a64	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:12.171009+05:30
10025edb-e215-4e08-8000-21bc3c163a15	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:12.171009+05:30
04bbf4c7-53d9-49c8-89ee-24dbc60fd4a4	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:12.217038+05:30
c7807a99-8944-4572-bd6a-9ddf015d9b35	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:12.217038+05:30
c8cb9983-bf1d-4b65-bf4e-ac3643fb4eb4	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:12.217038+05:30
86313712-5000-4555-bbab-7f8ca7d171b9	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:12.217038+05:30
253c642c-819f-4cf9-9249-a09f490991cb	3431c363-c8e1-4e66-9d56-b5eb0cda9723	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:12.272282+05:30
edec0122-4d37-4736-ab39-186f483ef291	3431c363-c8e1-4e66-9d56-b5eb0cda9723	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:12.272282+05:30
5a2e73df-56d3-4a20-b391-812cc6dcd27c	3431c363-c8e1-4e66-9d56-b5eb0cda9723	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:12.272282+05:30
b48f22d0-286b-4fd4-b132-905dcc9ad18d	3431c363-c8e1-4e66-9d56-b5eb0cda9723	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:12.272282+05:30
33cfde78-3e32-4fc8-a093-ad3451659582	bb813af3-4184-4512-bb63-32fba48db8a0	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-15 18:39:12.322243+05:30
dab61a71-e8e1-4bf8-b155-aae4dd30f4f5	bb813af3-4184-4512-bb63-32fba48db8a0	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-15 18:39:12.322243+05:30
67912afb-bab1-41f5-9e84-28d64b8c1e5d	bb813af3-4184-4512-bb63-32fba48db8a0	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-15 18:39:12.322243+05:30
3b24933d-ec86-4b6c-82d6-b316f4723d6c	bb813af3-4184-4512-bb63-32fba48db8a0	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-15 18:39:12.322243+05:30
c8feb6ed-fb27-491f-a84b-119992fbeac7	9a02ca9b-0234-4504-8ab5-2d4362f4d651	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-20 17:29:59.990285+05:30
f989886b-85de-4e53-9ac3-4b7bed647ad2	9a02ca9b-0234-4504-8ab5-2d4362f4d651	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-20 17:29:59.990285+05:30
06518104-c492-4a41-bf15-ebb13ec56216	9a02ca9b-0234-4504-8ab5-2d4362f4d651	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-05-20 17:29:59.990285+05:30
0e979a6b-9c6c-4270-913d-cb4af0eaca98	9a02ca9b-0234-4504-8ab5-2d4362f4d651	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-20 17:29:59.990285+05:30
12d05302-e641-4f9b-a416-8769f149b16b	286385dc-7884-42da-992f-6891fd1bccb5	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-20 17:33:11.361647+05:30
ae200b2e-7677-450d-a412-04aabf8e5eff	286385dc-7884-42da-992f-6891fd1bccb5	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-20 17:33:11.361647+05:30
93ec5546-4a5b-4ded-b786-2107e4a3d86a	286385dc-7884-42da-992f-6891fd1bccb5	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-20 17:33:11.361647+05:30
a28f6806-0aff-4a90-bee3-2a780fbe16aa	286385dc-7884-42da-992f-6891fd1bccb5	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-20 17:33:11.361647+05:30
64a7aeb5-cc2f-467f-abe8-6ef1245dbef4	286385dc-7884-42da-992f-6891fd1bccb5	8b7303c4-9149-4688-88ca-8aa116cd652c	t	2026-05-20 17:33:11.361647+05:30
9b04c08c-0765-49e8-8e7a-e25cfe72b1c6	286385dc-7884-42da-992f-6891fd1bccb5	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-20 17:33:11.361647+05:30
1b6b8b89-83e3-4330-a35e-ccca1e78d2f8	286385dc-7884-42da-992f-6891fd1bccb5	51050e72-c564-416b-880f-89bcb9d65d53	t	2026-05-20 17:33:11.361647+05:30
74a8d00a-bfad-4b5e-9be3-85623d419691	9e271530-fd95-4be5-819d-a534e09a83c3	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-20 17:34:39.085556+05:30
62d1a833-d202-42f1-9443-543540e643e6	9e271530-fd95-4be5-819d-a534e09a83c3	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-20 17:34:39.085556+05:30
68197813-dbdd-4de8-b039-eb12b9154701	9e271530-fd95-4be5-819d-a534e09a83c3	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-20 17:34:39.085556+05:30
fd561d0f-3930-432a-a5a7-aa074269aec5	9e271530-fd95-4be5-819d-a534e09a83c3	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-20 17:34:39.085556+05:30
a59be4f7-2a57-427f-a976-371978f375b6	9e271530-fd95-4be5-819d-a534e09a83c3	9df5a7a7-50ee-474c-85e7-d6822fbae030	t	2026-05-20 17:34:39.085556+05:30
5dd9a5ca-c5e7-4bdd-9ff1-a71787b2e1b2	9e271530-fd95-4be5-819d-a534e09a83c3	5d46a339-5b39-4742-908a-228e3067e7ff	t	2026-05-20 17:34:39.085556+05:30
8dea02cc-8986-48dd-a082-e289e6454bae	9e271530-fd95-4be5-819d-a534e09a83c3	e3b71d41-c839-4ccb-8674-e8af8e908bf3	t	2026-05-20 17:34:39.085556+05:30
48bb58b1-26d5-4a33-ae6e-3e99784d2d70	7b6562b8-be72-4df1-a0b9-702c9ceec431	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-26 19:57:51.916357+05:30
a4ee3774-8a44-4f93-ad00-3584d979ef2c	7b6562b8-be72-4df1-a0b9-702c9ceec431	254796ab-194d-48fc-b9cb-dca22eab25e9	f	2026-05-26 19:57:51.916357+05:30
f9062965-5207-4805-bebf-5f2ef5f0119c	7b6562b8-be72-4df1-a0b9-702c9ceec431	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-26 19:57:51.916357+05:30
4d061c0f-e140-443a-8568-08c64bc3ca5e	7b6562b8-be72-4df1-a0b9-702c9ceec431	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-26 19:57:51.916357+05:30
20e1b412-4cd7-44fa-9ee4-db00c3a10f25	f6a128a7-8725-4952-bd78-cf852e1846a8	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-26 19:59:06.791671+05:30
50794f87-86d0-49bf-839d-a89e032a8684	f6a128a7-8725-4952-bd78-cf852e1846a8	254796ab-194d-48fc-b9cb-dca22eab25e9	f	2026-05-26 19:59:06.791671+05:30
282b48eb-a5a0-42da-966d-0d012968bc40	f6a128a7-8725-4952-bd78-cf852e1846a8	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-05-26 19:59:06.791671+05:30
27cddc9e-69fd-4e48-9bc4-5029690b82a0	f6a128a7-8725-4952-bd78-cf852e1846a8	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-05-26 19:59:06.791671+05:30
ffd73de8-af07-47c9-82f4-14c49a1270cd	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-28 19:52:00.615254+05:30
106d8b44-cb86-4d62-b988-2acef3898439	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-28 19:52:00.615254+05:30
7dbe162d-85bd-42df-8160-153e045855d4	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-28 19:52:00.615254+05:30
f121366b-b14e-4a31-ad11-485eef8b8782	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-28 19:52:00.615254+05:30
fa81889c-db86-4679-b844-7758c6bbd622	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	9df5a7a7-50ee-474c-85e7-d6822fbae030	t	2026-05-28 19:52:00.615254+05:30
9f276d52-5b00-48cf-a003-a36c86c12be2	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-28 19:52:00.615254+05:30
bd338133-4284-4aeb-8ef2-a861e22998ad	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	e3b71d41-c839-4ccb-8674-e8af8e908bf3	t	2026-05-28 19:52:00.615254+05:30
ae89b129-42fb-4229-bf6f-bafff7009d9f	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-28 19:53:25.260119+05:30
4d37801e-ed11-4448-bcdf-f0300a58b146	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-28 19:53:25.260119+05:30
ccffcc4d-9085-4237-b82d-d94d9c07b77a	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-28 19:53:25.260119+05:30
b97ea1ea-0f43-4f4f-a419-e9673d321fa7	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-28 19:53:25.260119+05:30
e710158f-3274-4daf-a36d-6f6421ffb117	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	9df5a7a7-50ee-474c-85e7-d6822fbae030	t	2026-05-28 19:53:25.260119+05:30
036f67ee-1565-4525-8e8d-0ed9d35b8c19	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-28 19:53:25.260119+05:30
ee6729c0-18db-4370-9d71-a6b991ca5f67	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	e3b71d41-c839-4ccb-8674-e8af8e908bf3	t	2026-05-28 19:53:25.260119+05:30
28faa760-6955-4c1b-94d5-b32290bb2e2a	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-28 19:55:26.50703+05:30
454d6863-9ef5-4d23-bf5c-d172fe61462a	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-28 19:55:26.50703+05:30
bc8a67b6-6438-4c8e-bac3-5c44efd7dcf4	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-28 19:55:26.50703+05:30
3e1b063d-0c1b-4b40-903c-d7f3012b8e03	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-28 19:55:26.50703+05:30
78e0240e-b99e-4068-a938-e2d157caf676	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	8b7303c4-9149-4688-88ca-8aa116cd652c	t	2026-05-28 19:55:26.50703+05:30
aa567e3e-88d7-4399-8a83-a18bea25b3ed	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-28 19:55:26.50703+05:30
f787faac-dc18-4ba1-b843-b6b8d381f55b	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	51050e72-c564-416b-880f-89bcb9d65d53	t	2026-05-28 19:55:26.50703+05:30
d209126e-971d-4bc1-966e-679041ad44f4	eb48778c-f7c9-4361-be6f-8d9a2eccab19	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-05-28 20:05:15.473478+05:30
a2964a7b-39e2-4e9f-be09-93783950197f	eb48778c-f7c9-4361-be6f-8d9a2eccab19	9eff45a6-f102-4628-940e-c3d71a8291d7	f	2026-05-28 20:05:15.473478+05:30
dfdd569b-7036-4c3b-9329-c9fceca9da9e	eb48778c-f7c9-4361-be6f-8d9a2eccab19	a722f572-b3bc-4d01-a865-1d3a33fa464b	f	2026-05-28 20:05:15.473478+05:30
7f1bfdfb-1aac-4891-940c-0904bcc4bee7	eb48778c-f7c9-4361-be6f-8d9a2eccab19	f0a9d822-71ae-40ff-ba61-45b61e562863	f	2026-05-28 20:05:15.473478+05:30
5d1465fc-26cd-4365-b935-bb16c7d3ecf5	eb48778c-f7c9-4361-be6f-8d9a2eccab19	9df5a7a7-50ee-474c-85e7-d6822fbae030	t	2026-05-28 20:05:15.473478+05:30
7951df03-2248-41a6-b965-312ba4371a84	eb48778c-f7c9-4361-be6f-8d9a2eccab19	fe19b797-2517-413a-a66c-30c8a9371d0f	t	2026-05-28 20:05:15.473478+05:30
5aec9ea5-f867-401c-83a3-cea20754824a	eb48778c-f7c9-4361-be6f-8d9a2eccab19	e3b71d41-c839-4ccb-8674-e8af8e908bf3	t	2026-05-28 20:05:15.473478+05:30
3d14d726-8c9d-4e68-ba52-72062fc704c6	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-03 10:19:22.580842+05:30
ea9c0b9a-3a62-4380-ab8c-d42906118c01	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-03 10:19:22.580842+05:30
64e504ec-1e19-429f-a69b-9bb1808597c2	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-03 10:19:22.580842+05:30
b16f4001-e531-424e-871c-9c73cdf94a07	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-03 10:19:22.580842+05:30
a80b7b9b-74bb-407c-a390-1c8e7cd65d0a	af93e596-e524-4830-b1e6-78051eb850b6	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-03 10:42:18.262391+05:30
aea7de47-bb58-49b3-9837-d366a942e4be	af93e596-e524-4830-b1e6-78051eb850b6	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-03 10:42:18.262391+05:30
99656742-c50f-4865-8efc-8c659d326c31	af93e596-e524-4830-b1e6-78051eb850b6	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-03 10:42:18.262391+05:30
cd383d16-187c-4158-b077-235e795a50e0	af93e596-e524-4830-b1e6-78051eb850b6	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-03 10:42:18.262391+05:30
96a42c37-43fa-4e0f-b802-be070757eb10	877deab2-5b88-4573-8fce-c4e52706b7e0	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-03 10:42:18.366267+05:30
74f0eeae-505b-467a-bb7d-ae38e79b0e54	877deab2-5b88-4573-8fce-c4e52706b7e0	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-03 10:42:18.366267+05:30
3a729e70-c3b5-4f11-b071-340eef8d197a	877deab2-5b88-4573-8fce-c4e52706b7e0	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-03 10:42:18.366267+05:30
42e8eec8-f6e3-421a-b3be-28e1d71fd6a7	877deab2-5b88-4573-8fce-c4e52706b7e0	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-03 10:42:18.366267+05:30
8660afbd-e12d-453f-bfd7-f9519479e96f	b24a3354-4780-415a-9934-aebff21f9096	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-03 10:42:18.392372+05:30
77b04784-25b9-4ea1-951a-348c1abc4ffd	b24a3354-4780-415a-9934-aebff21f9096	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-03 10:42:18.392372+05:30
890ffdfd-b66f-4e85-82cb-feb5c41b22fe	b24a3354-4780-415a-9934-aebff21f9096	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-03 10:42:18.392372+05:30
9fcd715f-2a4b-4f55-af6f-983c28276234	b24a3354-4780-415a-9934-aebff21f9096	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-03 10:42:18.392372+05:30
ba7485a6-bdb6-4ceb-8d7e-bbe7d47f2dd7	d839e6c4-853f-43f2-87ef-ed49a6715999	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.47058+05:30
43cda380-99ba-4301-a62a-8f533ab8a687	d839e6c4-853f-43f2-87ef-ed49a6715999	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.47058+05:30
31aea8b6-5dd4-46ba-845e-6e446b852d7f	d839e6c4-853f-43f2-87ef-ed49a6715999	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.47058+05:30
7216d505-2132-4af1-ac59-81c6fc891056	d839e6c4-853f-43f2-87ef-ed49a6715999	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.47058+05:30
b2df7e08-0304-4bf3-b1fe-33b2736b49e8	5e245f6a-ad3a-4202-860e-60f2c0ba5c55	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.632134+05:30
efa6fd5b-d31e-40d3-af0e-48ef82e59eb8	5e245f6a-ad3a-4202-860e-60f2c0ba5c55	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.632134+05:30
f17b9ccb-3dfb-4fc6-bdcd-eb16d9a6e0cd	5e245f6a-ad3a-4202-860e-60f2c0ba5c55	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.632134+05:30
d935e53b-21db-480d-a832-0de37529b882	5e245f6a-ad3a-4202-860e-60f2c0ba5c55	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.632134+05:30
90072503-3fc6-4d94-9fcd-c4035c5efc86	5fee4389-662f-4e8f-bc8c-54f0acc25920	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.657837+05:30
24db6fa9-b605-4911-a191-212b78fa29d4	5fee4389-662f-4e8f-bc8c-54f0acc25920	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.657837+05:30
c7e0b159-e096-4f48-b67f-06210e4ccc74	5fee4389-662f-4e8f-bc8c-54f0acc25920	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.657837+05:30
73981aa6-eb84-4a32-a91f-7bde06b34be2	5fee4389-662f-4e8f-bc8c-54f0acc25920	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.657837+05:30
b26de04f-1c02-4a94-b8be-17ff8cb28cf9	e4567f9f-d50e-4598-8e38-473c09467f6b	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.687338+05:30
7a4ab395-78cf-4923-8560-9ad50e6a105c	e4567f9f-d50e-4598-8e38-473c09467f6b	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.687338+05:30
516158cc-602b-49da-8354-8f2e1b25c6e5	e4567f9f-d50e-4598-8e38-473c09467f6b	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.687338+05:30
0c8c0058-b1a0-494a-ae8a-b633639833c4	e4567f9f-d50e-4598-8e38-473c09467f6b	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.687338+05:30
86f47400-cd13-41dd-873d-1e7aacfb79c0	9489fc67-83b4-4c5e-91e4-657967153e6f	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.71899+05:30
f6c8cbe5-2987-455d-8c71-2e0f13b5ecf3	9489fc67-83b4-4c5e-91e4-657967153e6f	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.71899+05:30
37e027ce-71f8-4ec5-b4a1-4b35dd680e2c	9489fc67-83b4-4c5e-91e4-657967153e6f	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.71899+05:30
6cb490ee-20a5-4ed4-a95e-bf7711dbf095	9489fc67-83b4-4c5e-91e4-657967153e6f	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.71899+05:30
8aa9d347-69f6-453c-bae6-523b602f1a31	2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.749234+05:30
379a97b5-3cd4-40ff-978c-fc9c40dfca1c	2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.749234+05:30
12cb7cf8-5877-4a7b-9c7b-d5ce94c05c8e	2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.749234+05:30
6ed86c63-4f33-4adf-a0a5-a4a661985e05	2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.749234+05:30
0e5c482a-7f72-43e3-bada-d81aa2947966	acef1596-f9e7-46db-afff-ee5584022f4d	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.778486+05:30
59f3f000-7293-4e0e-b7f4-2c01944b880d	acef1596-f9e7-46db-afff-ee5584022f4d	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.778486+05:30
2398ff94-c662-4376-8d87-a41a8d6537cb	acef1596-f9e7-46db-afff-ee5584022f4d	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.778486+05:30
ef8726f4-0413-4401-b66f-08571e90b3ea	acef1596-f9e7-46db-afff-ee5584022f4d	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.778486+05:30
629997aa-45f7-453c-9ad2-fe4a6625c2ed	85bfef6f-3286-4710-8317-7b71bee456d2	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.802481+05:30
9f8b41b8-07d6-48d8-a070-647357fd5253	85bfef6f-3286-4710-8317-7b71bee456d2	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.802481+05:30
421c1fa2-363a-4013-b3f1-a677707fb409	85bfef6f-3286-4710-8317-7b71bee456d2	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.802481+05:30
fcb26bf6-9716-4d0b-a4e9-c2aefc5e5034	85bfef6f-3286-4710-8317-7b71bee456d2	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.802481+05:30
b62866e0-b23c-4bba-ac16-a5064b5106ec	ff07f896-ce93-4634-9be8-aa5caff17922	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.827206+05:30
624ad27f-0bd8-48ad-b085-60c6a71ab779	ff07f896-ce93-4634-9be8-aa5caff17922	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.827206+05:30
08794bfe-f43e-4ea9-91ab-c8e4fc0d665f	ff07f896-ce93-4634-9be8-aa5caff17922	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.827206+05:30
6f95160a-9d89-4ae1-8197-bcf51d34ce2c	ff07f896-ce93-4634-9be8-aa5caff17922	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.827206+05:30
03c64777-720a-4fd7-9b70-2e4d4d29a8cd	429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.852922+05:30
a2973c44-3119-4445-9831-bcf0a3e170d4	429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.852922+05:30
26ce9129-5b81-4b55-8e3f-6e46c6fa5c6d	429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.852922+05:30
9432b441-5001-4253-8cfb-79766c17677a	429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.852922+05:30
28d9088b-3f09-44da-866f-b514536b55dd	6c59b04c-50e9-4c78-9802-55e11789511f	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.878392+05:30
79aaa6a8-c932-4c71-9e35-13c18f9e557f	6c59b04c-50e9-4c78-9802-55e11789511f	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.878392+05:30
d6446281-89d3-4a56-a2c4-9ced782c9323	6c59b04c-50e9-4c78-9802-55e11789511f	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.878392+05:30
f991850a-757c-4c77-9947-e54ce84d94bc	6c59b04c-50e9-4c78-9802-55e11789511f	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.878392+05:30
f0dbbed4-2e8b-4a8a-b5b7-cdc6d275e720	d875c077-b63e-4ed4-ae80-2e489074f7b7	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.903105+05:30
d720e56a-2216-4f68-8a07-b64a42d8fe63	d875c077-b63e-4ed4-ae80-2e489074f7b7	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.903105+05:30
a612b31d-3d75-408f-bd7f-2fefd18c1c0b	d875c077-b63e-4ed4-ae80-2e489074f7b7	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.903105+05:30
6429b9c0-7068-4401-96c4-d8043dcba885	d875c077-b63e-4ed4-ae80-2e489074f7b7	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.903105+05:30
69872225-fbd7-4151-bab3-a8d3597b5d0b	b7cc526c-3425-4e94-b8eb-15b08e77ed8e	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.926573+05:30
a870e455-bf0b-44bc-9b6b-8ce2fe486708	b7cc526c-3425-4e94-b8eb-15b08e77ed8e	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.926573+05:30
0763817b-11a5-4d1d-abcd-d36a90027a78	b7cc526c-3425-4e94-b8eb-15b08e77ed8e	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.926573+05:30
d703b0a2-1180-4bbf-9b43-7273ff3f9863	b7cc526c-3425-4e94-b8eb-15b08e77ed8e	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.926573+05:30
6a7d4123-d4da-4d51-8880-94fe848a069e	01d86598-3dc3-4b11-974a-d229fb4b6af5	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.952716+05:30
e8909ff2-06b9-486f-b0fe-0a53195ccc53	01d86598-3dc3-4b11-974a-d229fb4b6af5	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.952716+05:30
f6e2e991-af5e-44b6-9019-c91097b63ae8	01d86598-3dc3-4b11-974a-d229fb4b6af5	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.952716+05:30
9e46c4a4-e476-4a40-a8fb-4be914bae0d3	01d86598-3dc3-4b11-974a-d229fb4b6af5	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.952716+05:30
f345fcbf-0ffb-4e8a-9b22-73c6a71c4fe6	33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.974062+05:30
0a10bb73-b868-4175-974b-3142e18baf9d	33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.974062+05:30
56629a68-7fa6-4000-90be-e97ec20bf728	33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.974062+05:30
7c59d8ba-9c8d-4f29-bdfe-0952e3eb1e74	33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.974062+05:30
50582a69-0575-4192-ae6b-20c53e76d49d	b28be76a-b92a-4165-a570-502cfd236b57	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:18.994785+05:30
8c3e2e33-2528-475d-8df7-2f47e91ea603	b28be76a-b92a-4165-a570-502cfd236b57	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:18.994785+05:30
0afa12ab-05c7-4cc4-9e9f-66c2fc8f1f01	b28be76a-b92a-4165-a570-502cfd236b57	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:18.994785+05:30
69ea1dc4-088b-4f5b-b430-8d9dce163625	b28be76a-b92a-4165-a570-502cfd236b57	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:18.994785+05:30
ca1882b1-8c45-4810-a9ca-64ab9a53886e	39b4f62a-e087-4eef-946d-f40dddde350d	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.016316+05:30
f901560e-ad1b-404c-9808-0b100062936b	39b4f62a-e087-4eef-946d-f40dddde350d	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.016316+05:30
70f55f11-1153-4d63-a35e-12f15afe6c27	39b4f62a-e087-4eef-946d-f40dddde350d	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.016316+05:30
8c81e460-344f-4f46-af88-3ddd8774519d	39b4f62a-e087-4eef-946d-f40dddde350d	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.016316+05:30
68d67f23-f9c9-4a2d-8837-166377338622	76fa6ddc-f8a9-4159-a844-1a717ed3bc29	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.039959+05:30
5fdcac10-b6c1-4db5-a23b-64a75b1fd2d9	76fa6ddc-f8a9-4159-a844-1a717ed3bc29	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.039959+05:30
c06d206a-219a-4060-b1fa-014b4fba22de	76fa6ddc-f8a9-4159-a844-1a717ed3bc29	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.039959+05:30
e48ce249-6cba-4c78-b701-f7be869d44f5	76fa6ddc-f8a9-4159-a844-1a717ed3bc29	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.039959+05:30
d9fe8746-db7c-4a54-af7c-02e6d370afaf	3465cf1c-6a60-48a9-8409-5deaea64d19f	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.071605+05:30
928a8307-32fe-4309-a42a-b8498238f283	3465cf1c-6a60-48a9-8409-5deaea64d19f	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.071605+05:30
0974bef8-d3ea-40af-a88b-c28ec1b84950	3465cf1c-6a60-48a9-8409-5deaea64d19f	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.071605+05:30
72dc7afa-7950-4ce0-8c3c-4afa8dfd55f3	3465cf1c-6a60-48a9-8409-5deaea64d19f	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.071605+05:30
7d6325d7-7f9e-48c4-9803-579021ca489a	ee855393-dc17-44e8-9851-76fe172f2c53	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.092709+05:30
6f0f757b-9a23-4b6d-8604-8b78bd87bd1b	ee855393-dc17-44e8-9851-76fe172f2c53	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.092709+05:30
2d17d032-37a6-4abe-9000-7d4bbe3e347e	ee855393-dc17-44e8-9851-76fe172f2c53	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.092709+05:30
33f221d4-cb87-41d5-86e2-ae5c7428a18d	ee855393-dc17-44e8-9851-76fe172f2c53	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.092709+05:30
41fbd1ca-7a82-4a90-85b7-e66c0d5e8eff	cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.118236+05:30
5017c062-a82f-4443-92e6-fb9a4b40cb4a	cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.118236+05:30
6142310f-8bc0-446b-baa7-3f62450c3bc2	cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.118236+05:30
21cfedaf-f962-4779-afa5-ce12ab2a8f51	cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.118236+05:30
defacdd8-8d89-4132-b8c3-0f5f2e3f30d1	69ddd74f-769e-4225-bf84-6fe36504a018	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.145157+05:30
2aa72702-2dfb-4f87-b60b-eed19310c4a5	69ddd74f-769e-4225-bf84-6fe36504a018	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.145157+05:30
30566754-8458-42e0-a565-a8bf5d600561	69ddd74f-769e-4225-bf84-6fe36504a018	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.145157+05:30
6af08b4b-cbf4-44bc-8e57-574d8f30f041	69ddd74f-769e-4225-bf84-6fe36504a018	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.145157+05:30
fa280c0b-4441-4d3a-8fba-14005a87db3e	17921d74-7486-4d11-98d9-448be5f04af4	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.167602+05:30
4c761df7-4226-4d2f-87e5-30d10011b042	17921d74-7486-4d11-98d9-448be5f04af4	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.167602+05:30
6211f5e8-23b0-4803-a6c3-061792ccecef	17921d74-7486-4d11-98d9-448be5f04af4	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.167602+05:30
52dac401-e813-4f93-9f93-5e7b14eb9dc2	17921d74-7486-4d11-98d9-448be5f04af4	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.167602+05:30
e4e53b83-f5af-4512-8b3a-6d48626503b3	2d58f4c5-44f0-4af8-872f-71f7bec32f12	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.199448+05:30
f26c77b5-6ee8-4b30-a45a-735d0df2ff9c	2d58f4c5-44f0-4af8-872f-71f7bec32f12	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.199448+05:30
4e2283c6-e25f-4237-8624-564546de64cb	2d58f4c5-44f0-4af8-872f-71f7bec32f12	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.199448+05:30
1fef8a84-e827-4087-8c36-a25a77c22a02	2d58f4c5-44f0-4af8-872f-71f7bec32f12	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.199448+05:30
437426a5-2b89-4d34-a818-65d70863bf8d	821ebc49-8c56-4662-b5fe-dc7da1623cf5	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.245951+05:30
01664800-0f04-4b3e-ae81-4b4542e1e1a7	821ebc49-8c56-4662-b5fe-dc7da1623cf5	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.245951+05:30
3dac4abd-6cdf-4038-8451-ef7c648e9bc4	821ebc49-8c56-4662-b5fe-dc7da1623cf5	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.245951+05:30
d5d5f0ae-f468-44c3-8b12-0222e85bbefa	821ebc49-8c56-4662-b5fe-dc7da1623cf5	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.245951+05:30
6c3a82ab-e21f-448e-aae0-cc1a9fb27e5d	f79df6f8-c599-4767-803a-3fa522f7e538	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.277793+05:30
7dfdd095-e6d6-4c3b-884f-423d8d9a73bd	f79df6f8-c599-4767-803a-3fa522f7e538	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.277793+05:30
ec00ac6d-e493-4fdb-bc90-5002f5219b60	f79df6f8-c599-4767-803a-3fa522f7e538	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.277793+05:30
311cf419-f554-428b-8a07-40d9c214242a	f79df6f8-c599-4767-803a-3fa522f7e538	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.277793+05:30
dce019af-5534-42e7-aeb8-b3c3e1747dab	b29b84ed-5055-464e-b02d-75f7984db2cd	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.302372+05:30
087e8031-0a6b-4b95-b82b-890d0bb903b6	b29b84ed-5055-464e-b02d-75f7984db2cd	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.302372+05:30
59e637db-6c79-4dba-bfd8-5fff1ca4cab9	b29b84ed-5055-464e-b02d-75f7984db2cd	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.302372+05:30
33cdc832-348e-4d0f-b7eb-3fc462b50858	b29b84ed-5055-464e-b02d-75f7984db2cd	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.302372+05:30
d0ca6af2-9796-4a6b-bfdf-4dc364358cf0	a1438d43-6950-4284-882e-a2f24f725c22	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.325959+05:30
3ce95209-1f4b-43f3-82b4-2232ca5758ac	a1438d43-6950-4284-882e-a2f24f725c22	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.325959+05:30
e01b6f52-ea69-48d8-a150-bfd5ee2c8507	a1438d43-6950-4284-882e-a2f24f725c22	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.325959+05:30
5bfe0b0e-b780-4e82-917e-2c10ec35ddd1	a1438d43-6950-4284-882e-a2f24f725c22	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.325959+05:30
4b920153-ea65-4f36-b24a-c751df275d1c	dbd310a9-cbd9-4e39-916f-280d88424395	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.351301+05:30
9953ca29-6c18-448a-bffe-7227ca9ff066	dbd310a9-cbd9-4e39-916f-280d88424395	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.351301+05:30
d801b254-9160-4a66-acee-3838efe59ba1	dbd310a9-cbd9-4e39-916f-280d88424395	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.351301+05:30
115e6c55-00f9-4dd6-acf4-1dae62956b3a	dbd310a9-cbd9-4e39-916f-280d88424395	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.351301+05:30
af0cfa04-3037-4317-9cdd-0322f8d1ee17	7f72d70c-f822-4258-9c60-c49c3b518bb7	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.375995+05:30
6d0d99a0-37e5-460f-8824-cc92ec899f44	7f72d70c-f822-4258-9c60-c49c3b518bb7	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.375995+05:30
dcb2f45c-1e46-4c6d-87be-84af7b2ac088	7f72d70c-f822-4258-9c60-c49c3b518bb7	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.375995+05:30
9a2d73d5-fcf6-41a5-aab2-0f2a9c3163d1	7f72d70c-f822-4258-9c60-c49c3b518bb7	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.375995+05:30
6276c9f0-e4df-453b-999b-c6185458f3c8	dcd84cc3-984a-42fe-881b-884251662e6a	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.398956+05:30
a476d10b-abf3-46af-b236-8f981f86bfb7	dcd84cc3-984a-42fe-881b-884251662e6a	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.398956+05:30
cf768b44-5774-4883-a315-63ebaa65aad3	dcd84cc3-984a-42fe-881b-884251662e6a	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.398956+05:30
c9675cbd-1cab-421c-a3b8-ecd7223ebf75	dcd84cc3-984a-42fe-881b-884251662e6a	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.398956+05:30
36ed1cf0-5d10-4a71-bce6-d67a29a11fd7	eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.423348+05:30
b9cc1011-4ff0-4109-9dd2-99903b98dfe5	eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.423348+05:30
2957f521-6a68-4dba-9dd5-e968ef0c3ed3	eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.423348+05:30
0e53718d-26e9-4fa1-b543-78cce64ff2c8	eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.423348+05:30
559ca31c-4c92-4750-91aa-fbcc6aeb4118	3e57df1b-6a5d-42c4-bf05-43232953ca09	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.449447+05:30
d56167ac-1fa6-4290-9307-355e8af1b791	3e57df1b-6a5d-42c4-bf05-43232953ca09	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.449447+05:30
4fc17310-de5c-4ec8-899b-6b6c22a9e851	3e57df1b-6a5d-42c4-bf05-43232953ca09	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.449447+05:30
70bf6319-d40c-4bf9-a520-2f2f4d867d08	3e57df1b-6a5d-42c4-bf05-43232953ca09	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.449447+05:30
5572f6b8-1829-40df-bc0e-6788e61b2c3f	43b82bf1-7e23-4c2c-aaca-321b74de92c4	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.475571+05:30
79dc1d1a-9e8c-47c5-b2bb-4d771eed0f01	43b82bf1-7e23-4c2c-aaca-321b74de92c4	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.475571+05:30
b2cb0084-c29d-4c6e-9408-dbf20f38637f	43b82bf1-7e23-4c2c-aaca-321b74de92c4	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.475571+05:30
1c4f4f08-8646-4946-bd6d-adb9af14ff48	43b82bf1-7e23-4c2c-aaca-321b74de92c4	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.475571+05:30
a558276a-c097-4fd2-972e-30e14bfcae0a	8d944d69-764c-4af6-837b-e10e1b2fd533	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.494364+05:30
75a4563e-51f1-4668-a639-e05c8ff0d6d2	8d944d69-764c-4af6-837b-e10e1b2fd533	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.494364+05:30
c6fedb0e-304f-4f50-8d3e-6ce8d4b190a4	8d944d69-764c-4af6-837b-e10e1b2fd533	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.494364+05:30
e99358be-c440-4a40-8737-1c4a3692328b	8d944d69-764c-4af6-837b-e10e1b2fd533	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.494364+05:30
dc9fc554-8c31-4408-a8b4-93aae39e2b1c	22237097-4cab-4b29-8000-d6fc35341589	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.517399+05:30
14534b30-344d-42bf-b2e2-b5883f8d198d	22237097-4cab-4b29-8000-d6fc35341589	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.517399+05:30
c9abed93-5a36-4925-8ade-c868fdcba5de	22237097-4cab-4b29-8000-d6fc35341589	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.517399+05:30
29c77acf-9dc5-4d40-af69-ef693cfb6d90	22237097-4cab-4b29-8000-d6fc35341589	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.517399+05:30
5997c78b-450d-4eb9-80b4-1a1355dc3a19	d19da57c-0fe2-4445-9ee1-3666e15dc012	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.540721+05:30
a86e15a4-aa5c-4be8-bd99-83542fa6cb10	d19da57c-0fe2-4445-9ee1-3666e15dc012	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.540721+05:30
b01da845-bd1c-4185-a274-fe69d325a1c8	d19da57c-0fe2-4445-9ee1-3666e15dc012	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.540721+05:30
63f3cb41-6d49-4ac5-8889-5d5a89a052ab	d19da57c-0fe2-4445-9ee1-3666e15dc012	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.540721+05:30
881ce410-f706-434e-b9cc-d74de7357c9f	dc4c4fcf-cd11-4824-a5fc-b33a2b440563	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.565874+05:30
abeba51a-db5d-4529-808c-0881a498d576	dc4c4fcf-cd11-4824-a5fc-b33a2b440563	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.565874+05:30
72f433a7-9e9b-4d83-8d58-07664ef7ffcc	dc4c4fcf-cd11-4824-a5fc-b33a2b440563	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.565874+05:30
9864bdc4-572f-42be-9dce-13517c9ea07d	dc4c4fcf-cd11-4824-a5fc-b33a2b440563	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.565874+05:30
83f00eb4-1973-448d-ab28-1200755ac88b	fd83d560-17d1-4063-89e4-b0e56bf19b39	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.601268+05:30
63621bab-6cfe-4386-ad59-b4611a32a928	fd83d560-17d1-4063-89e4-b0e56bf19b39	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.601268+05:30
355ccb86-7844-4811-ab15-80c1067d8d15	fd83d560-17d1-4063-89e4-b0e56bf19b39	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.601268+05:30
f210bb04-6dca-4520-a4f5-d50b63875992	fd83d560-17d1-4063-89e4-b0e56bf19b39	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.601268+05:30
959a1fd5-43d3-4415-a3e6-fafb632c1904	6c37736f-b10a-4262-8ae3-9dd9087e5099	27f16dd3-f1b7-405a-8a98-961c086a4bb6	f	2026-07-07 09:39:19.627775+05:30
e8bf618e-0518-49f5-8c6c-ac98e8eb0536	6c37736f-b10a-4262-8ae3-9dd9087e5099	173b0ae5-79be-4eca-a3e5-b204757e845e	f	2026-07-07 09:39:19.627775+05:30
bf628978-0c72-44a9-8e0e-c1664fb7cd85	6c37736f-b10a-4262-8ae3-9dd9087e5099	96555373-ae20-4341-b362-e9e82998e2d5	f	2026-07-07 09:39:19.627775+05:30
c6fc47d1-c0b6-422a-84de-d5ae41ca7b93	6c37736f-b10a-4262-8ae3-9dd9087e5099	d80ab4f7-5711-40fc-82a9-e17249f9778b	f	2026-07-07 09:39:19.627775+05:30
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, full_name, parent_name, parent_phone, parent_email, student_code, is_active, created_at, updated_at, city, address, gender) FROM stdin;
fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	Saleeka	ruwan	0766218578	pubudulakshan72@gmail.com	1012	t	2026-05-13 13:56:46.987496+05:30	2026-05-13 13:56:46.987496+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
0314a791-ea42-429e-a632-38e8dd8ecdde	Tharushi Sithara	sumeda fernando	0766218578	pubudulakshan72@gmail.com	1009	t	2026-05-12 11:29:36.185236+05:30	2026-05-12 11:29:36.185236+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	Nadum	Charitha	0766218578	pubudulakshan72@gmail.com	1000	t	2026-05-06 12:08:50.960514+05:30	2026-05-06 12:08:50.960514+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	male
9a4e5df4-3751-41bb-8de0-9c1d80e626e8	Amindu	Amith	0766218578	pubudulakshan72@gmail.com	1006	t	2026-05-10 18:49:58.973693+05:30	2026-05-10 18:49:58.973693+05:30	Hambantota	NO 204 , School road , Suriyawewa.	male
adbe2730-fe44-44ac-bee9-f8888cf50569	Lashan wasudewa	Amal	0715436047	pubudulakshan72@gmail.com	1002	t	2026-05-06 22:42:19.126842+05:30	2026-05-06 23:11:58.832644+05:30	Suriyawewa	Near the Lake	male
a50e217d-21ce-415d-8035-c37b3cf89a71	Yasiru Nawod	Thushara alwis	0766218578	pubudulakshan72@gmail.com	1010	t	2026-05-12 11:46:24.602474+05:30	2026-05-12 11:46:24.602474+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	male
186e3d3e-396c-411c-9ed0-8b19aa596e15	Charuni Saleeka	Nuwan Gamage	766218578	fdfgdhd	1038	t	2026-05-12 13:07:02.937498+05:30	2026-05-12 13:07:02.937498+05:30	sooriyawewa	4th lane	female
db2737be-154b-4e11-961a-f605558ef0eb	Bithula Pramod	Jayantha Perera	766218578	\N	1023	t	2026-05-12 18:37:17.565816+05:30	2026-05-12 18:37:17.565816+05:30	Vihragala	4th lane, Town	male
a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	Ridmi	Nimal	0766218578	pubudulakshan72@gmail.com	1011	t	2026-05-13 13:55:48.732643+05:30	2026-05-13 13:55:48.732643+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	female
0ce43864-eb9b-465b-97eb-59d4ca09f5e4	Thilini	Asela	0766218578	pubudulakshan72@gmail.com	1033	t	2026-05-13 15:06:22.543803+05:30	2026-05-13 15:06:22.543803+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
e3ded0b9-e857-4b32-83b9-7c167372a544	Rashila	Ajantha	766218578	\N	1042	t	2026-05-13 15:09:52.605311+05:30	2026-05-13 15:09:52.605311+05:30	Kandy	4th lane	male
93667668-78ac-408a-a626-267a7d2607ab	Suhara	anila	0766218578	pubudulakshan72@gmail.com	1046	t	2026-05-13 15:32:22.715511+05:30	2026-05-13 15:32:22.715511+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
3870b309-9c01-4c72-af60-1338fc95f35d	Suhara	Nimal	0766218578	pubudulakshan72@gmail.com	1054	t	2026-05-13 15:33:43.92728+05:30	2026-05-13 15:33:43.92728+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	Namal	Mahin	0766218578	pubudulakshan72@gmail.com	1056	t	2026-05-13 15:56:17.738133+05:30	2026-05-13 15:56:17.738133+05:30	Hambantota	NO 204 , School road , Suriyawewa.	male
5e956353-c70e-4433-aa21-cf0a9bcf3602	Piyath	Rajpaksha	0766218578	pubudulakshan72@gmail.com	1076	t	2026-05-13 15:57:13.95479+05:30	2026-05-13 15:57:13.95479+05:30	Hambantota	NO 204 , School road , Suriyawewa.	male
ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	gayeni	Mahela	0766218578	pubudulakshan72@gmail.com	1234	t	2026-05-13 15:58:13.533656+05:30	2026-05-13 15:58:13.533656+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
53d675a4-a5b1-4f09-8034-e00cbd9a460c	Ashadi	Kamal	0766218578	pubudulakshan72@gmail.com	1022	t	2026-05-13 19:56:23.852513+05:30	2026-05-13 19:56:23.852513+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
2da0cce0-e401-4a70-b12c-bfaf452c6593	Jane Silva	Tharindu Silva	0766218578	parent@example.com	S001	t	2026-05-12 11:52:12.067222+05:30	2026-05-14 11:42:48.879881+05:30	Colombo	No. 12	female
00999c6b-5480-499d-9e70-a99987eb9d64	Janani Ishara	Amala senanayaka	0766218578	pubudulakshan72@gmail.com	1027	t	2026-05-14 19:38:52.457095+05:30	2026-05-14 19:38:52.457095+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
ac21cfd7-4584-466d-a740-eb25d6baca2d	Chichi	Mahinda	0766218578	pubudulakshan72@gmail.com	1053	t	2026-05-14 20:49:13.608467+05:30	2026-05-14 20:49:13.608467+05:30	Hambantota	NO 204 , School road , Suriyawewa.	male
34e88aa0-4819-4132-b9c5-72d1ac14c0a4	Maleesha	Upali	0766218578	pubudulakshan72@gmail.com	1055	t	2026-05-14 20:51:23.197398+05:30	2026-05-14 20:51:23.197398+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
d16622d3-5780-4188-b1d9-67254a2e59c2	Limini	Rajapaksha	0766218578	pubudulakshan72@gmail.com	1019	t	2026-05-14 21:22:36.374023+05:30	2026-05-14 21:22:36.374023+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
836fd154-cdfd-49f0-82eb-a55e67ec7406	Aseni	Mahinda	0766218578	pubudulakshan72@gmail.com	1037	t	2026-05-14 21:33:17.251306+05:30	2026-05-14 21:33:17.251306+05:30	Hambantota	NO 204 , School road , Suriyawewa.	female
5dd90925-434b-4342-9691-392bb979b295	Matheesha	Aruja	0766218578	pubudulakshan72@gmail.com	1087	t	2026-05-14 21:35:26.692188+05:30	2026-05-14 21:35:26.692188+05:30	Hambantota	NO 204 , School road , Suriyawewa.	male
742d2ddc-aa8a-4090-aebd-4af2df9821f5	Ashen Wijesinghe	Ashen Wijesinghe	766218578	user@@gmail.com	1121	t	2026-05-15 17:33:01.628233+05:30	2026-05-15 17:33:01.628233+05:30	Sample21	No. 21, School Road, Colombo	Male
e8decff2-9160-4569-ac1d-711423e514a9	Piumi Senanayake	Piumi Senanayake	766218578	plainaddress	1122	t	2026-05-15 17:33:01.762424+05:30	2026-05-15 17:33:01.762424+05:30	Sample22	No. 22, School Road, Colombo	Female
eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	Lakshan Peris	Lakshan Peris	766218578	missingatsign.com	1123	t	2026-05-15 17:33:01.779336+05:30	2026-05-15 17:33:01.779336+05:30	Sample23	No. 23, School Road, Colombo	Male
60a28492-4654-4cbb-98fc-b1c49ca1303c	Hiruni Madushika	Hiruni Madushika	766218578	@nouser.com	1124	t	2026-05-15 17:33:01.796465+05:30	2026-05-15 17:33:01.796465+05:30	Sample24	No. 24, School Road, Colombo	Female
b2540f04-3218-465c-9c23-c61dc3c7b1fb	Dilshan Karunaratne	Dilshan Karunaratne	766218578	name@.com	1125	t	2026-05-15 17:33:01.810368+05:30	2026-05-15 17:33:01.810368+05:30	Sample25	No. 25, School Road, Colombo	Male
ea289faa-0c02-495a-923c-049ff2c481a6	Nethmi Peiris	Nethmi Peiris	766218578	test#mail.com	1126	t	2026-05-15 17:33:01.828553+05:30	2026-05-15 17:33:01.828553+05:30	Sample26	No. 26, School Road, Colombo	Female
845cf7b4-50ec-45ae-bfd9-6d669c02f537	Sajith Ranasinghe	Sajith Ranasinghe	766218578	abc..123@gmail	1127	t	2026-05-15 17:33:01.84704+05:30	2026-05-15 17:33:01.84704+05:30	Sample27	No. 27, School Road, Colombo	Male
0351f9a0-303c-4504-8941-ee3e1a1c592f	Imesha Fernando	Imesha Fernando	766218578	invalid_email	1128	t	2026-05-15 17:33:01.862323+05:30	2026-05-15 17:33:01.862323+05:30	Sample28	No. 28, School Road, Colombo	Female
aa18c05c-e280-453c-a87f-a368f8ad7de9	Kavindu Wickramasinghe	Kavindu Wickramasinghe	766218578	space mail@gmail.com	1129	t	2026-05-15 17:33:01.87833+05:30	2026-05-15 17:33:01.87833+05:30	Sample29	No. 29, School Road, Colombo	Male
74fe90b4-501f-4458-be0b-bcc42f08df21	Tharushi Silva	Tharushi Silva	766218578	user@domain	1130	t	2026-05-15 17:33:01.896755+05:30	2026-05-15 17:33:01.896755+05:30	Sample30	No. 30, School Road, Colombo	Female
ea3a30af-37a6-43e5-ade7-a7323f267787	Pasindu Gunawardena	Pasindu Gunawardena	766218578	wrong@domain,com	1131	t	2026-05-15 17:33:01.912104+05:30	2026-05-15 17:33:01.912104+05:30	Sample31	No. 31, School Road, Colombo	Male
4effd2d5-edf7-408f-8dc9-53705a2e2255	Yasara Ekanayake	Yasara Ekanayake	766218578	double@@test.com	1132	t	2026-05-15 17:33:01.927048+05:30	2026-05-15 17:33:01.927048+05:30	Sample32	No. 32, School Road, Colombo	Female
5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	Chamodi Rajapaksha	Chamodi Rajapaksha	766218578	mail.com	1133	t	2026-05-15 17:33:01.944831+05:30	2026-05-15 17:33:01.944831+05:30	Sample33	No. 33, School Road, Colombo	Male
bf0a7707-1978-4a11-a011-4de82a53161f	Vihanga De Silva	Vihanga De Silva	766218578	student@domain.	1134	t	2026-05-15 17:33:01.962715+05:30	2026-05-15 17:33:01.962715+05:30	Sample34	No. 34, School Road, Colombo	Female
8251e1df-58ea-4d12-b02e-3062e78df907	Nipun Samarasinghe	Nipun Samarasinghe	766218578	123@123	1135	t	2026-05-15 17:33:01.981502+05:30	2026-05-15 17:33:01.981502+05:30	Sample35	No. 35, School Road, Colombo	Male
3c288a85-886b-4e7d-a721-7244770314f5	Sanduni Jayawardena	Sanduni Jayawardena	766218578	name@com	1136	t	2026-05-15 17:33:01.999343+05:30	2026-05-15 17:33:01.999343+05:30	Sample36	No. 36, School Road, Colombo	Female
4537a978-3748-49c4-bef2-8e95a922e0df	Charith Bandara	Charith Bandara	766218578	hello#gmail.com	1137	t	2026-05-15 17:33:02.011498+05:30	2026-05-15 17:33:02.011498+05:30	Sample37	No. 37, School Road, Colombo	Male
583eb113-b74f-49f6-a0ba-cfb50dae6699	Madhavi Kulathunga	Madhavi Kulathunga	766218578	bad email	1138	t	2026-05-15 17:33:02.029868+05:30	2026-05-15 17:33:02.029868+05:30	Sample38	No. 38, School Road, Colombo	Female
bd0a9878-cf3f-40e8-889f-c0f4ec694135	Shehan Rodrigo	Shehan Rodrigo	766218578	missingdot@gmail	1139	t	2026-05-15 17:33:02.046783+05:30	2026-05-15 17:33:02.046783+05:30	Sample39	No. 39, School Road, Colombo	Male
7ad6633e-67bd-429c-8440-f0d9ffb52c79	Ayesha Pathum	Ayesha Pathum	766218578	sample@invalid@com	1140	t	2026-05-15 17:33:02.061015+05:30	2026-05-15 17:33:02.061015+05:30	Sample40	No. 40, School Road, Colombo	Female
e25d2a9a-fdba-4864-bb94-013daa7e5de0	Kamal Perera	Kamal Perera	766218578	user@	1101	t	2026-05-15 18:39:11.114256+05:30	2026-05-15 18:39:11.114256+05:30	Sample1	No. 1, School Road, Colombo	Female
1534d25e-7fac-483a-9c8b-bccacdf111f0	Nimal Silva	Nimal Silva	766218578	gmail.com	1102	t	2026-05-15 18:39:11.394608+05:30	2026-05-15 18:39:11.394608+05:30	Sample2	No. 2, School Road, Colombo	Male
d1edde10-3f65-4719-bcd3-78559468e971	Sunil Fernando	Sunil Fernando	766218578	abc#mail.com	1103	t	2026-05-15 18:39:11.451444+05:30	2026-05-15 18:39:11.451444+05:30	Sample3	No. 3, School Road, Colombo	Male
4404f2f5-fca3-4c5e-be18-57cdc1fefffe	Kasun Jayasinghe	Kasun Jayasinghe	766218578	studentmail	1104	t	2026-05-15 18:39:11.492092+05:30	2026-05-15 18:39:11.492092+05:30	Sample4	No. 4, School Road, Colombo	Female
83db7a74-a6fa-488b-bd32-cd5af189bbd8	Dinesh Bandara	Dinesh Bandara	766218578	name@com	1105	t	2026-05-15 18:39:11.541231+05:30	2026-05-15 18:39:11.541231+05:30	Sample5	No. 5, School Road, Colombo	Female
7f54343e-a2c5-4acf-acd9-87c519f072c8	Ruwan Kumara	Ruwan Kumara	766218578	@gmail.com	1106	t	2026-05-15 18:39:11.620341+05:30	2026-05-15 18:39:11.620341+05:30	Sample6	No. 6, School Road, Colombo	Male
d730bf85-51ee-486b-a05f-b5e9feb19768	Saman Gunawardena	Saman Gunawardena	766218578	wrong.email	1107	t	2026-05-15 18:39:11.690777+05:30	2026-05-15 18:39:11.690777+05:30	Sample7	No. 7, School Road, Colombo	Female
cdd0fae5-dbda-4df3-a312-61c7e6974419	Chathura Rajapaksha	Chathura Rajapaksha	766218578	invalid@	1108	t	2026-05-15 18:39:11.744237+05:30	2026-05-15 18:39:11.744237+05:30	Sample8	No. 8, School Road, Colombo	Male
b4d82430-3e05-48a3-8f7d-28c94446aa00	Lahiru Ekanayake	Lahiru Ekanayake	766218578	test@.com	1109	t	2026-05-15 18:39:11.79875+05:30	2026-05-15 18:39:11.79875+05:30	Sample9	No. 9, School Road, Colombo	Male
3960abbd-b2fc-4ecc-ba9f-965b756be518	Tharindu Wijesinghe	Tharindu Wijesinghe	766218578	123@123	1110	t	2026-05-15 18:39:11.86321+05:30	2026-05-15 18:39:11.86321+05:30	Sample10	No. 10, School Road, Colombo	Female
71d4ec30-abdb-4dff-a672-47b47604f20e	Ishara Dias	Ishara Dias	766218578	mail..test@gmail.com	1111	t	2026-05-15 18:39:11.912594+05:30	2026-05-15 18:39:11.912594+05:30	Sample11	No. 11, School Road, Colombo	Male
a6a60d97-3011-49c5-ae68-a11ade339992	Dilshan Karunaratne	Dilshan Karunaratne	766218578	student@@gmail.com	1112	t	2026-05-15 18:39:11.946999+05:30	2026-05-15 18:39:11.946999+05:30	Sample12	No. 12, School Road, Colombo	Female
1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	Prabath Senanayake	Prabath Senanayake	766218578	hello.gmail.com	1113	t	2026-05-15 18:39:11.984268+05:30	2026-05-15 18:39:11.984268+05:30	Sample13	No. 13, School Road, Colombo	Male
75e7cc1e-02df-46c8-8235-7e0d43a4f520	Gayan Madushanka	Gayan Madushanka	766218578	bademail@domain	1114	t	2026-05-15 18:39:12.034266+05:30	2026-05-15 18:39:12.034266+05:30	Sample14	No. 14, School Road, Colombo	Female
1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	Shehan Peiris	Shehan Peiris	766218578	fake@domain,com	1115	t	2026-05-15 18:39:12.073733+05:30	2026-05-15 18:39:12.073733+05:30	Sample15	No. 15, School Road, Colombo	Female
9029eb7c-ace9-41e8-a889-d92468fe16cd	Nadeesha Abeysekara	Nadeesha Abeysekara	766218578	noatsymbol.com	1116	t	2026-05-15 18:39:12.123705+05:30	2026-05-15 18:39:12.123705+05:30	Sample16	No. 16, School Road, Colombo	Female
0fb7abc4-8ac0-40d8-a13e-0a93516e208c	Rashmi Rathnayake	Rashmi Rathnayake	766218578	space @gmail.com	1117	t	2026-05-15 18:39:12.171009+05:30	2026-05-15 18:39:12.171009+05:30	Sample17	No. 17, School Road, Colombo	Female
4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	Sachini Hettiarachchi	Sachini Hettiarachchi	766218578	user@domain.	1118	t	2026-05-15 18:39:12.217038+05:30	2026-05-15 18:39:12.217038+05:30	Sample18	No. 18, School Road, Colombo	Female
3431c363-c8e1-4e66-9d56-b5eb0cda9723	Thilini Pathirana	Thilini Pathirana	766218578	invalid_email	1119	t	2026-05-15 18:39:12.272282+05:30	2026-05-15 18:39:12.272282+05:30	Sample19	No. 19, School Road, Colombo	Male
bb813af3-4184-4512-bb63-32fba48db8a0	Madushi De Mel	Madushi De Mel	766218578	test#gmail.com	1120	t	2026-05-15 18:39:12.322243+05:30	2026-05-15 18:39:12.322243+05:30	Sample20	No. 20, School Road, Colombo	Female
b47af724-c5f2-4b30-b5c1-9add8ca43645	Heshani	Amila	0766218578	\N	1063	t	2026-05-13 16:41:40.955401+05:30	2026-05-20 17:03:55.814389+05:30	viharagala	6th lane	female
9a02ca9b-0234-4504-8ab5-2d4362f4d651	Nadun Lakshitha	Suren	0766218578	pubudulakshan72@gmail.com	1300	t	2026-05-20 17:29:59.990285+05:30	2026-05-20 17:29:59.990285+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	male
286385dc-7884-42da-992f-6891fd1bccb5	Achini	Athula	0766218578	pubudulakshan72@gmail.com	2000	t	2026-05-20 17:33:11.361647+05:30	2026-05-20 17:33:11.361647+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	female
9e271530-fd95-4be5-819d-a534e09a83c3	Chamara	sunamapama	0766218578	pubudulakshan72@gmail.com	2001	t	2026-05-20 17:34:39.085556+05:30	2026-05-20 17:34:39.085556+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	male
7b6562b8-be72-4df1-a0b9-702c9ceec431	Ramith Silva	Amila Silva	0766218578	pubudulakshan72@gmail.com	3000	t	2026-05-26 19:57:51.916357+05:30	2026-05-26 19:57:51.916357+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	male
f6a128a7-8725-4952-bd78-cf852e1846a8	Shalini Perera	Roshan Perera	0766218578	pubudulakshan72@gmail.com	3001	t	2026-05-26 19:59:06.791671+05:30	2026-05-26 19:59:06.791671+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	female
75e04ba7-e9bc-42ac-a9db-2f4e2715503b	Sahan Perera	Amarasena	766218578	\N	3002	t	2026-05-28 19:52:00.615254+05:30	2026-05-28 19:52:00.615254+05:30	Ella	near lake	male
869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	Thisun Perera	Amarasena	766218578	\N	3003	t	2026-05-28 19:53:25.260119+05:30	2026-05-28 19:53:25.260119+05:30	Ella	near lake	male
5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	Mithuni Perera	Athula Perara	0766218578	pubudulakshan72@gmail.com	3005	t	2026-05-28 19:55:26.50703+05:30	2026-05-28 19:55:26.50703+05:30	Hambantota	Near the Lake, School Road, Suriyawewa	female
eb48778c-f7c9-4361-be6f-8d9a2eccab19	Dasuni almeda	Amarasena	766218578	\N	3004	t	2026-05-28 20:05:15.473478+05:30	2026-05-28 20:05:15.473478+05:30	Ella	near lake	female
1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	Adeesha Siriwardana	Samantha Siriwardana	0766218578	pubudulakshan72@gmail.com	1014	t	2026-07-03 10:19:22.580842+05:30	2026-07-03 10:19:22.580842+05:30	Suriyawewa	Near the Lake	male
af93e596-e524-4830-b1e6-78051eb850b6	Maneesha Gimhan	Seetha perra	766218578	pubudulakshan72@gmail.com	6000	t	2026-07-03 10:42:18.262391+05:30	2026-07-03 10:42:18.262391+05:30	Sooriyawewa	Near the lake	male
877deab2-5b88-4573-8fce-c4e52706b7e0	Maheeshi Savindya	Aruna Perara	766218578	pubudulakshan72@gmail.com	6001	t	2026-07-03 10:42:18.366267+05:30	2026-07-03 10:42:18.366267+05:30	Viharagala	Near the lake	female
b24a3354-4780-415a-9934-aebff21f9096	Dimuthu Lakshan	Upananda Jayasinghe	766218578	pubudulakshan72@gmail.com	6002	t	2026-07-03 10:42:18.392372+05:30	2026-07-03 10:42:18.392372+05:30	Sooriyawewa	Near the lake	male
d839e6c4-853f-43f2-87ef-ed49a6715999	Nimal Perera	Sunil Perera	766218578	pubudulakshan72@gmail.com	2100	t	2026-07-07 09:39:18.47058+05:30	2026-07-07 09:39:18.47058+05:30	Colombo	No. 73, Temple Road	Male
5e245f6a-ad3a-4202-860e-60f2c0ba5c55	Kamal Silva	Somapala Silva	766218578	pubudulakshan72@gmail.com	2101	t	2026-07-07 09:39:18.632134+05:30	2026-07-07 09:39:18.632134+05:30	Negombo	No. 11, Station Road	Male
5fee4389-662f-4e8f-bc8c-54f0acc25920	Saman Kumara	Ajith Fernando	766218578	pubudulakshan72@gmail.com	2102	t	2026-07-07 09:39:18.657837+05:30	2026-07-07 09:39:18.657837+05:30	Galle	No. 233, Lake Road	Male
e4567f9f-d50e-4598-8e38-473c09467f6b	Kasun Fernando	Rohana Kumara	766218578	pubudulakshan72@gmail.com	2103	t	2026-07-07 09:39:18.687338+05:30	2026-07-07 09:39:18.687338+05:30	Ratnapura	No. 215, Hospital Road	Male
9489fc67-83b4-4c5e-91e4-657967153e6f	Dinesh Jayasinghe	Sujeewa Jayasinghe	766218578	pubudulakshan72@gmail.com	2104	t	2026-07-07 09:39:18.71899+05:30	2026-07-07 09:39:18.71899+05:30	Anuradhapura	No. 19, Temple Road	Male
2c87c9a7-19a5-4f4f-92a3-e8d9d43e9088	Ruwan Wijesinghe	Anura Bandara	766218578	pubudulakshan72@gmail.com	2105	t	2026-07-07 09:39:18.749234+05:30	2026-07-07 09:39:18.749234+05:30	Kandy	No. 215, Main Street	Male
acef1596-f9e7-46db-afff-ee5584022f4d	Tharindu Senanayake	Chandrika Perera	766218578	pubudulakshan72@gmail.com	2106	t	2026-07-07 09:39:18.778486+05:30	2026-07-07 09:39:18.778486+05:30	Badulla	No. 101, Lake Road	Male
85bfef6f-3286-4710-8317-7b71bee456d2	Lahiru Madushan	Kusum Silva	766218578	pubudulakshan72@gmail.com	2107	t	2026-07-07 09:39:18.802481+05:30	2026-07-07 09:39:18.802481+05:30	Negombo	No. 159, School Road	Male
ff07f896-ce93-4634-9be8-aa5caff17922	Supun Bandara	Mahinda Fernando	766218578	pubudulakshan72@gmail.com	2108	t	2026-07-07 09:39:18.827206+05:30	2026-07-07 09:39:18.827206+05:30	Matara	No. 190, New Town Road	Male
429d8e3a-c245-4b8c-b3b4-53ca3eb305cf	Chathura Gunasekara	Indrani Kumari	766218578	pubudulakshan72@gmail.com	2109	t	2026-07-07 09:39:18.852922+05:30	2026-07-07 09:39:18.852922+05:30	Hambantota	No. 124, New Town Road	Male
6c59b04c-50e9-4c78-9802-55e11789511f	Gayan Lakmal	Sunil Perera	766218578	pubudulakshan72@gmail.com	2110	t	2026-07-07 09:39:18.878392+05:30	2026-07-07 09:39:18.878392+05:30	Hambantota	No. 203, Main Street	Male
d875c077-b63e-4ed4-ae80-2e489074f7b7	Ashan Dilshan	Somapala Silva	766218578	pubudulakshan72@gmail.com	2111	t	2026-07-07 09:39:18.903105+05:30	2026-07-07 09:39:18.903105+05:30	Matara	No. 202, School Road	Male
b7cc526c-3425-4e94-b8eb-15b08e77ed8e	Pradeep Ranasinghe	Ajith Fernando	766218578	pubudulakshan72@gmail.com	2112	t	2026-07-07 09:39:18.926573+05:30	2026-07-07 09:39:18.926573+05:30	Kandy	No. 99, Church Road	Male
01d86598-3dc3-4b11-974a-d229fb4b6af5	Isuru Sampath	Rohana Kumara	766218578	pubudulakshan72@gmail.com	2113	t	2026-07-07 09:39:18.952716+05:30	2026-07-07 09:39:18.952716+05:30	Negombo	No. 28, Lake Road	Male
33bc9e2a-3c77-4b1d-8d0b-80bcc781473f	Nuwan Chathuranga	Sujeewa Jayasinghe	766218578	pubudulakshan72@gmail.com	2114	t	2026-07-07 09:39:18.974062+05:30	2026-07-07 09:39:18.974062+05:30	Galle	No. 124, Main Street	Male
b28be76a-b92a-4165-a570-502cfd236b57	Amal Peris	Anura Bandara	766218578	pubudulakshan72@gmail.com	2115	t	2026-07-07 09:39:18.994785+05:30	2026-07-07 09:39:18.994785+05:30	Hambantota	No. 149, New Town Road	Male
39b4f62a-e087-4eef-946d-f40dddde350d	Sachintha Niroshan	Chandrika Perera	766218578	pubudulakshan72@gmail.com	2116	t	2026-07-07 09:39:19.016316+05:30	2026-07-07 09:39:19.016316+05:30	Negombo	No. 24, New Town Road	Male
76fa6ddc-f8a9-4159-a844-1a717ed3bc29	Janith Ekanayake	Kusum Silva	766218578	pubudulakshan72@gmail.com	2117	t	2026-07-07 09:39:19.039959+05:30	2026-07-07 09:39:19.039959+05:30	Negombo	No. 242, Main Street	Male
3465cf1c-6a60-48a9-8409-5deaea64d19f	Ravindu Karunaratne	Mahinda Fernando	766218578	pubudulakshan72@gmail.com	2118	t	2026-07-07 09:39:19.071605+05:30	2026-07-07 09:39:19.071605+05:30	Matara	No. 34, Market Road	Male
ee855393-dc17-44e8-9851-76fe172f2c53	Shehan De Silva	Indrani Kumari	766218578	pubudulakshan72@gmail.com	2119	t	2026-07-07 09:39:19.092709+05:30	2026-07-07 09:39:19.092709+05:30	Badulla	No. 228, River View Road	Male
cd1aba91-6b5c-444c-b8a4-a113dbbed3fe	Anjali Perera	Sunil Perera	766218578	pubudulakshan72@gmail.com	2120	t	2026-07-07 09:39:19.118236+05:30	2026-07-07 09:39:19.118236+05:30	Hambantota	No. 248, Main Street	Female
69ddd74f-769e-4225-bf84-6fe36504a018	Dinushi Silva	Somapala Silva	766218578	pubudulakshan72@gmail.com	2121	t	2026-07-07 09:39:19.145157+05:30	2026-07-07 09:39:19.145157+05:30	Anuradhapura	No. 139, Temple Road	Female
17921d74-7486-4d11-98d9-448be5f04af4	Kavindi Fernando	Ajith Fernando	766218578	pubudulakshan72@gmail.com	2122	t	2026-07-07 09:39:19.167602+05:30	2026-07-07 09:39:19.167602+05:30	Kandy	No. 165, Hospital Road	Female
2d58f4c5-44f0-4af8-872f-71f7bec32f12	Nethmi Jayawardena	Rohana Kumara	766218578	pubudulakshan72@gmail.com	2123	t	2026-07-07 09:39:19.199448+05:30	2026-07-07 09:39:19.199448+05:30	Negombo	No. 174, Lake Road	Female
821ebc49-8c56-4662-b5fe-dc7da1623cf5	Piumi Senaratne	Sujeewa Jayasinghe	766218578	pubudulakshan72@gmail.com	2124	t	2026-07-07 09:39:19.245951+05:30	2026-07-07 09:39:19.245951+05:30	Badulla	No. 154, Hospital Road	Female
f79df6f8-c599-4767-803a-3fa522f7e538	Hashini Bandara	Anura Bandara	766218578	pubudulakshan72@gmail.com	2125	t	2026-07-07 09:39:19.277793+05:30	2026-07-07 09:39:19.277793+05:30	Negombo	No. 88, Lake Road	Female
b29b84ed-5055-464e-b02d-75f7984db2cd	Umeshi Perera	Chandrika Perera	766218578	pubudulakshan72@gmail.com	2126	t	2026-07-07 09:39:19.302372+05:30	2026-07-07 09:39:19.302372+05:30	Negombo	No. 179, Church Road	Female
a1438d43-6950-4284-882e-a2f24f725c22	Dilki Madushani	Kusum Silva	766218578	pubudulakshan72@gmail.com	2127	t	2026-07-07 09:39:19.325959+05:30	2026-07-07 09:39:19.325959+05:30	Kandy	No. 78, Temple Road	Female
dbd310a9-cbd9-4e39-916f-280d88424395	Sachini Kumari	Mahinda Fernando	766218578	pubudulakshan72@gmail.com	2128	t	2026-07-07 09:39:19.351301+05:30	2026-07-07 09:39:19.351301+05:30	Hambantota	No. 43, Temple Road	Female
7f72d70c-f822-4258-9c60-c49c3b518bb7	Tharushi Sewwandi	Indrani Kumari	766218578	pubudulakshan72@gmail.com	2129	t	2026-07-07 09:39:19.375995+05:30	2026-07-07 09:39:19.375995+05:30	Colombo	No. 166, Market Road	Female
dcd84cc3-984a-42fe-881b-884251662e6a	Yasasmi Fernando	Sunil Perera	766218578	pubudulakshan72@gmail.com	2130	t	2026-07-07 09:39:19.398956+05:30	2026-07-07 09:39:19.398956+05:30	Anuradhapura	No. 188, Station Road	Female
eb4c6c0c-38cb-4f69-9b69-e5bac33afad6	Imesha Lakmali	Somapala Silva	766218578	pubudulakshan72@gmail.com	2131	t	2026-07-07 09:39:19.423348+05:30	2026-07-07 09:39:19.423348+05:30	Badulla	No. 167, Station Road	Female
3e57df1b-6a5d-42c4-bf05-43232953ca09	Sanduni Wijeratne	Ajith Fernando	766218578	pubudulakshan72@gmail.com	2132	t	2026-07-07 09:39:19.449447+05:30	2026-07-07 09:39:19.449447+05:30	Anuradhapura	No. 109, Hospital Road	Female
43b82bf1-7e23-4c2c-aaca-321b74de92c4	Ayesha Nisansala	Rohana Kumara	766218578	pubudulakshan72@gmail.com	2133	t	2026-07-07 09:39:19.475571+05:30	2026-07-07 09:39:19.475571+05:30	Hambantota	No. 114, Temple Road	Female
8d944d69-764c-4af6-837b-e10e1b2fd533	Maleesha Dilrukshi	Sujeewa Jayasinghe	766218578	pubudulakshan72@gmail.com	2134	t	2026-07-07 09:39:19.494364+05:30	2026-07-07 09:39:19.494364+05:30	Badulla	No. 244, Hospital Road	Female
22237097-4cab-4b29-8000-d6fc35341589	Hiruni Perera	Anura Bandara	766218578	pubudulakshan72@gmail.com	2135	t	2026-07-07 09:39:19.517399+05:30	2026-07-07 09:39:19.517399+05:30	Matara	No. 90, School Road	Female
d19da57c-0fe2-4445-9ee1-3666e15dc012	Shashika Hansani	Chandrika Perera	766218578	pubudulakshan72@gmail.com	2136	t	2026-07-07 09:39:19.540721+05:30	2026-07-07 09:39:19.540721+05:30	Kurunegala	No. 191, Station Road	Female
dc4c4fcf-cd11-4824-a5fc-b33a2b440563	Nadeesha Madushika	Kusum Silva	766218578	pubudulakshan72@gmail.com	2137	t	2026-07-07 09:39:19.565874+05:30	2026-07-07 09:39:19.565874+05:30	Kurunegala	No. 117, River View Road	Female
fd83d560-17d1-4063-89e4-b0e56bf19b39	Chamodi Kaushalya	Mahinda Fernando	766218578	pubudulakshan72@gmail.com	2138	t	2026-07-07 09:39:19.601268+05:30	2026-07-07 09:39:19.601268+05:30	Kurunegala	No. 106, Church Road	Female
6c37736f-b10a-4262-8ae3-9dd9087e5099	Sewmini Jayasuriya	Indrani Kumari	766218578	pubudulakshan72@gmail.com	2139	t	2026-07-07 09:39:19.627775+05:30	2026-07-07 09:39:19.627775+05:30	Colombo	No. 113, Hospital Road	Female
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (id, code, name, subject_group, is_active, created_at, updated_at) FROM stdin;
98393ed5-d184-419e-ae6f-96ecbe10be87	COM_CATHOLIC	Catholic	compulsory	t	2026-05-06 22:42:19.126842+05:30	2026-05-06 22:42:19.126842+05:30
9eff45a6-f102-4628-940e-c3d71a8291d7	COM_ENGLISH_AS_SECONDARY_LANGUAGE	English (as secondary language)	compulsory	t	2026-05-13 13:02:40.539759+05:30	2026-07-09 11:06:22.431975+05:30
a722f572-b3bc-4d01-a865-1d3a33fa464b	COM_SCIENCE	Science	compulsory	t	2026-05-13 13:02:40.552514+05:30	2026-07-09 11:06:22.433181+05:30
254796ab-194d-48fc-b9cb-dca22eab25e9	COM_TAMIL_AS_SECONDARY_LANGUAGE	Tamil (as secondary language)	compulsory	t	2026-05-26 19:57:51.916357+05:30	2026-07-09 12:33:40.985737+05:30
f697e7ea-5112-4891-980e-97e75dbad7b9	ELE_SCIENCE	Science	elective	t	2026-05-10 22:50:43.035769+05:30	2026-05-10 22:50:43.035769+05:30
27f16dd3-f1b7-405a-8a98-961c086a4bb6	COM_MATHEMATICS	Mathematics	compulsory	t	2026-05-06 12:08:50.960514+05:30	2026-07-09 16:31:36.562282+05:30
173b0ae5-79be-4eca-a3e5-b204757e845e	COM_ENVIRONMENT	Environment	compulsory	t	2026-05-06 12:08:50.960514+05:30	2026-07-09 16:31:36.566828+05:30
77d1847c-5bf6-46ba-baa5-8217e4b87db7	COM_LANGUAGE	Language	compulsory	t	2026-05-13 13:02:40.555357+05:30	2026-05-13 13:04:07.362167+05:30
60b6a4ed-349a-44c5-9638-e2feb7fbc1fa	COM_RELIGION	Religion	compulsory	t	2026-05-13 13:02:40.556639+05:30	2026-05-13 13:04:07.364341+05:30
51050e72-c564-416b-880f-89bcb9d65d53	ELE_GEOGRAPHY	Geography	elective	t	2026-05-13 13:02:40.568163+05:30	2026-07-09 11:06:22.450365+05:30
e3b71d41-c839-4ccb-8674-e8af8e908bf3	ELE_TAMIL	Tamil	elective	t	2026-05-13 13:02:40.569926+05:30	2026-07-09 11:06:22.452554+05:30
74da8036-d5f6-4af7-b7eb-575894653b6b	ELE_HUMAN_STUDIES	Human Studies	elective	t	2026-05-13 13:02:40.571462+05:30	2026-07-09 11:06:22.455065+05:30
96555373-ae20-4341-b362-e9e82998e2d5	COM_SINHALA	Sinhala	compulsory	t	2026-05-06 12:08:50.960514+05:30	2026-07-09 16:31:36.567959+05:30
d80ab4f7-5711-40fc-82a9-e17249f9778b	COM_BUDDHISM	Buddhism	compulsory	t	2026-05-06 12:08:50.960514+05:30	2026-07-09 16:31:36.569223+05:30
f0a9d822-71ae-40ff-ba61-45b61e562863	COM_HISTORY	History	compulsory	t	2026-05-13 13:02:40.554115+05:30	2026-07-09 11:06:22.435126+05:30
9df5a7a7-50ee-474c-85e7-d6822fbae030	ELE_ICT	ICT	elective	t	2026-05-13 13:02:40.557801+05:30	2026-07-09 11:06:22.437306+05:30
8b7303c4-9149-4688-88ca-8aa116cd652c	ELE_HEALTH_AND_PHYSICAL_EDUCATION	Health and Physical Education	elective	t	2026-05-13 13:02:40.559149+05:30	2026-07-09 11:06:22.441207+05:30
943b5378-a3cc-4c57-9e7f-5db54cb10cb3	ELE_ACCOUNTING	Accounting	elective	t	2026-05-13 13:02:40.560385+05:30	2026-07-09 11:06:22.443473+05:30
fe19b797-2517-413a-a66c-30c8a9371d0f	ELE_MUSIC	Music	elective	t	2026-05-13 13:02:40.562084+05:30	2026-07-09 11:06:22.445328+05:30
5d46a339-5b39-4742-908a-228e3067e7ff	ELE_ARTS	Arts	elective	t	2026-05-13 13:02:40.563753+05:30	2026-07-09 11:06:22.44698+05:30
c7e93f84-d12a-4775-b717-842b494d5ed8	ELE_DANCING	Dancing	elective	t	2026-05-13 13:02:40.566308+05:30	2026-07-09 11:06:22.44728+05:30
\.


--
-- Data for Name: teacher_password_reset_otps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teacher_password_reset_otps (id, teacher_id, otp_code, otp_expires_at, otp_used_at, created_at, updated_at) FROM stdin;
9d4b37da-fc31-443b-bc6e-643b1d50d1fc	20f1c12e-1a3f-4d38-9a95-6bda2728c3e3	591687	2026-07-08 10:18:33.838+05:30	\N	2026-07-08 10:08:58.46546+05:30	2026-07-08 10:13:33.843169+05:30
\.


--
-- Data for Name: term_class_marks_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.term_class_marks_reviews (id, class_id, term, academic_year, review_status, admin_notified_at, admin_notification_error, approved_by, approved_at, parent_sms_status, parent_sms_sent_at, parent_sms_error, created_at, updated_at) FROM stdin;
5f6b9cd4-704c-41c6-9894-299cf367ef20	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	notified	2026-05-26 17:55:43.209078+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 17:55:39.011648+05:30	2026-05-26 17:55:43.209078+05:30
90e7b245-92f3-4ecc-8714-08f72cd6bf6e	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	pending	\N	\N	\N	\N	pending	\N	\N	2026-05-26 17:55:43.225551+05:30	2026-05-26 17:55:43.225551+05:30
ba9f9600-94e0-48a8-af8a-b1740348de35	64560975-90d7-409d-a04d-c3164438a794	1	2026	approved	2026-05-26 17:55:38.994123+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-05-26 18:24:28.445157+05:30	failed	\N	Failed for 6 student(s).	2026-05-26 17:55:34.630181+05:30	2026-05-26 18:24:28.452058+05:30
fd261502-20e8-4dc2-8c61-7857d79970ae	64560975-90d7-409d-a04d-c3164438a794	2	2026	approved	2026-05-26 17:55:50.954733+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-05-26 18:28:54.18339+05:30	sent	2026-05-26 18:29:03.832661+05:30	\N	2026-05-26 17:55:46.587076+05:30	2026-05-26 18:29:03.832661+05:30
620eaf95-51c5-4b86-9e0b-42de99bf629e	64560975-90d7-409d-a04d-c3164438a794	3	2026	approved	2026-05-26 17:54:37.682032+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-05-26 18:35:42.962818+05:30	sent	2026-05-26 18:35:53.194315+05:30	\N	2026-05-26 17:54:33.311581+05:30	2026-05-26 18:35:53.194315+05:30
e8a42aca-24e1-452f-bb95-b82c2a8a9188	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	approved	2026-05-26 20:01:27.38964+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-05-26 23:46:25.593544+05:30	sent	2026-05-26 23:46:28.893722+05:30	\N	2026-05-26 20:01:21.433358+05:30	2026-05-26 23:46:28.893722+05:30
76626a41-be0f-4c95-9418-8c479727fe63	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	approved	2026-06-30 09:49:43.600989+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-06-30 09:57:34.788606+05:30	sent	2026-06-30 09:57:51.475578+05:30	\N	2026-06-30 09:49:39.210228+05:30	2026-06-30 09:57:51.475578+05:30
5bc24198-92db-490f-8aa5-3392423aa533	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	approved	2026-05-30 21:22:24.480446+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-06-30 21:29:28.024027+05:30	sent	2026-06-30 21:29:40.470066+05:30	\N	2026-05-30 21:22:19.02749+05:30	2026-06-30 21:29:40.470066+05:30
1572dd87-6d2d-4723-bb3c-910b6e841a4e	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	approved	2026-05-30 15:11:22.263557+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-06-30 22:05:41.80054+05:30	sent	2026-06-30 22:05:56.390694+05:30	\N	2026-05-30 15:11:16.049768+05:30	2026-06-30 22:05:56.390694+05:30
6f3203b8-577c-4688-927c-974960aabd9f	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	approved	2026-07-07 08:59:09.006665+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-07-07 08:59:26.916532+05:30	sent	2026-07-07 08:59:50.188367+05:30	\N	2026-07-07 08:59:03.798517+05:30	2026-07-07 08:59:50.188367+05:30
761d74dc-97b8-4d48-b2f4-addf6658bfb9	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	approved	2026-07-06 21:20:03.861383+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-07-08 10:27:25.391111+05:30	sent	2026-07-08 10:27:48.442514+05:30	\N	2026-07-06 21:19:58.459039+05:30	2026-07-08 10:27:48.442514+05:30
56b90078-694e-49d6-adbf-cdac879a55e2	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	approved	2026-07-08 10:27:10.35482+05:30	\N	15804699-c7ec-4c08-81f3-fdbf0f33bcbe	2026-07-08 10:27:38.965695+05:30	sent	2026-07-08 10:28:01.561248+05:30	\N	2026-07-08 10:27:04.770285+05:30	2026-07-08 10:28:01.561248+05:30
\.


--
-- Data for Name: term_marks_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.term_marks_reviews (id, student_id, class_id, term, academic_year, review_status, admin_notified_at, admin_notification_error, approved_by, approved_at, parent_sms_status, parent_sms_sent_at, parent_sms_error, created_at, updated_at) FROM stdin;
be658d01-b390-491f-9361-a7b1e4738fb0	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	notified	2026-05-26 14:44:30.918065+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:26.396869+05:30	2026-05-26 14:44:30.918065+05:30
0e944b12-1170-422b-b96b-e094ad847c2f	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	notified	2026-05-26 14:44:35.207697+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:30.942258+05:30	2026-05-26 14:44:35.207697+05:30
676be4ce-a0d5-4af6-b138-ea261af37169	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	notified	2026-05-26 14:44:36.770063+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:32.322595+05:30	2026-05-26 14:44:36.770063+05:30
59727dce-caa8-4d63-8173-8138fb10fed4	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	notified	2026-05-26 14:44:41.115283+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:36.787325+05:30	2026-05-26 14:44:41.115283+05:30
376ac233-b247-4b57-8555-c5c44af016b7	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	notified	2026-05-26 14:44:45.432178+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:41.122887+05:30	2026-05-26 14:44:45.432178+05:30
a407914d-0c4d-4111-a555-571be66c2906	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	notified	2026-05-26 14:44:50.265899+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:45.439525+05:30	2026-05-26 14:44:50.265899+05:30
3041a65b-9bf3-4734-83c4-e1953d3955e1	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	notified	2026-05-26 14:44:54.567385+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:50.29533+05:30	2026-05-26 14:44:54.567385+05:30
c39f62af-7281-4d3b-90f0-0391025e9a20	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	notified	2026-05-26 14:44:59.105004+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:54.575748+05:30	2026-05-26 14:44:59.105004+05:30
238e4b8a-e285-4840-bf6c-33decd396c0f	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	notified	2026-05-26 14:45:03.565932+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:44:59.113019+05:30	2026-05-26 14:45:03.565932+05:30
e9de8a78-79fe-485a-901c-14e12c2ef85d	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	pending	\N	\N	\N	\N	pending	\N	\N	2026-05-26 14:45:03.57244+05:30	2026-05-26 14:45:03.57244+05:30
903adca4-a887-49d8-8ce1-181d2c6de659	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	notified	2026-05-26 14:45:11.270461+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:45:06.81095+05:30	2026-05-26 14:45:11.270461+05:30
ec122c6d-3d6d-483c-8169-ea78526f2118	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	notified	2026-05-26 14:45:13.829725+05:30	\N	\N	\N	pending	\N	\N	2026-05-26 14:45:09.410439+05:30	2026-05-26 14:45:13.829725+05:30
\.


--
-- Data for Name: term_tests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.term_tests (id, student_id, class_id, term, academic_year, subject_id, mark, exam_date, created_at, updated_at) FROM stdin;
678f5abb-0d11-43c5-a380-1450ebda84af	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	70.00	2026-05-25	2026-05-25 14:16:33.122316+05:30	2026-05-25 14:16:33.122316+05:30
d8059725-c8b4-4b7b-82e0-aa934ff08229	adbe2730-fe44-44ac-bee9-f8888cf50569	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	84.00	2026-05-07	2026-05-07 12:52:22.607605+05:30	2026-05-07 12:52:22.607605+05:30
a7d6e38e-8fbd-4ef0-b4fc-631e9c188333	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	80.00	2026-05-15	2026-05-15 11:46:58.865558+05:30	2026-05-15 11:46:58.865558+05:30
ac4a09ff-57d5-4574-85ad-767daae5e589	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	98.00	2026-05-15	2026-05-15 11:46:58.874076+05:30	2026-05-15 11:46:58.874076+05:30
b147cf3a-1f93-41fd-9018-b6c049afab30	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	75.00	2026-05-15	2026-05-15 11:46:58.875948+05:30	2026-05-15 11:46:58.875948+05:30
ffdc6db2-c18c-4e58-ab05-5047523df75d	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	76.00	2026-05-15	2026-05-15 11:46:58.877781+05:30	2026-05-15 11:46:58.877781+05:30
adee42f4-77e2-4126-b7bc-5492f42b5b10	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	87.00	2026-05-15	2026-05-15 11:46:58.881085+05:30	2026-05-15 11:46:58.881085+05:30
2dc03d2d-45dd-45a6-acf3-37d09ef21244	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	68.00	2026-05-15	2026-05-15 11:46:58.883176+05:30	2026-05-15 11:46:58.883176+05:30
af086110-54d5-4959-bb51-24bd95929d55	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	89.00	2026-05-15	2026-05-15 15:59:08.12107+05:30	2026-05-15 15:59:08.12107+05:30
a4c37eb7-b416-4dcd-bc22-44a991885fdc	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	67.00	2026-05-15	2026-05-15 15:59:08.12107+05:30	2026-05-15 15:59:08.12107+05:30
46f9b117-cb7a-4241-9c4c-f0bff701e7f0	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	67.00	2026-05-15	2026-05-15 15:59:08.12107+05:30	2026-05-15 15:59:08.12107+05:30
cea487d8-39ad-4025-be16-f4e024950426	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	77.00	2026-05-15	2026-05-15 15:59:08.12107+05:30	2026-05-15 15:59:08.12107+05:30
28442791-cc2a-4b28-b6a6-e6834c497aec	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	79.00	2026-05-15	2026-05-15 15:59:08.12107+05:30	2026-05-15 15:59:08.12107+05:30
6dd4dd0a-c5a1-44ee-8837-2dfd7f6c7609	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	89.00	2026-05-15	2026-05-15 15:59:08.12107+05:30	2026-05-15 15:59:08.12107+05:30
51e344ad-47a8-4a4a-b86f-05760350a385	742d2ddc-aa8a-4090-aebd-4af2df9821f5	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	82.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
2c42240c-3302-4bec-ae57-eaf214ba5b70	7ad6633e-67bd-429c-8440-f0d9ffb52c79	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	62.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
6186097f-6f67-45ca-adaa-0abdea409f85	5d8ebc82-90ba-4dc6-b49c-a8c16895b52a	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	36.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
bd138ec2-7ea9-4114-9cb4-8fd84c0ec5b0	4537a978-3748-49c4-bef2-8e95a922e0df	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	85.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
56a45085-cbaa-41a4-9fa4-5f4402874ca3	cdd0fae5-dbda-4df3-a312-61c7e6974419	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	81.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
b43f6791-fafe-4a75-91fa-ad3e0c496c06	b2540f04-3218-465c-9c23-c61dc3c7b1fb	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	18.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
dee31e7e-bd23-4cd5-b833-05fe65c569d0	a6a60d97-3011-49c5-ae68-a11ade339992	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	79.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
6f07e630-193a-4d5f-82a3-8071075f7bb9	83db7a74-a6fa-488b-bd32-cd5af189bbd8	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	44.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
31311a56-b399-42aa-a1e6-cc86f6ab7499	75e7cc1e-02df-46c8-8235-7e0d43a4f520	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	38.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
345c1d03-55a8-4a7b-986e-f46fc04986e3	60a28492-4654-4cbb-98fc-b1c49ca1303c	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	54.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
73112eec-e57a-4a95-8d6e-d0d24ee36dea	0351f9a0-303c-4504-8941-ee3e1a1c592f	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	67.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
722838db-b1f5-4ace-b457-f4b574f924f2	71d4ec30-abdb-4dff-a672-47b47604f20e	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
344da2e4-3354-41b1-93d6-806f8959133d	e25d2a9a-fdba-4864-bb94-013daa7e5de0	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	67.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
8ac10e72-873a-440f-bfa3-a9260b1da66f	4404f2f5-fca3-4c5e-be18-57cdc1fefffe	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
d78d506c-7721-448c-b069-19c50b7132f5	aa18c05c-e280-453c-a87f-a368f8ad7de9	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	65.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
3363c6ca-8887-4e3e-945d-a2ac87e658d7	b4d82430-3e05-48a3-8f7d-28c94446aa00	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	37.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
a00f1197-3dd2-40ad-946a-adbc61044b71	eaab18ed-b9ca-44fc-ab04-625ceb76d3f5	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	71.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
814e25ee-6f03-4a08-b3f6-7ec1b0184934	583eb113-b74f-49f6-a0ba-cfb50dae6699	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	81.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
daa19d63-810a-40b9-a2e0-add0f22a044a	bb813af3-4184-4512-bb63-32fba48db8a0	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	8.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
b4ae395a-f13f-4b9c-8cb8-7b0d3a299eb1	9029eb7c-ace9-41e8-a889-d92468fe16cd	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	64.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
d9aef21b-4982-42fa-b894-f2babe4b4f86	ea289faa-0c02-495a-923c-049ff2c481a6	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	61.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
89a9b207-8021-48fa-93e7-8d0d9b508e34	1534d25e-7fac-483a-9c8b-bccacdf111f0	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	19.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
59a12c38-f2f9-442b-b23d-f1fc660545e8	8251e1df-58ea-4d12-b02e-3062e78df907	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	13.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
91eecf68-27bc-457c-b26f-8863afc09a52	ea3a30af-37a6-43e5-ade7-a7323f267787	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	70.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
6d671bf7-79d2-4208-a300-c96901a318c7	e8decff2-9160-4569-ac1d-711423e514a9	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	63.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
92c2a401-90a6-4f1c-bb91-baf6ddf52c35	1bf0926f-8ba8-4cce-a5b9-ceec4bb1361d	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	5.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
5d48d907-0654-4a7e-8043-7e9b5e0df643	0fb7abc4-8ac0-40d8-a13e-0a93516e208c	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	60.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
a3fd9a08-1ac2-40dc-b53a-fb04d12a39ea	7f54343e-a2c5-4acf-acd9-87c519f072c8	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	6.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
c0f74e04-7c7a-4dba-92d0-1ba52fdf2c0c	4b6e9bd1-4615-42c1-90cd-c13e4ef0edb0	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	7.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
4fd459c2-0ce9-45c5-8330-6935ea6b4347	845cf7b4-50ec-45ae-bfd9-6d669c02f537	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	4.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
b4716f6d-f16b-4128-aa90-cbc18d109585	d730bf85-51ee-486b-a05f-b5e9feb19768	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	94.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
07da3237-edac-4e9c-a5d0-8352d87fe429	3c288a85-886b-4e7d-a721-7244770314f5	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	100.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
9f1fe06d-30e9-462f-bcf6-a261e2dbda98	1fcf9c00-3243-4eea-ae19-e5e9e0fc0c50	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	66.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
1f5f2f34-cc5e-442d-accf-c029dab1d72b	bd0a9878-cf3f-40e8-889f-c0f4ec694135	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	11.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
c4ffcddf-5e5d-4b88-a397-609c5fb9cb5c	d1edde10-3f65-4719-bcd3-78559468e971	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	22.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
a3744e20-cf17-4a70-8fbf-2cac0bb48f92	3960abbd-b2fc-4ecc-ba9f-965b756be518	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	66.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
173a9ce0-1869-4924-bc3b-c09b884f89e1	74fe90b4-501f-4458-be0b-bcc42f08df21	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	35.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
6926dcd3-e34d-4c80-8174-bd7f3bd544fc	3431c363-c8e1-4e66-9d56-b5eb0cda9723	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	93.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
aba2f52f-6f3e-4f3a-a8b1-f1ba59779193	bf0a7707-1978-4a11-a011-4de82a53161f	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	1.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
74759ba3-ec58-4499-8f4e-ca11678b6091	4effd2d5-edf7-408f-8dc9-53705a2e2255	e2b6c9f0-f4ff-49cd-8027-7d82731662fe	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	31.00	2026-05-15	2026-05-15 18:45:43.907969+05:30	2026-05-15 18:45:43.907969+05:30
fa4a4ff9-9e4a-496c-aff7-430b35c58561	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	60.00	2026-05-25	2026-05-25 14:16:33.147087+05:30	2026-05-25 14:16:33.147087+05:30
8aef2db4-0670-4ce5-9c12-2049e38d95c4	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	80.00	2026-05-25	2026-05-25 14:16:33.150964+05:30	2026-05-25 14:16:33.150964+05:30
6a755d7d-b4f5-460c-bf2c-3a92febd6e33	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	96.00	2026-05-25	2026-05-25 14:16:33.157151+05:30	2026-05-25 14:16:33.157151+05:30
23dbc31b-4834-40ed-81c1-194b26ba8c97	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	67.00	2026-05-25	2026-05-25 14:16:33.161381+05:30	2026-05-25 14:16:33.161381+05:30
07a2fb21-d935-40ab-9f79-3fbeb643f65a	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	98.00	2026-05-25	2026-05-25 14:16:33.165154+05:30	2026-05-25 14:16:33.165154+05:30
cdafd7be-2e9a-4829-878b-464b87181e27	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	80.00	2026-05-25	2026-05-25 14:21:49.196175+05:30	2026-05-25 14:21:49.196175+05:30
eaa6784a-7373-4ae7-ac25-18f87df2ac49	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	80.00	2026-05-25	2026-05-25 14:21:49.208953+05:30	2026-05-25 14:21:49.208953+05:30
f08248c3-0920-49fe-a4e3-dedf0659994e	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-09	2026-05-07 12:52:22.607605+05:30	2026-07-09 11:48:39.523552+05:30
507b5191-11f1-414e-9500-6d42f1c9088b	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	78.00	2026-05-25	2026-05-25 14:21:49.212607+05:30	2026-05-25 14:21:49.212607+05:30
f4061556-39c5-4cca-83cf-cc58496c040b	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	67.00	2026-05-25	2026-05-25 14:21:49.217051+05:30	2026-05-25 14:21:49.217051+05:30
30caeda4-f818-4fb8-9a7b-8930b2202995	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	65.00	2026-05-25	2026-05-25 14:21:49.220328+05:30	2026-05-25 14:21:49.220328+05:30
b837a113-d460-4e2c-a668-0b4904795e91	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-25	2026-05-25 14:21:49.223475+05:30	2026-05-25 14:21:49.223475+05:30
456c56d0-e55c-4349-93e5-0be5563ac8e5	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	85.00	2026-05-26	2026-05-26 12:34:00.967974+05:30	2026-05-26 12:34:35.647683+05:30
98346e2e-5d43-4fe8-b7ae-c2e51cf21ea6	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	76.00	2026-05-26	2026-05-26 12:34:00.967974+05:30	2026-05-26 12:34:35.647683+05:30
4158128f-6426-4a6f-bad0-4b68728e3bce	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	78.00	2026-05-26	2026-05-26 12:34:00.967974+05:30	2026-05-26 12:34:35.647683+05:30
51b8d882-fce9-49fd-8aac-a8c616740131	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	74.00	2026-05-26	2026-05-26 12:34:00.967974+05:30	2026-05-26 12:34:35.647683+05:30
3190f86a-4335-4b07-b121-7ffb4db8c441	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	89.00	2026-05-26	2026-05-26 12:34:00.967974+05:30	2026-05-26 12:34:35.647683+05:30
65f3fed6-17eb-4c53-b34b-7d8933e4b161	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	95.00	2026-05-26	2026-05-26 12:34:00.967974+05:30	2026-05-26 12:34:35.647683+05:30
545ca384-722a-48a2-a7df-6e8083798d2a	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	5d46a339-5b39-4742-908a-228e3067e7ff	89.00	2026-05-26	2026-05-26 12:35:53.865283+05:30	2026-05-26 12:35:53.865283+05:30
043149ab-207b-4a2d-9221-434939293cd9	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	78.00	2026-05-26	2026-05-26 12:37:43.150656+05:30	2026-05-26 12:37:43.150656+05:30
b9f9c0fd-5329-4ee9-b62c-eb741e37a76f	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	67.00	2026-05-26	2026-05-26 12:37:43.150656+05:30	2026-05-26 12:37:43.150656+05:30
4c9bfcd2-c9f6-49f9-8fa6-bb0e900cda61	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	90.00	2026-05-26	2026-05-26 12:37:43.150656+05:30	2026-05-26 12:37:43.150656+05:30
f9a5c82e-7ad0-4acf-bbed-f28d975bb1da	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	943b5378-a3cc-4c57-9e7f-5db54cb10cb3	89.00	2026-05-26	2026-05-26 13:08:56.447971+05:30	2026-05-26 13:08:56.447971+05:30
6e87f048-e871-4b00-9fd0-1a8bc37f7311	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	78.00	2026-05-26	2026-05-26 13:09:53.836168+05:30	2026-05-26 13:09:53.836168+05:30
a9c810b5-0999-476e-9c91-e9cb7abe515c	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	86.00	2026-05-26	2026-05-26 13:09:53.836168+05:30	2026-05-26 13:09:53.836168+05:30
4dcb29dd-abc7-4d37-a0bc-ed01b9c4f1f9	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	89.00	2026-05-26	2026-05-26 13:09:53.836168+05:30	2026-05-26 13:09:53.836168+05:30
633e3035-c862-4416-b749-91a09f4fb075	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	92.00	2026-05-26	2026-05-26 13:09:53.836168+05:30	2026-05-26 13:09:53.836168+05:30
ef3d0226-98c6-4302-84d1-61b1a84934ba	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	8b7303c4-9149-4688-88ca-8aa116cd652c	95.00	2026-05-26	2026-05-26 13:10:56.298492+05:30	2026-05-26 13:10:56.298492+05:30
2725deaf-8e73-48a0-8e98-7d27fc9373e3	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	8b7303c4-9149-4688-88ca-8aa116cd652c	85.00	2026-05-26	2026-05-26 13:10:56.298492+05:30	2026-05-26 13:10:56.298492+05:30
bf7eccd4-5a35-4a3a-9c95-c3e0ef3ef210	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	c7e93f84-d12a-4775-b717-842b494d5ed8	89.00	2026-05-26	2026-05-26 13:11:05.071754+05:30	2026-05-26 13:11:05.071754+05:30
63987e7d-6995-4de7-9af0-90bb2af3ab9a	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-05-26	2026-05-26 13:11:26.559082+05:30	2026-05-26 13:11:26.559082+05:30
2f025f2b-831e-4a54-b119-176d30bce2aa	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-05-26	2026-05-26 13:11:26.559082+05:30	2026-05-26 13:11:26.559082+05:30
71d1a3bc-57f9-4f6e-a213-58bd093bb48e	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-05-26	2026-05-26 13:11:26.559082+05:30	2026-05-26 13:11:26.559082+05:30
db23992e-dc94-4993-8163-565596f290aa	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	68.00	2026-05-26	2026-05-26 13:11:26.559082+05:30	2026-05-26 13:11:26.559082+05:30
0d85e632-000e-40db-8142-c3a9a2a32225	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-05-26	2026-05-26 13:11:26.559082+05:30	2026-05-26 13:11:26.559082+05:30
d258e736-7741-4bf5-a8db-d5131f78a710	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	87.00	2026-05-26	2026-05-26 13:11:26.559082+05:30	2026-05-26 13:11:26.559082+05:30
0a2cae6b-aa88-4e47-843f-c4aa5e682013	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	1	2026	51050e72-c564-416b-880f-89bcb9d65d53	78.00	2026-05-26	2026-05-26 13:11:39.455149+05:30	2026-05-26 13:11:39.455149+05:30
cc9b90b8-e0c5-467d-b223-b43f386f3a2b	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	1	2026	51050e72-c564-416b-880f-89bcb9d65d53	89.00	2026-05-26	2026-05-26 13:11:39.455149+05:30	2026-05-26 13:11:39.455149+05:30
67cacab7-55bb-4760-9f69-3820c9686b58	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	1	2026	51050e72-c564-416b-880f-89bcb9d65d53	95.00	2026-05-26	2026-05-26 13:11:39.455149+05:30	2026-05-26 13:11:39.455149+05:30
8476608a-8448-426c-b09f-1fbf669cc362	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	1	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	67.00	2026-05-26	2026-05-26 13:11:48.919202+05:30	2026-05-26 13:11:48.919202+05:30
976b1fef-8b8d-40d5-bdba-ee609cc62a10	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	1	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	76.00	2026-05-26	2026-05-26 13:11:48.919202+05:30	2026-05-26 13:11:48.919202+05:30
4f76ee37-5ac2-4319-9d87-b84d6d5f793d	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	1	2026	74da8036-d5f6-4af7-b7eb-575894653b6b	67.00	2026-05-26	2026-05-26 13:11:56.57181+05:30	2026-05-26 13:11:56.57181+05:30
5874c76e-d4c3-444d-946e-7053e61bc58d	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	5d46a339-5b39-4742-908a-228e3067e7ff	90.00	2026-05-26	2026-05-26 13:40:38.53882+05:30	2026-05-26 13:40:38.53882+05:30
aa3ce4f4-7802-4548-aed8-e42c6ac26005	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	943b5378-a3cc-4c57-9e7f-5db54cb10cb3	89.00	2026-05-26	2026-05-26 13:41:35.262897+05:30	2026-05-26 13:41:35.262897+05:30
d07d0344-b2c7-4192-97ce-20d96c43ca93	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	90.00	2026-05-26	2026-05-26 14:03:44.351605+05:30	2026-05-26 14:03:44.351605+05:30
881b109f-e433-4b6f-b91c-bbf12db3cb4d	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	89.00	2026-05-26	2026-05-26 14:03:44.351605+05:30	2026-05-26 14:03:44.351605+05:30
7d65f76b-4efd-45d7-84b5-d4e9a230bef1	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	67.00	2026-05-26	2026-05-26 14:03:44.351605+05:30	2026-05-26 14:03:44.351605+05:30
bfac5c6b-3b79-475c-a66b-0703e434c506	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	56.00	2026-05-26	2026-05-26 14:03:44.351605+05:30	2026-05-26 14:03:44.351605+05:30
b0be2ff1-065a-4053-bf80-2378b628fe2a	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	c7e93f84-d12a-4775-b717-842b494d5ed8	67.00	2026-05-26	2026-05-26 14:03:52.95326+05:30	2026-05-26 14:03:52.95326+05:30
1e7b3d3f-f0ec-4fc1-a5ff-4f3fff27f9ff	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	67.00	2026-05-26	2026-05-26 14:04:07.376094+05:30	2026-05-26 14:04:07.376094+05:30
bde6446f-146f-4376-8f73-585165e43913	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	67.00	2026-05-26	2026-05-26 14:04:07.376094+05:30	2026-05-26 14:04:07.376094+05:30
9ab7eb6f-b03e-40a1-b517-73c6227396c8	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-05-26	2026-05-26 14:04:07.376094+05:30	2026-05-26 14:04:07.376094+05:30
f0b39bb5-9f1d-495c-b535-49d70fa13215	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-05-26	2026-05-26 14:04:07.376094+05:30	2026-05-26 14:04:07.376094+05:30
30271542-0980-4a70-9263-b8412ded02a2	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	65.00	2026-05-26	2026-05-26 14:04:07.376094+05:30	2026-05-26 14:04:07.376094+05:30
6fa1ac4d-794c-463b-8326-ff721ed96509	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-05-26	2026-05-26 14:04:07.376094+05:30	2026-05-26 14:04:07.376094+05:30
56025b74-2343-4aa7-a51f-94ca4229db17	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	45.00	2026-05-26	2026-05-26 14:04:43.395925+05:30	2026-05-26 14:04:43.395925+05:30
da558671-25c6-4e4f-8e80-6c4a615cecbd	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	56.00	2026-05-26	2026-05-26 14:04:43.395925+05:30	2026-05-26 14:04:43.395925+05:30
a9d485cc-f73e-4737-a56a-40e092122b4f	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	56.00	2026-05-26	2026-05-26 14:04:43.395925+05:30	2026-05-26 14:04:43.395925+05:30
1cb4a7ea-bbf9-4c05-b53f-240013ad70dc	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	78.00	2026-05-26	2026-05-26 14:04:43.395925+05:30	2026-05-26 14:04:43.395925+05:30
f90c62fb-f3cb-44e7-afde-a89f98b727dd	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	67.00	2026-05-26	2026-05-26 14:04:43.395925+05:30	2026-05-26 14:04:43.395925+05:30
93d1b606-ef2d-459d-8002-c45f4690903c	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	68.00	2026-05-26	2026-05-26 14:04:43.395925+05:30	2026-05-26 14:04:43.395925+05:30
8e5f395b-583f-40b7-afd3-d0e44f0bb083	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	77.00	2026-05-26	2026-05-26 14:05:01.365363+05:30	2026-05-26 14:05:01.365363+05:30
ba6fbff0-cde8-4ace-91c3-c74b1c0bdf77	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	67.00	2026-05-26	2026-05-26 14:05:01.365363+05:30	2026-05-26 14:05:01.365363+05:30
c45e4143-8738-410d-9b9b-0cee04d3defe	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	56.00	2026-05-26	2026-05-26 14:05:01.365363+05:30	2026-05-26 14:05:01.365363+05:30
204e542e-7a26-40f9-8ea0-578e35534ce3	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	56.00	2026-05-26	2026-05-26 14:05:01.365363+05:30	2026-05-26 14:05:01.365363+05:30
8f149466-764f-4471-baee-9ad9ebd4cd40	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	34.00	2026-05-26	2026-05-26 14:05:01.365363+05:30	2026-05-26 14:05:01.365363+05:30
5cadadc2-2adc-4ae3-b20a-b43f8aab3553	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	56.00	2026-05-26	2026-05-26 14:05:01.365363+05:30	2026-05-26 14:05:01.365363+05:30
a130e189-fa72-44a0-9f21-9c6c61787cc7	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	67.00	2026-05-26	2026-05-26 14:05:14.484198+05:30	2026-05-26 14:05:14.484198+05:30
f11b3915-c0aa-4f79-968f-65bbbc12415f	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 14:05:14.484198+05:30	2026-05-26 14:05:14.484198+05:30
5470e498-a6b0-4c4e-aff3-7da2d490650c	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 14:05:14.484198+05:30	2026-05-26 14:05:14.484198+05:30
ee73beb3-5e97-4561-b001-1e9295ff6049	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 14:05:14.484198+05:30	2026-05-26 14:05:14.484198+05:30
a8d26b13-c479-42bd-b820-8cfbe0bf71f4	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 14:05:14.484198+05:30	2026-05-26 14:05:14.484198+05:30
ca038288-3d4b-4a29-9468-e9be0309f8ff	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 14:05:14.484198+05:30	2026-05-26 14:05:14.484198+05:30
f8f579ab-5621-470e-bf8e-4bc16e04956f	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 14:05:28.196068+05:30	2026-05-26 14:05:28.196068+05:30
9002bf06-b56c-44ff-8f17-5261dc9ecf28	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 14:05:28.196068+05:30	2026-05-26 14:05:28.196068+05:30
df21e085-ed67-4c87-8e77-9d0f25283c09	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 14:05:28.196068+05:30	2026-05-26 14:05:28.196068+05:30
d55b5fd4-a1ea-4a70-bf66-278299cbc6b3	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 14:05:28.196068+05:30	2026-05-26 14:05:28.196068+05:30
95d7791b-e2c1-45fb-bbce-a109d3893583	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 14:05:28.196068+05:30	2026-05-26 14:05:28.196068+05:30
676d8386-7ad9-4fbf-aeee-7fd432255dfb	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 14:05:28.196068+05:30	2026-05-26 14:05:28.196068+05:30
c90c5657-1d91-4759-83bf-03b2e640a310	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	77.00	2026-05-26	2026-05-26 14:05:41.689447+05:30	2026-05-26 14:05:41.689447+05:30
86ad43f4-e019-468f-bb4a-fb0d783ea918	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 14:05:41.689447+05:30	2026-05-26 14:05:41.689447+05:30
b1d8bead-41e2-4b1c-bd29-0057a1f550cd	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 14:05:41.689447+05:30	2026-05-26 14:05:41.689447+05:30
6ba53cf4-2328-46bd-aafc-fc747181501f	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 14:05:41.689447+05:30	2026-05-26 14:05:41.689447+05:30
49bf14c8-6c60-47fc-bee7-bf81817d9eee	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 14:05:41.689447+05:30	2026-05-26 14:05:41.689447+05:30
eb5a89be-11a5-453e-97c4-746fe61f6c01	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 14:05:41.689447+05:30	2026-05-26 14:05:41.689447+05:30
b58c0af1-a2d7-4d97-9764-f8ffce403ee2	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	67.00	2026-05-26	2026-05-26 14:05:52.73198+05:30	2026-05-26 14:05:52.73198+05:30
522e1fda-11e2-4c2f-b36b-6b97eebb523a	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	45.00	2026-05-26	2026-05-26 14:05:52.73198+05:30	2026-05-26 14:05:52.73198+05:30
5b85a011-5b79-49a4-bc53-da3f877fce2e	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	67.00	2026-05-26	2026-05-26 14:05:52.73198+05:30	2026-05-26 14:05:52.73198+05:30
3f4718d5-15e8-494b-8996-4d545c6fbb50	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	8b7303c4-9149-4688-88ca-8aa116cd652c	66.00	2026-05-26	2026-05-26 14:06:01.398693+05:30	2026-05-26 14:06:01.398693+05:30
7fc6bf8e-2c8c-4694-a99b-c3d7839dc3c3	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	8b7303c4-9149-4688-88ca-8aa116cd652c	56.00	2026-05-26	2026-05-26 14:06:01.398693+05:30	2026-05-26 14:06:01.398693+05:30
a05a6038-f68e-4506-aeb5-9019ddfc88ce	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	2	2026	51050e72-c564-416b-880f-89bcb9d65d53	45.00	2026-05-26	2026-05-26 14:06:11.400857+05:30	2026-05-26 14:06:11.400857+05:30
e303b36c-839f-4d5b-add2-de0f3473b56b	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	2	2026	51050e72-c564-416b-880f-89bcb9d65d53	45.00	2026-05-26	2026-05-26 14:06:11.400857+05:30	2026-05-26 14:06:11.400857+05:30
2d232ada-1a9b-4e26-8f8c-afad2c133d9a	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	2	2026	51050e72-c564-416b-880f-89bcb9d65d53	45.00	2026-05-26	2026-05-26 14:06:11.400857+05:30	2026-05-26 14:06:11.400857+05:30
a8ad8e30-ab66-4eab-b312-1c2adcf53445	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	2	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	45.00	2026-05-26	2026-05-26 14:06:19.751923+05:30	2026-05-26 14:06:19.751923+05:30
2f13ebc7-7f99-44c5-add7-c31742e3f5be	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	2	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	45.00	2026-05-26	2026-05-26 14:06:19.751923+05:30	2026-05-26 14:06:19.751923+05:30
c03c3e65-178f-4c1f-a59f-6900c581c209	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	2	2026	74da8036-d5f6-4af7-b7eb-575894653b6b	78.00	2026-05-26	2026-05-26 14:06:28.714523+05:30	2026-05-26 14:06:28.714523+05:30
b2598eb0-8528-4cd3-814d-bedd580c474e	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-05-26	2026-05-26 17:48:10.772467+05:30	2026-05-26 17:48:10.772467+05:30
ad940109-fcad-49af-8f18-b090cfb04237	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-05-26	2026-05-26 17:48:10.772467+05:30	2026-05-26 17:48:10.772467+05:30
3e03be71-6887-469a-b59f-9b2fcda9093a	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-05-26	2026-05-26 17:48:10.772467+05:30	2026-05-26 17:48:10.772467+05:30
38d62fb9-0ddd-42f9-b74d-c7a60d9fe2f0	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	67.00	2026-05-26	2026-05-26 17:48:10.772467+05:30	2026-05-26 17:48:10.772467+05:30
e410f330-1a9e-4991-aa25-22b91e28aa8d	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	56.00	2026-05-26	2026-05-26 17:48:10.772467+05:30	2026-05-26 17:48:10.772467+05:30
b2144f06-8c95-409a-a6f4-ef505e404b1f	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	45.00	2026-05-26	2026-05-26 17:48:10.772467+05:30	2026-05-26 17:48:10.772467+05:30
5527af6c-0468-4695-97aa-72935728c8d7	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	89.00	2026-05-26	2026-05-26 17:48:52.415224+05:30	2026-05-26 17:48:52.415224+05:30
2e7c1c65-1bf8-4d20-80e0-666da87e0d93	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	89.00	2026-05-26	2026-05-26 17:48:52.415224+05:30	2026-05-26 17:48:52.415224+05:30
f31e16b9-cf64-4b0a-8bb5-1268e7d34781	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	88.00	2026-05-26	2026-05-26 17:48:52.415224+05:30	2026-05-26 17:48:52.415224+05:30
a4ef5cd2-004b-48ea-b28d-51d530303c03	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	56.00	2026-05-26	2026-05-26 17:48:52.415224+05:30	2026-05-26 17:48:52.415224+05:30
e1bc27c3-7e1d-4f00-a2a1-3f8a915526af	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	45.00	2026-05-26	2026-05-26 17:48:52.415224+05:30	2026-05-26 17:48:52.415224+05:30
81c1a09a-0bc7-4678-ac78-35aec8d8831a	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	67.00	2026-05-26	2026-05-26 17:48:52.415224+05:30	2026-05-26 17:48:52.415224+05:30
8cfc6203-df98-4b03-9013-aa5bde2488c2	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	56.00	2026-05-26	2026-05-26 17:49:11.045475+05:30	2026-05-26 17:49:11.045475+05:30
9382c110-e7af-4d2e-8e8c-6fd997aac5e8	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	45.00	2026-05-26	2026-05-26 17:49:11.045475+05:30	2026-05-26 17:49:11.045475+05:30
deeaa00f-1387-4268-90ad-3a652a15c056	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	66.00	2026-05-26	2026-05-26 17:49:11.045475+05:30	2026-05-26 17:49:11.045475+05:30
312001ea-1afd-446a-b4ba-d85139c3f73a	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	67.00	2026-05-26	2026-05-26 17:49:11.045475+05:30	2026-05-26 17:49:11.045475+05:30
f842dadd-c580-4558-8143-29db140f008d	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	56.00	2026-05-26	2026-05-26 17:49:11.045475+05:30	2026-05-26 17:49:11.045475+05:30
ff863601-86cc-4fa0-a4bf-292fe187f42b	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	78.00	2026-05-26	2026-05-26 17:49:11.045475+05:30	2026-05-26 17:49:11.045475+05:30
910c3efd-2bac-4cbc-8484-f41024ed9101	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 17:49:26.53258+05:30	2026-05-26 17:49:26.53258+05:30
a6b717bd-1fc0-4b7c-96ea-a49173ffd50a	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 17:49:26.53258+05:30	2026-05-26 17:49:26.53258+05:30
b278264b-f4cd-40e7-9341-ff0839a887a7	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 17:49:26.53258+05:30	2026-05-26 17:49:26.53258+05:30
b3642876-c1fe-4589-b541-321a29ac50e2	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 17:49:26.53258+05:30	2026-05-26 17:49:26.53258+05:30
7f4ca69e-1059-4a87-94da-d1b733ac8f4d	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 17:49:26.53258+05:30	2026-05-26 17:49:26.53258+05:30
1c029c68-5566-4972-b524-d722584b45f5	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	56.00	2026-05-26	2026-05-26 17:49:26.53258+05:30	2026-05-26 17:49:26.53258+05:30
478417e4-6eeb-4015-af69-7dd662ccfe76	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 17:49:40.253343+05:30	2026-05-26 17:49:40.253343+05:30
36a89714-f621-44b6-8b19-fd0bb2b10b59	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 17:49:40.253343+05:30	2026-05-26 17:49:40.253343+05:30
18d39c36-f8a8-4fad-8f25-dd8b4d4d2682	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 17:49:40.253343+05:30	2026-05-26 17:49:40.253343+05:30
e1316bd7-a39a-49f9-a41b-96454cf7a40f	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 17:49:40.253343+05:30	2026-05-26 17:49:40.253343+05:30
f45d315d-b432-4939-aee1-5aebbd554055	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 17:49:40.253343+05:30	2026-05-26 17:49:40.253343+05:30
5fa1f1e2-6e02-4cb3-a212-c950ce4f6d80	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-05-26	2026-05-26 17:49:40.253343+05:30	2026-05-26 17:49:40.253343+05:30
2655e352-7c00-4f36-a709-07b238176b2a	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	77.00	2026-05-26	2026-05-26 17:49:55.099003+05:30	2026-05-26 17:49:55.099003+05:30
eb9f0f5d-1f5c-4084-8554-2d9489e9aaec	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	77.00	2026-05-26	2026-05-26 17:49:55.099003+05:30	2026-05-26 17:49:55.099003+05:30
402bd993-cfc5-49d5-aa35-d79dd1698074	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 17:49:55.099003+05:30	2026-05-26 17:49:55.099003+05:30
def2a19d-0c78-45db-b5fb-0b3b94588555	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 17:49:55.099003+05:30	2026-05-26 17:49:55.099003+05:30
c91787c4-aa6b-4a6b-ab2d-617511a567d5	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 17:49:55.099003+05:30	2026-05-26 17:49:55.099003+05:30
b35c070c-ce14-49fd-b261-bc49112c6e04	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-26	2026-05-26 17:49:55.099003+05:30	2026-05-26 17:49:55.099003+05:30
25752dc3-0c0e-416c-a0f3-f0ae15f7272a	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	67.00	2026-05-26	2026-05-26 17:50:04.69129+05:30	2026-05-26 17:50:04.69129+05:30
0446e9f4-163d-4ef5-8169-a6e0074438e1	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	67.00	2026-05-26	2026-05-26 17:50:04.69129+05:30	2026-05-26 17:50:04.69129+05:30
65fd2712-0877-42bd-affe-5c34e9581933	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	67.00	2026-05-26	2026-05-26 17:50:04.69129+05:30	2026-05-26 17:50:04.69129+05:30
e6d18b45-fe48-422e-9c14-5b5302473802	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	8b7303c4-9149-4688-88ca-8aa116cd652c	98.00	2026-05-26	2026-05-26 17:50:15.423363+05:30	2026-05-26 17:50:15.423363+05:30
57f61697-9bf4-4050-97db-10ffd64d9b16	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	8b7303c4-9149-4688-88ca-8aa116cd652c	98.00	2026-05-26	2026-05-26 17:50:15.423363+05:30	2026-05-26 17:50:15.423363+05:30
187abee3-5e05-4f93-995b-e9d49905341e	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	943b5378-a3cc-4c57-9e7f-5db54cb10cb3	78.00	2026-05-26	2026-05-26 17:50:23.43933+05:30	2026-05-26 17:50:23.43933+05:30
a6288af8-dbe1-489f-a549-a1b856eb7f6c	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	78.00	2026-05-26	2026-05-26 17:50:32.91636+05:30	2026-05-26 17:50:32.91636+05:30
ce19d7a0-3f07-43d2-a3ce-2e08de139877	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	78.00	2026-05-26	2026-05-26 17:50:32.91636+05:30	2026-05-26 17:50:32.91636+05:30
75f99284-0d3e-4410-a9e3-57f1a10543d2	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	78.00	2026-05-26	2026-05-26 17:50:32.91636+05:30	2026-05-26 17:50:32.91636+05:30
d540df0e-7038-44cd-b943-ace2305245fd	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	78.00	2026-05-26	2026-05-26 17:50:32.91636+05:30	2026-05-26 17:50:32.91636+05:30
5e4c5a4e-0da7-4bef-8b53-bceb1c8d87fa	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	5d46a339-5b39-4742-908a-228e3067e7ff	78.00	2026-05-26	2026-05-26 17:50:39.560807+05:30	2026-05-26 17:50:39.560807+05:30
866cf748-8d5f-42fd-b668-f9413135fee7	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	c7e93f84-d12a-4775-b717-842b494d5ed8	77.00	2026-05-26	2026-05-26 17:50:48.643373+05:30	2026-05-26 17:50:48.643373+05:30
c045e098-1ab1-4240-99f9-018678766138	5e956353-c70e-4433-aa21-cf0a9bcf3602	64560975-90d7-409d-a04d-c3164438a794	3	2026	74da8036-d5f6-4af7-b7eb-575894653b6b	78.00	2026-05-26	2026-05-26 17:51:09.084975+05:30	2026-05-26 17:51:09.084975+05:30
d1471fbb-aef2-4101-a5a0-92a32ff3e562	aeab72f6-0f59-48a7-ad19-fc8d28e0e0b8	64560975-90d7-409d-a04d-c3164438a794	3	2026	51050e72-c564-416b-880f-89bcb9d65d53	67.00	2026-05-26	2026-05-26 17:50:56.059744+05:30	2026-05-26 17:50:56.059744+05:30
531a58b5-c749-4f48-8865-2ab19aba9bdf	a78c4071-9b4f-4721-8e2f-fb3c25cd3cd7	64560975-90d7-409d-a04d-c3164438a794	3	2026	51050e72-c564-416b-880f-89bcb9d65d53	67.00	2026-05-26	2026-05-26 17:50:56.059744+05:30	2026-05-26 17:50:56.059744+05:30
b43bfd01-a183-4e6e-8b25-79db9c79a47f	fd37bc40-8bc2-43b2-8bb1-8c557651e2e0	64560975-90d7-409d-a04d-c3164438a794	3	2026	51050e72-c564-416b-880f-89bcb9d65d53	67.00	2026-05-26	2026-05-26 17:50:56.059744+05:30	2026-05-26 17:50:56.059744+05:30
c484dc75-2cdb-4247-bdcf-048e1514a346	b47af724-c5f2-4b30-b5c1-9add8ca43645	64560975-90d7-409d-a04d-c3164438a794	3	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	87.00	2026-05-26	2026-05-26 17:51:03.273682+05:30	2026-05-26 17:51:03.273682+05:30
b2cdc41c-8fb1-4c42-9619-019b559eb579	00999c6b-5480-499d-9e70-a99987eb9d64	64560975-90d7-409d-a04d-c3164438a794	3	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	78.00	2026-05-26	2026-05-26 17:51:03.273682+05:30	2026-05-26 17:51:03.273682+05:30
0027f565-93cb-4fe1-a0f2-1ccf88264344	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-05-26	2026-05-26 20:00:46.041765+05:30	2026-05-26 20:00:46.041765+05:30
d0c0cec7-d5c3-4004-a4f9-3aa5d1a506aa	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-05-26	2026-05-26 20:00:46.041765+05:30	2026-05-26 20:00:46.041765+05:30
c8b5f74e-79e8-408a-a15d-e3f81e7220e2	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	254796ab-194d-48fc-b9cb-dca22eab25e9	80.00	2026-05-26	2026-05-26 20:00:57.156959+05:30	2026-05-26 20:00:57.156959+05:30
1f12f45b-85f8-42f2-b54e-8f88c4b375c9	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	254796ab-194d-48fc-b9cb-dca22eab25e9	89.00	2026-05-26	2026-05-26 20:00:57.156959+05:30	2026-05-26 20:00:57.156959+05:30
aadf8fa3-de85-4338-b4fc-4ebc5ba3b7c6	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-05-26	2026-05-26 20:01:06.433427+05:30	2026-05-26 20:01:06.433427+05:30
bad585e0-8f0c-438b-8b80-2e4361e5e46a	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-05-26	2026-05-26 20:01:06.433427+05:30	2026-05-26 20:01:06.433427+05:30
e7f505e4-6ec4-46cf-98c5-6006ddf90743	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-05-26	2026-05-26 20:01:21.356423+05:30	2026-05-26 20:01:21.356423+05:30
618dc8eb-f749-4fdc-a70a-bc80b13e606f	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	93.00	2026-05-26	2026-05-26 20:01:21.356423+05:30	2026-05-26 20:01:21.356423+05:30
4d061ad9-388d-4ec0-b079-441e616f1ad7	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	88.00	2026-05-30	2026-05-30 15:10:13.171027+05:30	2026-05-30 15:10:29.818863+05:30
716ed64a-16ae-4e73-b6aa-d69cd2be9a87	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	83.00	2026-05-30	2026-05-30 15:10:13.171027+05:30	2026-05-30 15:10:29.818863+05:30
3d028397-30f7-4673-b76b-c7f18162bfaf	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	254796ab-194d-48fc-b9cb-dca22eab25e9	87.00	2026-05-30	2026-05-30 15:10:55.404088+05:30	2026-05-30 15:10:55.404088+05:30
0804a0b3-43e5-48fc-8d98-73380fe35b00	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	254796ab-194d-48fc-b9cb-dca22eab25e9	67.00	2026-05-30	2026-05-30 15:10:55.404088+05:30	2026-05-30 15:10:55.404088+05:30
4b6df279-0585-450e-a1e8-aa89a40d6cb4	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-05-30	2026-05-30 15:11:06.349591+05:30	2026-05-30 15:11:06.349591+05:30
b9544023-f7f4-461f-900f-2ac09d9f691d	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	98.00	2026-05-30	2026-05-30 15:11:06.349591+05:30	2026-05-30 15:11:06.349591+05:30
31740ffb-cb17-4c89-9734-18c7e2d60110	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-05-30	2026-05-30 15:11:16.006842+05:30	2026-05-30 15:11:16.006842+05:30
4cebf3c4-64e0-49b0-b305-2de09a916c66	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	75.00	2026-05-30	2026-05-30 15:11:16.006842+05:30	2026-05-30 15:11:16.006842+05:30
df911827-5c6f-4940-8ec3-5269a6f17f4a	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	60.00	2026-05-30	2026-05-30 21:21:48.08166+05:30	2026-05-30 21:21:48.08166+05:30
dafe9a8a-0aed-4008-926b-ecfdb91b2609	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	80.00	2026-05-30	2026-05-30 21:21:48.08166+05:30	2026-05-30 21:21:48.08166+05:30
7571af61-bbc7-45df-8910-8aee638323a8	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	254796ab-194d-48fc-b9cb-dca22eab25e9	79.00	2026-05-30	2026-05-30 21:21:58.608003+05:30	2026-05-30 21:21:58.608003+05:30
43cd791f-4f30-4833-938c-a1c95f0ed89b	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	254796ab-194d-48fc-b9cb-dca22eab25e9	74.00	2026-05-30	2026-05-30 21:21:58.608003+05:30	2026-05-30 21:21:58.608003+05:30
391b9906-3699-4d4d-8a13-38d250f5e6a0	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	67.00	2026-05-30	2026-05-30 21:22:07.938883+05:30	2026-05-30 21:22:07.938883+05:30
598748c3-821e-49db-b144-402f555f6fdd	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	89.00	2026-05-30	2026-05-30 21:22:07.938883+05:30	2026-05-30 21:22:07.938883+05:30
5fa18fc7-1caf-4b12-8959-debda605fe51	7b6562b8-be72-4df1-a0b9-702c9ceec431	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-05-30	2026-05-30 21:22:18.987613+05:30	2026-05-30 21:22:18.987613+05:30
c0035ab7-9503-45e2-bb4d-581d4cdee170	f6a128a7-8725-4952-bd78-cf852e1846a8	41c0a26f-37a4-4336-b50a-cfb9b4a894be	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	92.00	2026-05-30	2026-05-30 21:22:18.987613+05:30	2026-05-30 21:22:18.987613+05:30
8e90615b-a244-42a0-a47b-779df80434e9	53d675a4-a5b1-4f09-8034-e00cbd9a460c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-06-30	2026-06-30 09:46:47.073332+05:30	2026-06-30 09:46:47.073332+05:30
9fe51981-f327-4d34-bde8-99593d0fff57	eb48778c-f7c9-4361-be6f-8d9a2eccab19	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-06-30	2026-06-30 09:46:47.073332+05:30	2026-06-30 09:46:47.073332+05:30
c667aa0c-7c25-4814-ba15-7207a5b85f31	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	80.00	2026-06-30	2026-06-30 09:46:47.073332+05:30	2026-06-30 09:46:47.073332+05:30
41d81dfe-6eea-4fa6-a94d-0c6cd955b531	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-06-30	2026-06-30 09:46:47.073332+05:30	2026-06-30 09:46:47.073332+05:30
f5c83a49-4432-40f8-8885-e7c8d677c59b	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	89.00	2026-06-30	2026-06-30 09:46:47.073332+05:30	2026-06-30 09:46:47.073332+05:30
9fda6649-de1f-4d40-9693-c26656429152	53d675a4-a5b1-4f09-8034-e00cbd9a460c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	80.00	2026-06-30	2026-06-30 09:48:05.66604+05:30	2026-06-30 09:48:05.66604+05:30
b13b3d88-ee13-4900-be9f-f68441d52d1f	eb48778c-f7c9-4361-be6f-8d9a2eccab19	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	80.00	2026-06-30	2026-06-30 09:48:05.66604+05:30	2026-06-30 09:48:05.66604+05:30
d23eafe7-9f2f-49de-a0b9-aa6f928ebe45	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	90.00	2026-06-30	2026-06-30 09:48:05.66604+05:30	2026-06-30 09:48:05.66604+05:30
ff0de105-a440-4554-9c4f-b01de5b8897a	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	78.00	2026-06-30	2026-06-30 09:48:05.66604+05:30	2026-06-30 09:48:05.66604+05:30
d1f5d7ac-e000-41a8-8e10-50aafeaf5efd	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	9eff45a6-f102-4628-940e-c3d71a8291d7	78.00	2026-06-30	2026-06-30 09:48:05.66604+05:30	2026-06-30 09:48:05.66604+05:30
8e84fb4d-2316-4bd1-a737-938c5543c8a3	eb48778c-f7c9-4361-be6f-8d9a2eccab19	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	67.00	2026-06-30	2026-06-30 09:48:19.63772+05:30	2026-06-30 09:48:19.63772+05:30
ed80e873-8356-4493-a1a5-33d0cde8909a	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	67.00	2026-06-30	2026-06-30 09:48:19.63772+05:30	2026-06-30 09:48:19.63772+05:30
8006e2c4-2993-4ca8-8e2a-6d0d2031b264	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	e3b71d41-c839-4ccb-8674-e8af8e908bf3	67.00	2026-06-30	2026-06-30 09:48:19.63772+05:30	2026-06-30 09:48:19.63772+05:30
e45bd14d-47f1-4e4a-8058-b5bd3fb5083a	53d675a4-a5b1-4f09-8034-e00cbd9a460c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	78.00	2026-06-30	2026-06-30 09:48:31.560369+05:30	2026-06-30 09:48:31.560369+05:30
82053f07-8c1a-4248-a07c-8d349db1a1ab	eb48778c-f7c9-4361-be6f-8d9a2eccab19	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	78.00	2026-06-30	2026-06-30 09:48:31.560369+05:30	2026-06-30 09:48:31.560369+05:30
0e0689d4-bfc5-445c-a594-aa690755f06b	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	78.00	2026-06-30	2026-06-30 09:48:31.560369+05:30	2026-06-30 09:48:31.560369+05:30
2928c55a-ee9a-45b0-847d-0a4b553270ed	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	78.00	2026-06-30	2026-06-30 09:48:31.560369+05:30	2026-06-30 09:48:31.560369+05:30
75a38561-e901-4466-b3e4-6f08736ea889	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	a722f572-b3bc-4d01-a865-1d3a33fa464b	78.00	2026-06-30	2026-06-30 09:48:31.560369+05:30	2026-06-30 09:48:31.560369+05:30
d1f21d43-066c-42b5-b0a2-52d8cc987de3	53d675a4-a5b1-4f09-8034-e00cbd9a460c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	89.00	2026-06-30	2026-06-30 09:48:46.640471+05:30	2026-06-30 09:48:46.640471+05:30
605ecce5-2c91-4f73-ae17-edbbb7e335c1	eb48778c-f7c9-4361-be6f-8d9a2eccab19	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	89.00	2026-06-30	2026-06-30 09:48:46.640471+05:30	2026-06-30 09:48:46.640471+05:30
f382faea-972e-4df3-8c2d-4f512ca05b9b	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	78.00	2026-06-30	2026-06-30 09:48:46.640471+05:30	2026-06-30 09:48:46.640471+05:30
b6f0ec67-eea0-469a-818b-afd9182269fd	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	67.00	2026-06-30	2026-06-30 09:48:46.640471+05:30	2026-06-30 09:48:46.640471+05:30
04771554-c09b-46f1-bd31-5a7d12ee9eac	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	f0a9d822-71ae-40ff-ba61-45b61e562863	67.00	2026-06-30	2026-06-30 09:48:46.640471+05:30	2026-06-30 09:48:46.640471+05:30
f65216e2-bd79-4bfa-aa83-8df74060154c	eb48778c-f7c9-4361-be6f-8d9a2eccab19	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	67.00	2026-06-30	2026-06-30 09:48:59.835669+05:30	2026-06-30 09:48:59.835669+05:30
9cc0e407-2b96-4adb-a08d-fde0f5c4df04	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	76.00	2026-06-30	2026-06-30 09:48:59.835669+05:30	2026-06-30 09:48:59.835669+05:30
2e7a0032-9c0c-4241-8a0a-30b711239a50	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	9df5a7a7-50ee-474c-85e7-d6822fbae030	77.00	2026-06-30	2026-06-30 09:48:59.835669+05:30	2026-06-30 09:48:59.835669+05:30
313228df-10bb-48a3-bd80-128a1c808ed4	53d675a4-a5b1-4f09-8034-e00cbd9a460c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	8b7303c4-9149-4688-88ca-8aa116cd652c	89.00	2026-06-30	2026-06-30 09:49:08.105706+05:30	2026-06-30 09:49:08.105706+05:30
d4b2a5db-8996-4ad2-b660-3016f9ef4f46	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	8b7303c4-9149-4688-88ca-8aa116cd652c	89.00	2026-06-30	2026-06-30 09:49:08.105706+05:30	2026-06-30 09:49:08.105706+05:30
7b9e1f09-8a10-4234-8625-ae96a55ecfdc	53d675a4-a5b1-4f09-8034-e00cbd9a460c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	89.00	2026-06-30	2026-06-30 09:49:27.98336+05:30	2026-06-30 09:49:27.98336+05:30
7771b4ec-190e-4c11-9786-f8dab0947e4b	eb48778c-f7c9-4361-be6f-8d9a2eccab19	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	89.00	2026-06-30	2026-06-30 09:49:27.98336+05:30	2026-06-30 09:49:27.98336+05:30
ebb48a1f-5804-4483-8d32-d25a86ded57a	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	98.00	2026-06-30	2026-06-30 09:49:27.98336+05:30	2026-06-30 09:49:27.98336+05:30
c7953f9a-1dd1-495e-b666-cb6add3ed051	75e04ba7-e9bc-42ac-a9db-2f4e2715503b	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	89.00	2026-06-30	2026-06-30 09:49:27.98336+05:30	2026-06-30 09:49:27.98336+05:30
b8263923-587a-4226-9691-1a11a2cd1092	869134a2-dc05-469c-9aeb-dd5d9dd6e1a8	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	fe19b797-2517-413a-a66c-30c8a9371d0f	89.00	2026-06-30	2026-06-30 09:49:27.98336+05:30	2026-06-30 09:49:27.98336+05:30
75c55757-5098-4ced-94b3-484f67db8963	53d675a4-a5b1-4f09-8034-e00cbd9a460c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	51050e72-c564-416b-880f-89bcb9d65d53	78.00	2026-06-30	2026-06-30 09:49:39.120993+05:30	2026-06-30 09:49:39.120993+05:30
8b725a03-17da-408c-b20f-a5f4b4bbd85d	5b4a48b4-ca0e-4af4-9cdf-891dbe3f468c	4bd02723-1c05-4f78-a894-6d79069bca75	1	2026	51050e72-c564-416b-880f-89bcb9d65d53	78.00	2026-06-30	2026-06-30 09:49:39.120993+05:30	2026-06-30 09:49:39.120993+05:30
029de3ba-d36c-4ea4-b03f-9079b51807bd	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	80.00	2026-07-06	2026-07-06 21:19:18.428571+05:30	2026-07-06 21:19:18.428571+05:30
38b2c996-14b1-495a-b227-3902ab72e23f	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	80.00	2026-07-06	2026-07-06 21:19:18.428571+05:30	2026-07-06 21:19:18.428571+05:30
0a581ced-a213-4ede-9a44-a8d4549126c1	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-07-06	2026-07-06 21:19:18.428571+05:30	2026-07-06 21:19:18.428571+05:30
68c65701-c7ac-49b4-b415-5a2253a0c851	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-07-06	2026-07-06 21:19:18.428571+05:30	2026-07-06 21:19:18.428571+05:30
f2d6af35-3d0a-4576-84fb-12f70d519f61	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	90.00	2026-07-06	2026-07-06 21:19:32.560227+05:30	2026-07-06 21:19:32.560227+05:30
d5f6756e-706d-432c-9db7-414f95cc1e4a	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-07-06	2026-07-06 21:19:32.560227+05:30	2026-07-06 21:19:32.560227+05:30
aafb8080-c3a3-406a-a9f1-6055e8f490bb	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	98.00	2026-07-06	2026-07-06 21:19:32.560227+05:30	2026-07-06 21:19:32.560227+05:30
a564c33f-1572-4b98-88c5-70af345418bf	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	67.00	2026-07-06	2026-07-06 21:19:32.560227+05:30	2026-07-06 21:19:32.560227+05:30
208882e7-2a85-4a0e-88db-9f43d1f03206	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	78.00	2026-07-06	2026-07-06 21:19:46.891111+05:30	2026-07-06 21:19:46.891111+05:30
64d1ad2b-a31a-4f7a-9e69-c4ebc58ad3f2	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	92.00	2026-07-06	2026-07-06 21:19:46.891111+05:30	2026-07-06 21:19:46.891111+05:30
18a64f24-5177-4248-8534-8c995d7757ef	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	56.00	2026-07-06	2026-07-06 21:19:46.891111+05:30	2026-07-06 21:19:46.891111+05:30
01ebbc39-d9c1-4783-bec6-411109b78bc3	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	67.00	2026-07-06	2026-07-06 21:19:46.891111+05:30	2026-07-06 21:19:46.891111+05:30
d322ddbf-c74c-424b-a962-9393a23a48e4	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-06	2026-07-06 21:19:58.416238+05:30	2026-07-06 21:19:58.416238+05:30
3f09f9b2-ecf7-44ee-a0ef-5c1e69278e46	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-07-06	2026-07-06 21:19:58.416238+05:30	2026-07-06 21:19:58.416238+05:30
2a4fce7b-b528-4152-bf8b-1b29785accb6	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	56.00	2026-07-06	2026-07-06 21:19:58.416238+05:30	2026-07-06 21:19:58.416238+05:30
f56140c7-ca0e-45a8-81f0-0d065cfe0386	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-07-06	2026-07-06 21:19:58.416238+05:30	2026-07-06 21:19:58.416238+05:30
ff7aeaf3-a2ae-4cdd-9a37-a665dc6f9902	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-07-06	2026-07-06 21:21:16.593744+05:30	2026-07-06 21:21:16.593744+05:30
d2d54551-6771-475b-aeee-3145db02ce18	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-07-06	2026-07-06 21:21:16.593744+05:30	2026-07-06 21:21:16.593744+05:30
9edf017d-4be3-4707-8c2e-10e380968e8c	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-07-06	2026-07-06 21:21:16.593744+05:30	2026-07-06 21:21:16.593744+05:30
ea581dfd-8e23-43ef-bf69-c2af23884589	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	56.00	2026-07-06	2026-07-06 21:21:16.593744+05:30	2026-07-06 21:21:16.593744+05:30
c4949160-f606-4d74-a81f-98b695914c60	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	67.00	2026-07-06	2026-07-06 21:23:13.059804+05:30	2026-07-06 21:23:13.059804+05:30
65b8d283-8103-4c2e-98b2-f71eae4289c6	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-07-06	2026-07-06 21:23:13.059804+05:30	2026-07-06 21:23:13.059804+05:30
99edec74-006b-4931-b460-87aab71fe9c6	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	89.00	2026-07-06	2026-07-06 21:23:13.059804+05:30	2026-07-06 21:23:13.059804+05:30
52ee2f09-ac1d-4e28-aa8a-8126e019a7a5	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	84.00	2026-07-06	2026-07-06 21:23:13.059804+05:30	2026-07-06 21:23:13.059804+05:30
2a4cb59a-9595-4c27-a18d-6ceaa06f96b4	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	67.00	2026-07-06	2026-07-06 21:23:26.490419+05:30	2026-07-06 21:23:26.490419+05:30
ae4833fd-9c5b-4351-9869-2ace9cacfb8e	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	78.00	2026-07-06	2026-07-06 21:23:26.490419+05:30	2026-07-06 21:23:26.490419+05:30
9ee78d48-0df0-4cb7-aea2-498a339f478b	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	65.00	2026-07-06	2026-07-06 21:23:26.490419+05:30	2026-07-06 21:23:26.490419+05:30
0b7c67ae-7d48-4113-81c4-a0c736ffb894	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	96555373-ae20-4341-b362-e9e82998e2d5	67.00	2026-07-06	2026-07-06 21:23:26.490419+05:30	2026-07-06 21:23:26.490419+05:30
b5c80bd9-a2c9-4f5b-b1d9-b0c48e01dbbd	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	90.00	2026-07-06	2026-07-06 21:23:41.518501+05:30	2026-07-06 21:23:41.518501+05:30
1be83c87-5f05-43db-9b63-60822b9d00bb	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-06	2026-07-06 21:23:41.518501+05:30	2026-07-06 21:23:41.518501+05:30
8b8091c6-dbd2-4a03-9926-d0e399cab0b2	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-06	2026-07-06 21:23:41.518501+05:30	2026-07-06 21:23:41.518501+05:30
dd5e1be2-7de7-4000-a5e9-d15da0c5a37d	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	2	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	56.00	2026-07-06	2026-07-06 21:23:41.518501+05:30	2026-07-06 21:23:41.518501+05:30
72e8a84f-db88-43a3-9dcf-224f0c13e158	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	70.00	2026-07-08	2026-07-08 10:26:25.877851+05:30	2026-07-08 10:26:25.877851+05:30
0bcc1df9-9d71-4bd7-bcbb-e288ef4a98e3	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	75.00	2026-07-08	2026-07-08 10:26:25.877851+05:30	2026-07-08 10:26:25.877851+05:30
f69bc203-c541-447e-a553-ed6a599370ef	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	60.00	2026-07-08	2026-07-08 10:26:25.877851+05:30	2026-07-08 10:26:25.877851+05:30
dc23582e-745f-4f5f-95a9-a581832698e8	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	45.00	2026-07-08	2026-07-08 10:26:25.877851+05:30	2026-07-08 10:26:25.877851+05:30
b0105e9b-7548-4e36-8ba8-4a3f3b27f9e7	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	67.00	2026-07-08	2026-07-08 10:26:36.659548+05:30	2026-07-08 10:26:36.659548+05:30
fe32e1e8-1425-470c-a152-da5ff375dee0	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-07-08	2026-07-08 10:26:36.659548+05:30	2026-07-08 10:26:36.659548+05:30
7c409664-5ebe-4e28-a2ad-94917a2ade56	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	89.00	2026-07-08	2026-07-08 10:26:36.659548+05:30	2026-07-08 10:26:36.659548+05:30
349c023b-64a6-4c26-84e9-88b22a6ed44a	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	45.00	2026-07-08	2026-07-08 10:26:36.659548+05:30	2026-07-08 10:26:36.659548+05:30
3bb66c02-4497-4590-93a7-dc951088a8ed	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	87.00	2026-07-08	2026-07-08 10:26:49.868742+05:30	2026-07-08 10:26:49.868742+05:30
c5ea4fb1-e236-4965-be93-914f813f5daa	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	78.00	2026-07-08	2026-07-08 10:26:49.868742+05:30	2026-07-08 10:26:49.868742+05:30
84a3ac2b-5d64-4da6-88d0-da471b21f3d0	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	67.00	2026-07-08	2026-07-08 10:26:49.868742+05:30	2026-07-08 10:26:49.868742+05:30
138bb529-937d-4cea-ab3f-a34469020083	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	96555373-ae20-4341-b362-e9e82998e2d5	45.00	2026-07-08	2026-07-08 10:26:49.868742+05:30	2026-07-08 10:26:49.868742+05:30
2b29a934-cab7-4d78-891e-6ab043a16302	1c0f58e0-c8a3-403b-b3fd-35748bce4b9a	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-07-08	2026-07-08 10:27:04.681174+05:30	2026-07-08 10:27:04.681174+05:30
bbfee5d8-4eb4-4374-ae38-73f7aecf29e5	b24a3354-4780-415a-9934-aebff21f9096	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-08	2026-07-08 10:27:04.681174+05:30	2026-07-08 10:27:04.681174+05:30
fc1289dc-7456-4fb2-a02c-1ceb4173a89c	877deab2-5b88-4573-8fce-c4e52706b7e0	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-07-08	2026-07-08 10:27:04.681174+05:30	2026-07-08 10:27:04.681174+05:30
05b85859-2d08-4137-b8d8-3065c7d7a252	af93e596-e524-4830-b1e6-78051eb850b6	0e566dff-0770-4286-bae9-417248b5f82a	3	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	56.00	2026-07-08	2026-07-08 10:27:04.681174+05:30	2026-07-08 10:27:04.681174+05:30
a8e37be5-dbae-4728-ac11-50e3484e50aa	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	34.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
a659bf1a-a348-45ed-9098-3b942d065fe2	836fd154-cdfd-49f0-82eb-a55e67ec7406	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	67.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
4432a06d-f7a3-474a-b794-367a6ec5f231	db2737be-154b-4e11-961a-f605558ef0eb	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	89.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
e8b364dc-2b6b-449b-bbed-b394f0b6b417	186e3d3e-396c-411c-9ed0-8b19aa596e15	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	89.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
9e60493c-068d-45b2-8332-05b477b8f010	ac21cfd7-4584-466d-a740-eb25d6baca2d	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	89.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
87e5556a-870b-48dd-a484-a0f5cdba712c	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
c17f70d8-29e1-4dc6-9728-c4e035dead52	2da0cce0-e401-4a70-b12c-bfaf452c6593	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	87.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
c69c452d-35b9-43d6-9594-c80fb226e901	adbe2730-fe44-44ac-bee9-f8888cf50569	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	76.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
c9b76ecc-07eb-4c05-8276-cfa6a16fcaf5	d16622d3-5780-4188-b1d9-67254a2e59c2	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	90.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
33b16926-4a0b-4686-96f4-cf0cc0812419	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	93.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
f62cfd1c-df68-4d10-a56d-1c1ced7aeb06	5dd90925-434b-4342-9691-392bb979b295	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	89.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
7e77e8c9-92ad-4276-8be8-da8667ce13f5	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	78.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
06abf29d-05cf-48a7-b6b2-fad8841e0f0e	e3ded0b9-e857-4b32-83b9-7c167372a544	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	67.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
5b7e45b2-b161-481b-8437-11552bf8076c	3870b309-9c01-4c72-af60-1338fc95f35d	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	98.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
24bf14fd-9543-4170-8124-bfb8548ca211	93667668-78ac-408a-a626-267a7d2607ab	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	98.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
3fe3aec7-ce0b-4869-9b2b-da07cd9b8175	0314a791-ea42-429e-a632-38e8dd8ecdde	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	87.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
469f8f19-1f81-46bc-a046-05f1f0cdd724	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	89.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
90b5b105-bee6-4c67-9802-26a65d2ae275	a50e217d-21ce-415d-8035-c37b3cf89a71	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	27f16dd3-f1b7-405a-8a98-961c086a4bb6	87.00	2026-07-09	2026-07-09 11:45:29.815972+05:30	2026-07-09 11:45:29.815972+05:30
61adccc6-447b-4525-b48c-0297be4a42b8	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	23.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
7e425195-c0c9-4984-810b-c9fc60805e31	836fd154-cdfd-49f0-82eb-a55e67ec7406	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	67.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
17b0928b-116f-42ec-a1e7-668ee8e5712f	db2737be-154b-4e11-961a-f605558ef0eb	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	78.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
0a5975f6-b00f-46ac-b454-3f67797f8fdc	186e3d3e-396c-411c-9ed0-8b19aa596e15	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	89.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
ceb8d837-4d32-48a2-aa4e-1d213dc14012	ac21cfd7-4584-466d-a740-eb25d6baca2d	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	89.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
fc70d411-c7a5-4f2a-a042-e43dc8c8e2c7	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	90.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
51bce0ff-47d0-48e7-be02-814b3801697c	2da0cce0-e401-4a70-b12c-bfaf452c6593	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	78.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
5e1ec85c-98d4-4e6e-8c43-d94177f672f9	adbe2730-fe44-44ac-bee9-f8888cf50569	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	89.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
f8770959-ea06-443d-9b07-46fd18bf45d9	d16622d3-5780-4188-b1d9-67254a2e59c2	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	78.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
2be72d93-e033-4a6b-820e-b5f9fc28a2ff	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	90.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
35f215bc-94db-4377-bfa4-92ecebb29bb3	5dd90925-434b-4342-9691-392bb979b295	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	89.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
8f654e0b-9b4f-4de5-bdef-46d49a2b8df7	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	76.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
01d26161-37bf-4e9a-b8e7-0b71cad64edc	e3ded0b9-e857-4b32-83b9-7c167372a544	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	89.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
4c5f9967-3195-4129-978d-ea2b2fbf64ee	3870b309-9c01-4c72-af60-1338fc95f35d	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	96.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
87511ba2-e1f9-449d-a69e-679d21aa2d5d	93667668-78ac-408a-a626-267a7d2607ab	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	85.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
076935a8-5c23-4e78-8319-cd7d29e99b12	0314a791-ea42-429e-a632-38e8dd8ecdde	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	85.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
daf01018-187b-42dc-aa3c-4f6c1d7c6e0b	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	96.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
416cce8c-6338-4bf3-aba8-4386b5be8254	a50e217d-21ce-415d-8035-c37b3cf89a71	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	96555373-ae20-4341-b362-e9e82998e2d5	65.00	2026-07-09	2026-07-09 11:46:11.524394+05:30	2026-07-09 11:46:11.524394+05:30
3ec24edc-651c-4e88-b546-e4fa56a94083	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	69.00	2026-07-09	2026-05-11 12:52:17.929416+05:30	2026-07-09 11:47:42.270164+05:30
4fac3249-9eb7-4514-9ee7-767cd8c76ce3	836fd154-cdfd-49f0-82eb-a55e67ec7406	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
6565ef07-7625-4202-9953-ae334f3ffb90	db2737be-154b-4e11-961a-f605558ef0eb	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	89.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
a411a539-04df-427b-996c-1f8a15cc23d4	186e3d3e-396c-411c-9ed0-8b19aa596e15	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	89.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
c1013522-f7c7-47d7-a3c0-daec967f2622	ac21cfd7-4584-466d-a740-eb25d6baca2d	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	89.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
97961b45-19bf-4761-923b-12defc76feeb	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	76.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
61e63db6-758b-46e3-9fe2-7d6826b4cac6	2da0cce0-e401-4a70-b12c-bfaf452c6593	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	89.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
7ef5c448-9848-4a6f-9ad8-c83543d901b2	adbe2730-fe44-44ac-bee9-f8888cf50569	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-07-09	2026-05-11 12:52:17.929416+05:30	2026-07-09 11:47:42.270164+05:30
ba37c14c-afe8-4015-a4cf-fe75356d3eaf	d16622d3-5780-4188-b1d9-67254a2e59c2	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	98.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
b41d1f3c-f946-41cb-a63d-731c937016d5	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	78.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
041eca6f-83a9-430b-a7c3-48fb1744469e	5dd90925-434b-4342-9691-392bb979b295	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	98.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
b0721c69-5d8e-4201-bff0-6c87a4ef967b	199eeaf1-0659-4e47-895c-c3aa1bd6d1fe	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	84.00	2026-07-09	2026-05-11 12:52:17.929416+05:30	2026-07-09 11:47:42.270164+05:30
5747b60b-b26b-49d2-841c-b18a806a3189	e3ded0b9-e857-4b32-83b9-7c167372a544	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	98.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
1009e949-cda8-4965-93f8-b9a68b9464b5	3870b309-9c01-4c72-af60-1338fc95f35d	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	67.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
55d6017a-f355-4bd9-a1b1-c73160249893	93667668-78ac-408a-a626-267a7d2607ab	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	87.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
21af370b-a1d6-42dc-8e60-c0afa0c7d1f7	0314a791-ea42-429e-a632-38e8dd8ecdde	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	98.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
aa1ecada-c980-471e-9888-475affa8ff1d	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	98.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
b6cb4580-794e-4c5a-8903-38c5a6f27606	a50e217d-21ce-415d-8035-c37b3cf89a71	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	173b0ae5-79be-4eca-a3e5-b204757e845e	98.00	2026-07-09	2026-07-09 11:47:42.270164+05:30	2026-07-09 11:47:42.270164+05:30
4b91f139-2952-4c6d-9a71-52f23df74537	9a4e5df4-3751-41bb-8de0-9c1d80e626e8	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	34.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
bf19c22a-171a-45c9-9cd3-efd8c6de81a3	836fd154-cdfd-49f0-82eb-a55e67ec7406	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
56f2e8a8-0e9f-4ec1-ab06-7a6d4675a87e	db2737be-154b-4e11-961a-f605558ef0eb	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
03cf64ee-0ea3-4051-84cb-41f9b32bbf02	186e3d3e-396c-411c-9ed0-8b19aa596e15	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
7d32fb22-5637-4f4d-b7ee-9bd3e1224e6a	ac21cfd7-4584-466d-a740-eb25d6baca2d	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
6c181436-75cb-4202-b3cb-4fe3f3eff2e9	ea16b6fb-dfbc-43d6-9c1f-da6ef92541bd	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
9878c7c3-c521-47c0-8ed2-faf68489ff49	2da0cce0-e401-4a70-b12c-bfaf452c6593	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	87.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
09622797-cf9f-4116-9956-918520c3225f	d16622d3-5780-4188-b1d9-67254a2e59c2	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	67.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
b0760374-8ea3-4a87-bbf5-2de9864e39fa	34e88aa0-4819-4132-b9c5-72d1ac14c0a4	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	78.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
e8a9b6d3-4f6d-4b77-b9ad-bda3ce063645	5dd90925-434b-4342-9691-392bb979b295	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	79.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
ac69c2d1-02f9-480e-937e-510dc38ff67b	e3ded0b9-e857-4b32-83b9-7c167372a544	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
280e3a0a-d33c-468c-bc21-f0dcc5ea83e9	3870b309-9c01-4c72-af60-1338fc95f35d	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	90.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
a3991bd7-c72c-4250-86b2-b3b6543b483f	93667668-78ac-408a-a626-267a7d2607ab	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	76.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
81ad11f6-ac07-4c2a-84a7-7fe859823239	0314a791-ea42-429e-a632-38e8dd8ecdde	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	89.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
68aeb12e-d40d-4c94-9ae7-75dabd6ef624	0ce43864-eb9b-465b-97eb-59d4ca09f5e4	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	76.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
c12ca02a-269a-4ccf-aeaa-797fbbb60714	a50e217d-21ce-415d-8035-c37b3cf89a71	828f4c08-6936-44db-be08-bf5507d5b0ed	1	2026	d80ab4f7-5711-40fc-82a9-e17249f9778b	98.00	2026-07-09	2026-07-09 11:48:17.921154+05:30	2026-07-09 11:48:39.523552+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, role, full_name, login_id, email, phone, password_hash, is_active, created_at, updated_at, last_login_at, teacher_code) FROM stdin;
b99f02a7-30a4-4e02-8a89-38d28559f699	teacher	Imesh Shala	pubudulakshan72@gmail.com	pubudulakshan72@gmail.com	0766218578	$2b$10$M8bV1Qe/UlLm1yH1VXKXGO80qxjBPnawjN7meU57AKA7jyG88.J72	t	2026-05-06 09:58:18.958042+05:30	2026-05-06 09:58:18.958042+05:30	\N	22UG3-0282
8b8f5770-1217-47f4-982b-68fea944b6a2	teacher	Nathasha Tharushini	pubudu@gmail.com	pubudu@gmail.com	0715436047	$2b$10$JgXAG9ClydBD1S1PK8dT8uS/QZMJXApF8iJQ3GQfgKkOvdyUiUa0.	t	2026-05-06 10:40:07.894199+05:30	2026-05-11 14:42:20.761819+05:30	\N	22UG3-0283
70ed8260-d6df-4d85-8c40-a67e36d28e55	teacher	Ms.Samanthi Athukorala	lakshan@gmail.com	lakshan@gmail.com	0715436047	$2b$10$kdnGWnPHXY0UwPLjTK1.0.2MX50Gyqyv2FeBQGSmH6RJo8WSLuL2C	t	2026-05-10 16:54:39.499084+05:30	2026-05-15 13:32:49.105019+05:30	\N	22UG3-0285
60f8f109-15a2-4e2e-8617-37ab492fc1f3	teacher	Sagarika fernando	sagarika@gmail.com	sagarika@gmail.com	0766218578	$2b$10$wgVl03aHDHlzRfbwICNfdu8Rzfj3NBpLHSKy8dkr51hbCZ7IO0akq	t	2026-05-15 16:47:36.837701+05:30	2026-05-15 17:48:51.780655+05:30	\N	22UG3-0284
1746cfe8-a032-4f38-b332-9b9094a7a560	teacher	Mr.Amith Gunasinghe	amith@gml.com	amith@gml.com	0766218578	$2b$10$IKrSSf7MovujGobJ5IQgpeD/5zrW3eu82bnj7QOg7KRpa4bLRFQpO	t	2026-05-13 18:52:31.701949+05:30	2026-05-15 18:57:17.583494+05:30	\N	22UG3-0287
5c0ffca7-195e-42f0-806e-af8cfc01301d	teacher	Azam ameen	azam@gmail.com	azam@gmail.com	0766218578	$2b$10$KFDq/bKYXdZJVaAMF/beKutUy4sp34Ny22v0dQIB8rKHTWH/8s/UO	t	2026-05-26 19:51:24.757727+05:30	2026-05-26 19:51:24.757727+05:30	\N	22UG3-0288
20f1c12e-1a3f-4d38-9a95-6bda2728c3e3	teacher	Rakitha Rajapaksha	rakitha@gmail.com	rakitha@gmail.com	0715436047	$2b$10$Olskg/uLu8o8os1ZxUemzegCci6B.Pi1KTCsZREMVCz8yxKhwCOs6	t	2026-07-03 09:45:20.429683+05:30	2026-07-03 09:45:20.429683+05:30	\N	22UG3-0086
091e001f-d386-487a-b978-7d4a7f98abfb	teacher	Wijedasa Rajapaksha	wijedasa@gmail.com	wijedasa@gmail.com	0766218578	$2b$10$hzZSf1HpDG2OUjCHxKiDvuAuR1wyJQezatQ6vmTIQjW7zwv0HbIOW	t	2026-07-07 09:06:14.412126+05:30	2026-07-07 09:06:14.412126+05:30	\N	22UG3-0001
15804699-c7ec-4c08-81f3-fdbf0f33bcbe	admin	School Admin	admin@gmail.com	admin@gmail.com	0766218578	$2b$10$ucc.hJT0Vhslx0UDywBjcOmbXcl4/DpcHfVHRv/GFAa4lLWN8QT7e	t	2026-04-17 17:21:27.273797+05:30	2026-04-17 17:21:27.273797+05:30	\N	\N
7899117d-02f7-4c18-b2af-0a3123959add	teacher	Avishaka Prasad	avishaka@gmail.com	avishaka@gmail.com	0766218578	$2b$10$8NUoTqKbXlSYJutCjbHFkeRu322gkER2BvphYgjRcTrLKLO8ku3kG	t	2026-07-09 11:21:46.040474+05:30	2026-07-09 11:21:46.040474+05:30	\N	22UG3-0281
\.


--
-- Name: backup_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.backup_logs_id_seq', 1, true);


--
-- Name: attendance_records attendance_records_attendance_sheet_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_attendance_sheet_id_student_id_key UNIQUE (attendance_sheet_id, student_id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_sheets attendance_sheets_class_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sheets
    ADD CONSTRAINT attendance_sheets_class_id_attendance_date_key UNIQUE (class_id, attendance_date);


--
-- Name: attendance_sheets attendance_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sheets
    ADD CONSTRAINT attendance_sheets_pkey PRIMARY KEY (id);


--
-- Name: backup_logs backup_logs_file_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_logs
    ADD CONSTRAINT backup_logs_file_name_key UNIQUE (file_name);


--
-- Name: backup_logs backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_logs
    ADD CONSTRAINT backup_logs_pkey PRIMARY KEY (id);


--
-- Name: class_subject_plans class_subject_plans_grade_stream_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_subject_plans
    ADD CONSTRAINT class_subject_plans_grade_stream_key UNIQUE (grade, stream);


--
-- Name: class_subject_plans class_subject_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_subject_plans
    ADD CONSTRAINT class_subject_plans_pkey PRIMARY KEY (id);


--
-- Name: classes classes_grade_section_academic_year_stream_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_grade_section_academic_year_stream_key UNIQUE (grade, section, academic_year, stream);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (holiday_date);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: student_class_assignments student_class_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT student_class_assignments_pkey PRIMARY KEY (id);


--
-- Name: student_class_assignments student_class_assignments_student_id_class_id_assigned_at_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT student_class_assignments_student_id_class_id_assigned_at_key UNIQUE (student_id, class_id, assigned_at);


--
-- Name: student_subjects student_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_subjects
    ADD CONSTRAINT student_subjects_pkey PRIMARY KEY (id);


--
-- Name: student_subjects student_subjects_student_id_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_subjects
    ADD CONSTRAINT student_subjects_student_id_subject_id_key UNIQUE (student_id, subject_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_student_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_code_key UNIQUE (student_code);


--
-- Name: subjects subjects_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_code_key UNIQUE (code);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: teacher_password_reset_otps teacher_password_reset_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_password_reset_otps
    ADD CONSTRAINT teacher_password_reset_otps_pkey PRIMARY KEY (id);


--
-- Name: teacher_password_reset_otps teacher_password_reset_otps_teacher_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_password_reset_otps
    ADD CONSTRAINT teacher_password_reset_otps_teacher_id_key UNIQUE (teacher_id);


--
-- Name: term_class_marks_reviews term_class_marks_reviews_class_id_term_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_class_marks_reviews
    ADD CONSTRAINT term_class_marks_reviews_class_id_term_academic_year_key UNIQUE (class_id, term, academic_year);


--
-- Name: term_class_marks_reviews term_class_marks_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_class_marks_reviews
    ADD CONSTRAINT term_class_marks_reviews_pkey PRIMARY KEY (id);


--
-- Name: term_marks_reviews term_marks_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_marks_reviews
    ADD CONSTRAINT term_marks_reviews_pkey PRIMARY KEY (id);


--
-- Name: term_marks_reviews term_marks_reviews_student_id_class_id_term_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_marks_reviews
    ADD CONSTRAINT term_marks_reviews_student_id_class_id_term_academic_year_key UNIQUE (student_id, class_id, term, academic_year);


--
-- Name: term_tests term_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_tests
    ADD CONSTRAINT term_tests_pkey PRIMARY KEY (id);


--
-- Name: term_tests term_tests_student_id_class_id_term_academic_year_subject_i_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_tests
    ADD CONSTRAINT term_tests_student_id_class_id_term_academic_year_subject_i_key UNIQUE (student_id, class_id, term, academic_year, subject_id);


--
-- Name: users users_login_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_login_id_key UNIQUE (login_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_teacher_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_teacher_code_key UNIQUE (teacher_code);


--
-- Name: idx_attendance_records_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_records_student ON public.attendance_records USING btree (student_id);


--
-- Name: idx_attendance_sheets_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_sheets_date ON public.attendance_sheets USING btree (attendance_date);


--
-- Name: idx_attendance_sheets_notified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_sheets_notified ON public.attendance_sheets USING btree (is_notified, attendance_date);


--
-- Name: idx_class_subject_plans_grade_stream; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_subject_plans_grade_stream ON public.class_subject_plans USING btree (grade, stream);


--
-- Name: idx_classes_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_teacher ON public.classes USING btree (teacher_id);


--
-- Name: idx_student_assignments_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_assignments_student ON public.student_class_assignments USING btree (student_id);


--
-- Name: idx_term_class_marks_reviews_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_term_class_marks_reviews_class ON public.term_class_marks_reviews USING btree (class_id);


--
-- Name: idx_term_marks_reviews_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_term_marks_reviews_student ON public.term_marks_reviews USING btree (student_id);


--
-- Name: idx_term_tests_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_term_tests_student ON public.term_tests USING btree (student_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: attendance_records attendance_records_attendance_sheet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_attendance_sheet_id_fkey FOREIGN KEY (attendance_sheet_id) REFERENCES public.attendance_sheets(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: attendance_sheets attendance_sheets_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sheets
    ADD CONSTRAINT attendance_sheets_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: attendance_sheets attendance_sheets_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sheets
    ADD CONSTRAINT attendance_sheets_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notification_logs notification_logs_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_class_assignments student_class_assignments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT student_class_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: student_class_assignments student_class_assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_class_assignments
    ADD CONSTRAINT student_class_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_subjects student_subjects_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_subjects
    ADD CONSTRAINT student_subjects_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_subjects student_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_subjects
    ADD CONSTRAINT student_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: teacher_password_reset_otps teacher_password_reset_otps_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_password_reset_otps
    ADD CONSTRAINT teacher_password_reset_otps_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: term_class_marks_reviews term_class_marks_reviews_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_class_marks_reviews
    ADD CONSTRAINT term_class_marks_reviews_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: term_class_marks_reviews term_class_marks_reviews_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_class_marks_reviews
    ADD CONSTRAINT term_class_marks_reviews_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: term_marks_reviews term_marks_reviews_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_marks_reviews
    ADD CONSTRAINT term_marks_reviews_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: term_marks_reviews term_marks_reviews_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_marks_reviews
    ADD CONSTRAINT term_marks_reviews_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: term_marks_reviews term_marks_reviews_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_marks_reviews
    ADD CONSTRAINT term_marks_reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: term_tests term_tests_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_tests
    ADD CONSTRAINT term_tests_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: term_tests term_tests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_tests
    ADD CONSTRAINT term_tests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: term_tests term_tests_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_tests
    ADD CONSTRAINT term_tests_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict gd6bdAkRTAUqgEQydIRfUjll0VS39L6gnpllayYeuCZ2SpRqdgWwcMLXkNJVmTu

