# Subject Marks Spreadsheet Upload

Use this template to upload marks for one subject at a time.

## Required columns

- `student_code`
- `mark`

## Optional columns

- `comment`

## Rules

- One row per student.
- `mark` must be numeric and between `0` and `100`.
- The sheet must match the current teacher class roster.
- All active students in the class must appear in the spreadsheet.

## Example

```csv
student_code,mark,comment
S001,78,Good performance
S002,84,Strong result
S003,92,Excellent
```

## Supported file types

- `.csv`
- `.xls`
- `.xlsx`
