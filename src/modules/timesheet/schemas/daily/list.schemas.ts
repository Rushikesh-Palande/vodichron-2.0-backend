import { z } from 'zod';
import { TIMESHEET_APPROVAL_STATUS } from '../../constants/timesheet.constants';

/**
 * Daily Timesheet List Schemas
 * =============================
 * Validation schemas for listing daily timesheets with filters and pagination
 * 
 * Based on old vodichron employeeTimesheetController.ts
 * Mirrors the structure of weekly list schemas
 */

/**
 * Daily Timesheet Filters Schema
 * -------------------------------
 * Optional filters for querying daily timesheets
 */
export const dailyTimesheetFiltersSchema = z.object({
  month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Month must be 01-12').optional(),
  year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  approvalStatus: z.enum([
    TIMESHEET_APPROVAL_STATUS.REQUESTED,
    TIMESHEET_APPROVAL_STATUS.APPROVED,
    TIMESHEET_APPROVAL_STATUS.REJECTED,
    TIMESHEET_APPROVAL_STATUS.SAVED,
  ] as const).optional(),
}).optional();

/**
 * Pagination Schema
 * -----------------
 * Pagination parameters for list queries
 */
export const paginationSchema = z.object({
  page: z.number().int().min(0).optional(),
  pageLimit: z.number().int().min(1).max(100).optional(),
});

/**
 * Daily Timesheet List Request Schema
 * ------------------------------------
 * Validates request for getting paginated daily timesheets
 */
export const dailyTimesheetListRequestSchema = z.object({
  pagination: paginationSchema,
  filters: dailyTimesheetFiltersSchema,
});

/**
 * List Daily Timesheets Schema
 * ----------------------------
 * Validates request for listing an employee's daily timesheets
 */
export const listDailyTimesheetsSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  pagination: paginationSchema.optional(),
  filters: dailyTimesheetFiltersSchema,
});

/**
 * Approve Daily Timesheet Schema
 * -------------------------------
 * Validates input for approving/rejecting a daily timesheet
 */
export const approveDailyTimesheetSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED'] as const),
  comment: z.string().max(500, 'Comment must be at most 500 characters').optional(),
});

/**
 * Check Daily Timesheet Exists Schema
 * ------------------------------------
 * Validates input for checking if a daily timesheet exists
 */
export const checkDailyTimesheetExistsSchema = z.object({
  timesheetDate: z.string()
    .min(1, 'Timesheet date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Timesheet date must be in YYYY-MM-DD format'),
  employeeId: z.string().uuid('Invalid employee ID'),
});

/**
 * TypeScript Types
 * ----------------
 */
export type DailyTimesheetFilters = z.infer<typeof dailyTimesheetFiltersSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type DailyTimesheetListRequest = z.infer<typeof dailyTimesheetListRequestSchema>;
export type ApproveDailyTimesheetInput = z.infer<typeof approveDailyTimesheetSchema>;
export type CheckDailyTimesheetExistsInput = z.infer<typeof checkDailyTimesheetExistsSchema>;
