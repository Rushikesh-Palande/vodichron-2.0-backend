import { z } from 'zod';

/**
 * Update Daily Timesheet Approval Schema
 * =======================================
 * Zod validation schema for approving/rejecting daily timesheets
 */

/**
 * Update Daily Timesheet Approval Schema
 * ---------------------------------------
 * Validates input for approving or rejecting a daily timesheet
 */
export const updateDailyTimesheetApprovalSchema = z.object({
  timesheetUuid: z.string().uuid('Invalid timesheet UUID'),
  approvalStatus: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
  employeeName: z.string(),
  employeeEmail: z.string().email().optional(),
  requestNumber: z.string(),
  totalHours: z.string(),
  timesheetDate: z.string()
});

/**
 * TypeScript Type
 * ---------------
 */
export type UpdateDailyTimesheetApprovalInput = z.infer<typeof updateDailyTimesheetApprovalSchema>;
