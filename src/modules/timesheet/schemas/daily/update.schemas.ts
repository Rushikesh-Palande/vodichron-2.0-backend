/**
 * Daily Timesheet Update Schemas
 * ===============================
 * Zod validation schemas for updating daily timesheets
 * 
 * Validation Rules:
 * - Employee can only update their own timesheets
 * - Can only update on the same day (timesheetDate must be today)
 * - Can only update if status is REQUESTED or REJECTED
 */

import { z } from 'zod';

/**
 * Update Daily Timesheet Schema
 * ------------------------------
 * Validates input for updating daily timesheet task details
 * 
 * Note: timesheetDate validation (must be today) is done in service layer
 * because Zod can't access "today's date" dynamically at schema definition time
 */
export const updateDailyTimesheetSchema = z.object({
  // Timesheet identifier
  timesheetUuid: z.string().uuid('Invalid timesheet UUID'),
  
  // Required task fields
  taskId: z.string().min(1, 'Task ID is required'),
  customer: z.string().min(1, 'Customer is required'),
  project: z.string().min(1, 'Project is required'),
  taskBrief: z.string().min(1, 'Task brief is required'),
  taskStatus: z.enum(['Not Started', 'In Progress', 'Completed', 'On Hold'], {
    message: 'Invalid task status'
  }),
  responsible: z.string().min(1, 'Responsible person is required'),
  totalHours: z.number().min(0.1, 'Total hours must be at least 0.1').max(24, 'Total hours cannot exceed 24'),
  
  // Optional task fields
  manager: z.string().optional().nullable(),
  plannedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Planned start date must be in YYYY-MM-DD format').optional().nullable(),
  plannedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Planned end date must be in YYYY-MM-DD format').optional().nullable(),
  actualStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Actual start date must be in YYYY-MM-DD format').optional().nullable(),
  actualEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Actual end date must be in YYYY-MM-DD format').optional().nullable(),
  completionPercentage: z.number().min(0).max(100).optional().nullable(),
  remarks: z.string().optional().nullable(),
  reasonForDelay: z.string().optional().nullable(),
  taskHours: z.string().optional().nullable(),
});

export type UpdateDailyTimesheetInput = z.infer<typeof updateDailyTimesheetSchema>;
