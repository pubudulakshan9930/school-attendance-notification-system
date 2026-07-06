# Email Service Documentation - Term Marks Notifications

## Overview

The email service automatically sends formatted emails to parents when teachers save student term marks. The email includes comprehensive information about student performance including subject-wise marks, academic year, term, and class details.

## Features

- **Automated Email Sending**: Emails are sent in the background when term marks are saved
- **HTML Email Format**: Beautiful, responsive email template with professional styling
- **Subject-wise Breakdown**: Displays each subject with marks out of 100
- **Statistical Summary**: Shows total marks and a subject-wise breakdown
- **Error Handling**: Graceful error handling with notification logging
- **Best-Effort Delivery**: Email failures don't block the API response

## Environment Configuration

### Required Environment Variables

Add the following to your `.env` file:

```env
# Gmail SMTP Configuration (recommended)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_REPLY_TO=noreply@school.com

# Alternative: Custom SMTP Server
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
```

### Setting Up Gmail (Recommended)

1. **Enable 2-Factor Authentication** on your Google Account
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Google will generate a 16-character password
   - Use this password in `EMAIL_PASSWORD`

3. **Add to .env**:
   ```env
   EMAIL_USER=your-gmail-address@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

### Setting Up Other SMTP Providers

Examples for common providers:

**Outlook/Hotmail**:

```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

**SendGrid**:

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

**AWS SES**:

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-ses-smtp-username
EMAIL_PASSWORD=your-ses-smtp-password
```

## API Integration

### Endpoint

```
POST /api/teacher/term-marks/save
```

### Request Body

```json
{
  "term": 1,
  "student_id": "student-uuid-here",
  "marks": [
    {
      "subject_id": "subject-uuid-1",
      "mark": 85
    },
    {
      "subject_id": "subject-uuid-2",
      "mark": 92
    },
    {
      "subject_id": "subject-uuid-3",
      "mark": 78
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "message": "Term marks saved successfully.",
  "data": {
    "term": 1,
    "student_id": "student-uuid",
    "class_id": "class-uuid",
    "academic_year": 2024,
    "saved_count": 3,
    "submitted_by": "teacher-uuid"
  }
}
```

**Note**: Email sending happens asynchronously in the background. The API response is returned immediately regardless of email status.

## Email Content Details

### Email Information Included

The email template includes:

1. **Student Information**
   - Student Name
   - Student Code
   - Class (Grade & Section)
   - Academic Year
   - Term

- Class Teacher
- Class Rank
- Total Marks

2. **Subject-wise Marks**
   - Table with all subjects and marks
   - Mark out of 100 for each subject

3. **Performance Summary**

- Total marks across all subjects

4. **Other Details**
   - Class Teacher Name
   - Professional header and footer
   - School branding

## Database Schema

### Notification Logs Table

The `notification_logs` table tracks all sent/failed emails:

```sql
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('attendance', 'term_test')),
    medium TEXT NOT NULL CHECK (medium IN ('sms', 'email')),
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Query Recent Emails

```sql
-- Get all term test emails sent to a specific student
SELECT * FROM notification_logs
WHERE student_id = 'student-id'
  AND notification_type = 'term_test'
  AND medium = 'email'
ORDER BY sent_at DESC
LIMIT 10;

-- Get failed email notifications
SELECT * FROM notification_logs
WHERE medium = 'email'
  AND status LIKE 'failed:%'
ORDER BY sent_at DESC
LIMIT 20;
```

## Code Implementation Details

### emailService.js

The service provides two main functions:

1. **formatTermMarksEmail()** - Creates the HTML email content
2. **sendTermMarksEmail()** - Sends the email via SMTP

### teacherController.js

The `saveTermMarks()` function:

- Saves marks to database
- Triggers email sending asynchronously
- Logs success/failure to notification_logs
- Returns immediately without waiting for email

### teacherRepository.js

Enhanced `saveTermMarksForTeacher()` function now returns:

- `student` - Full student details including parent email
- `teacher` - Teacher information
- `subjectMarks` - Subject details with marks
- `class` - Class information

## Email Styling

The email uses:

- **Primary Color**: #10223d (professional dark blue)
- **Responsive Design**: Works on desktop, tablet, mobile
- **Professional Layout**: Header with branding, structured content sections
- **Clear Typography**: Organized information hierarchy
- **Visual Elements**: Color-coded sections, hover effects in table

## Error Handling

### Common Issues & Solutions

**Issue**: "Email configuration missing. Set EMAIL_USER and EMAIL_PASSWORD in .env"

- **Solution**: Ensure `EMAIL_USER` and `EMAIL_PASSWORD` are set in `.env`

**Issue**: "Invalid email recipient"

- **Solution**: Parent email must be valid (student registration must include parent email)

**Issue**: Emails not sending despite correct configuration

- **Solution**:
  - Check `.env` values are correct
  - Verify SMTP credentials (use `EMAIL_PORT=465` for secure connections)
  - Check firewall/network allows outbound SMTP
  - Review server logs for detailed error messages

**Issue**: Gmail authentication fails

- **Solution**: Use App Password instead of regular Gmail password

## Testing

### Manual Email Test

To test the email service manually (in development):

```javascript
// In a test file or console
const { sendTermMarksEmail } = require("./services/emailService");

await sendTermMarksEmail({
  recipient: "test@example.com",
  parentName: "John Doe",
  studentName: "Jane Doe",
  studentCode: "STU001",
  className: "Grade 10 Class A",
  academicYear: 2024,
  term: 1,
  classTeacher: "Mr. Smith",
  subjects: [
    { name: "Mathematics", mark: 85 },
    { name: "English", mark: 92 },
    { name: "Science", mark: 88 },
  ],
});
```

### Testing with Real Student Data

1. Register a student with parent email
2. Create subjects and assign to student
3. Call the term marks API
4. Check email inbox and notification_logs table

## Performance Considerations

- Email sending is **asynchronous** (non-blocking)
- Bulk mark submissions will trigger emails in parallel
- No timeout on email operations (may take several seconds)
- Failed emails don't block the API response

## Security Best Practices

1. **Never commit .env files** containing email credentials
2. **Use App Passwords** for Gmail instead of main account password
3. **Enable TLS/SSL** for SMTP connections when possible
4. **Restrict email service** to authenticated teachers only
5. **Log all notifications** for audit trail
6. **Validate recipient emails** before sending

## Monitoring & Troubleshooting

### Check Email Delivery Status

```sql
-- View all term test email attempts
SELECT
    s.full_name as student,
    u.full_name as teacher,
    nl.recipient,
    nl.status,
    nl.sent_at
FROM notification_logs nl
JOIN students s ON s.id = nl.student_id
JOIN users u ON u.id = s.parent_email  -- Note: join logic may vary
WHERE nl.notification_type = 'term_test'
  AND nl.medium = 'email'
ORDER BY nl.sent_at DESC;
```

### Enable Detailed Logging

Add to your server.js or environment:

```javascript
// Enable detailed nodemailer debugging
const nodemailer = require("nodemailer");
nodemailer.set("logger", true);
nodemailer.set("debug", true);
```

## Future Enhancements

Possible improvements:

- SMS notifications as fallback when email fails
- Email templates in database (customizable by school)
- Parent email preferences (digest emails, frequency)
- Email retry logic for failed deliveries
- Batch email sending for efficiency
- Email read tracking/analytics
- Support for attachments (report cards, etc.)

## Support

For issues or questions:

1. Check the error logs in `.env` configuration
2. Verify email credentials and SMTP settings
3. Review notification_logs for delivery status
4. Check email provider's account security settings
