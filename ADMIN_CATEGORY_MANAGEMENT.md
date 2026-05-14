# Admin Panel - Category Management Guide

## Overview

The admin panel now allows complete management of subject categories for each grade. You can:

- ✅ Remove entire subject categories (e.g., remove Category 1)
- ✅ Create new subject categories in empty slots
- ✅ Modify existing categories
- ✅ Preserve existing student registrations

---

## Managing Subject Categories

### **Method 1: Quick Remove (Display Mode)**

1. Open Admin Panel → Subject Plans tab
2. Click "Refresh Subject Plans" button
3. Find the grade card you want to modify
4. In display mode, locate the category you want to remove (e.g., "C1: ICT, Health...")
5. Click the **✕** button next to the category name
6. Confirm removal when prompted
7. Category is immediately removed from teacher registration

**Result**: Teachers will no longer see this category in their student registration forms. Existing student selections are preserved.

---

### **Method 2: Full Edit Mode**

1. Open Admin Panel → Subject Plans tab
2. Click "Refresh Subject Plans" button
3. Find the grade card
4. Click **"✏️ Edit"** button
5. You'll see 6 editable fields:
   - Fixed Subjects (Mandatory)
   - Language Options (Choose One)
   - Religion Options (Choose One)
   - Elective Category 1
   - Elective Category 2
   - Elective Category 3

---

## Creating a New Category

### **Add to Empty Slot**

1. Click **"✏️ Edit"** on a grade card
2. Click **"➕ Add Empty Category"** button at top
3. The first empty category field will be highlighted
4. Enter your desired subjects (comma-separated)
   - Example: `Music, Arts, Dancing`
5. Click **"Save"** button
6. New category appears in teacher registration form

---

## Removing a Category

### **Option A: Direct Remove (Fastest)**

1. In display mode, find the category ✕ button
2. Click it and confirm

### **Option B: Edit Mode Clear**

1. Click **"✏️ Edit"**
2. Find the category field you want to clear
3. Click **"✕ Clear"** button below the field
4. Field becomes empty
5. Click **"Save"**

---

## Example Scenarios

### Scenario 1: Remove Category 1

**Current State**:

- C1: ICT, Health and Physical Education
- C2: Music, Arts
- C3: Geography, Tamil

**Action**: Click ✕ next to C1

**Result**:

- C1: (removed)
- C2: Music, Arts (still available)
- C3: Geography, Tamil (still available)

Teachers will now only see 2 elective categories.

---

### Scenario 2: Add New Category to Empty Slot

**Current State**:

- C1: ICT, Health and Physical Education
- C2: (empty - available)
- C3: (empty - available)

**Action**:

1. Click ✏️ Edit
2. Click ➕ Add Empty Category
3. Type: `Robotics, Coding, Digital Design`
4. Click Save

**Result**:

- C1: ICT, Health and Physical Education
- C2: Robotics, Coding, Digital Design (NEW)
- C3: (still empty)

---

## Important Notes

### ✅ What Happens When You Change Categories:

1. **Teachers**: Automatically see updated category list in registration forms
2. **Existing Students**:
   - Subject selections remain unchanged
   - If a category is removed, their selection is preserved in the database
   - They can still view their registered subjects
3. **New Students**: Only see currently available categories

### ⚠️ Limitations:

- System currently supports exactly **3 elective categories** per grade
- Categories are managed at grade level (same for all sections in a grade)
- Comma-separated values: Enter multiple subjects separated by commas
- Spaces around commas are automatically trimmed

### 📊 Category Fields:

| Field          | Type               | Purpose                                     |
| -------------- | ------------------ | ------------------------------------------- |
| Fixed Subjects | Mandatory          | Given to all students (Math, English, etc.) |
| Language       | Required Choice    | Student picks one (Sinhala, Tamil, etc.)    |
| Religion       | Required Choice    | Student picks one (Buddhism, Hindu, etc.)   |
| Category 1-3   | Optional Electives | Student picks one per category (or none)    |

---

## Teacher Panel Auto-Update

When you modify categories, teachers see changes immediately:

1. **Before**: 3 electives available
2. **You remove Category 1**
3. **After**: Teachers' forms now show only 2 electives
4. No manual refresh needed - automatic update

---

## Tips & Best Practices

✅ **DO:**

- Use clear, descriptive names for categories
- Use comma-separated values for multiple subjects
- Backup important category configurations
- Test in teacher panel after making changes

❌ **DON'T:**

- Leave category fields with only commas (e.g., ",,")
- Use special characters except hyphens and apostrophes
- Delete all categories at once

---

## Troubleshooting

**Q: I removed a category but teachers still see it**

- Answer: Refresh the page or click "Refresh Subject Plans" button again

**Q: Can I have more than 3 categories?**

- Answer: Current system supports 3 electives. To add more would require database migration.

**Q: Will student registrations be deleted?**

- Answer: No. Removing categories only affects new registrations. Existing registrations are preserved.

**Q: Can I undo a change?**

- Answer: Yes! Click ✏️ Edit, then ❌ Cancel to discard changes without saving

---

## Support

For issues or questions about category management, check:

1. Subject Plans tab in Admin Panel
2. Teacher registration forms to verify changes
3. Look for error messages in the admin interface
