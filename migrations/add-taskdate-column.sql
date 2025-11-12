-- Migration: Add taskDate column to employee_timesheets table
-- Purpose: Store the actual date when work was performed (separate from timesheetDate which is submission date)
-- Date: 2025-11-12

-- Add taskDate column after timesheetDate
ALTER TABLE employee_timesheets 
ADD COLUMN taskDate DATE NULL 
COMMENT 'Actual date when work was performed'
AFTER plannedStartDate;

-- Optional: Set taskDate to timesheetDate for existing records (data migration)
UPDATE employee_timesheets 
SET taskDate = timesheetDate 
WHERE taskDate IS NULL;

-- Add index for better query performance
CREATE INDEX idx_timesheets_task_date ON employee_timesheets(taskDate);

-- Verify the column was added
DESCRIBE employee_timesheets;
