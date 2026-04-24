# Sureki Backend

This backend is designed for the Sureki attendance and term-test management app.

## Database

- PostgreSQL database name: `sureki`
- Schema file: `backend/schema.sql`

### How to load schema

1. Open pgAdmin or psql connected to the `sureki` database.
2. Run the contents of `backend/schema.sql`.

```sql
\i /path/to/Test UI/backend/schema.sql
```

### How to seed the initial admin

After the schema is created, run:

```sql
\i /path/to/Test UI/backend/seed.sql
```

### If the `users` table was created from an older schema

Run the migration to add the missing `teacher_code` column:

```sql
\i /path/to/Test UI/backend/migration-add-teacher-code.sql
```

### If class creation fails with `classes_grade_check`

Some older databases have `classes_grade_check` restricted to grades 8-13.
Run this migration to align the constraint with the app rule (1-13):

```sql
\i /path/to/Test UI/backend/migration-fix-classes-grade-check.sql
```

## Running the backend

1. Create a `.env` file in `backend/` using `.env.example`.
  - Set `JWT_EXPIRES_IN=45m` (default is 45 minutes if not provided).
2. Install dependencies if needed:

```bash
cd "C:\Users\abc\Desktop\Test UI\backend"
npm install
```

3. Start the server:

```bash
npm run dev
```

4. Open `http://localhost:4000` to verify the server is running.

## Login API

Use the login endpoint to validate credentials and detect the user role.

`POST /api/auth/login`

Request body:

```json
{
  "email": "admin@gmail.com",
  "password": "1234"
}
```

Successful response:

```json
{
  "success": true,
  "token": "<jwt-token>",
  "user": {
    "id": "...",
    "role": "admin",
    "name": "School Admin",
    "email": "admin@gmail.com"
  }
}
```

Use the returned `token` to authenticate future API calls and the returned `role` to redirect:

- admin → admin dashboard
- teacher → teacher dashboard

### Example frontend redirect logic

```js
const response = await fetch("http://localhost:4000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const result = await response.json();
if (result.success) {
  if (result.user.role === "admin") {
    window.location.href = "/admin/dashboard-admin.html";
  } else {
    window.location.href = "/teacher/dashboard.html";
  }
} else {
  alert(result.error || "Login failed");
}
```

## Backend design

Use Express.js for the server and PostgreSQL for persistence.

### Recommended folder structure

```
backend/
  app.js
  routes/
    auth.js
    admin.js
    teacher.js
  controllers/
  services/
    smsService.js
    attendanceService.js
  models/
  db.js
  middleware/
    auth.js
    roleGuard.js
  config/
    index.js
```

### Core API routes

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/signup`
- `POST /api/admin/teachers`
- `GET /api/admin/teachers`
- `POST /api/admin/classes`
- `GET /api/admin/classes`
- `GET /api/admin/reports/attendance`
- `GET /api/admin/reports/term-tests`
- `POST /api/teacher/students`
- `GET /api/teacher/classes/current`
- `GET /api/teacher/attendance/today`
- `POST /api/teacher/attendance`
- `POST /api/teacher/attendance/:sheetId/notify`
- `POST /api/teacher/term-tests`
- `POST /api/auth/signup`
- `POST /api/admin/teachers`

### Authentication and roles

- Single universal login page
- `users.role` controls redirection
  - `admin` → admin dashboard
  - `teacher` → teacher panel
- Future Google login can be added via separate auth provider logic.

### Business rules to enforce in the backend

- Attendance may only be created for `attendance_date = today`
- Attendance is only valid while school day is open:
  - before `13:30` local time
  - late entries may be accepted until `13:30`
- No past or future attendance marking
- Only one attendance sheet per class per date
- Term test records grouped by term and academic year
- Students remain in history even after grade promotion or graduation
- Admin can view all records, teachers only see their current class assignments

## SMS integration

Use `text.lk` API for SMS notifications.

### Example flow

- After saving attendance, teacher clicks `notify`
- Backend builds one message per student parent:
  - Present: `Hi {parent_name}, Your child {student_name} is present at {date}`
  - Absent: `Hi {parent_name}, Your child {student_name} is absent at {date}`
  - Late: `Hi {parent_name}, Your child {student_name} arrived late at {date}. Reason: {reason}. Contact {teacher_name} at {teacher_phone}`
- Send SMS through `text.lk` and store delivery history in `notification_logs`

## Notes

- Use hashed passwords in `users.password_hash`.
- Create a single admin record manually or with an admin registration route.
- Classes are defined by `grade`, `section`, and `academic_year`.
- `student_class_assignments` preserves historical student-class membership.
- `term_tests` records can be used for parent report email notifications.

## Initial admin seed

To create the first admin user manually, run `backend/seed.sql` after loading the schema.

- email: `admin@gmail.com`
- password: `1234`
- role: `admin`
