import { z } from 'zod';

/**
 * Bulk Daily Timesheet Approval Schema
 * =====================================
 * Zod validation schema for bulk approving/rejecting multiple daily timesheets
 */

/**
 * Bulk Approval Schema
 * --------------------
 * Validates input for bulk approving or rejecting daily timesheets for an employee
 */
export const bulkApproveDailyTimesheetsSchema = z.object({
  timesheetUuids: z.array(z.string().uuid('Invalid timesheet UUID')),
  approvalStatus: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
  employeeName: z.string(),
  employeeEmail: z.string().email().optional(),
  employeeId: z.string(),
  timesheetDate: z.string(),
  taskIds: z.array(z.string()), // Array of task IDs (TASK001, TASK002, etc.)
  taskCount: z.number(),
  totalHours: z.string(),
});

/**
 * TypeScript Type
 * ---------------
 */
export type BulkApproveDailyTimesheetsInput = z.infer<typeof bulkApproveDailyTimesheetsSchema>;
