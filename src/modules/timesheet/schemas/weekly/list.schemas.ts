import { z } from 'zod';
import { TIMESHEET_APPROVAL_STATUS } from '../../constants/timesheet.constants';

/**
 * Weekly Timesheet List Schemas
 * ==============================
 * Validation schemas for listing weekly timesheets with filters and pagination
 */

/**
 * Weekly Timesheet Filters Schema
 * --------------------------------
 * Optional filters for querying timesheets
 */
export const weeklyTimesheetFiltersSchema = z.object({
  month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Month must be 01-12').optional(),
  year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number').optional(),
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
 * Weekly Timesheet List Request Schema
 * -------------------------------------
 * Validates request for getting paginated weekly timesheets
 */
export const weeklyTimesheetListRequestSchema = z.object({
  pagination: paginationSchema,
  filters: weeklyTimesheetFiltersSchema,
});

/**
 * Approve Timesheet Schema
 * -------------------------
 * Validates input for approving/rejecting a timesheet
 */
export const approveTimesheetSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED'] as const),
  comment: z.string().max(500, 'Comment must be at most 500 characters').optional(),
});

/**
 * Check Timesheet Exists Schema
 * ------------------------------
 * Validates input for checking if a weekly timesheet exists
 */
export const checkWeeklyTimesheetExistsSchema = z.object({
  weekStartDate: z.string()
    .min(1, 'Week start date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start date must be in YYYY-MM-DD format'),
  employeeId: z.string().min(1, 'Employee ID is required'), // Accept both UUID and human-readable IDs
});

/**
 * List Weekly Timesheets Schema
 * ==============================
 * Validates request for listing an employee's weekly timesheets
 */
export const listWeeklyTimesheetsSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'), // Accept both UUID and human-readable IDs
  pagination: paginationSchema.optional(),
  filters: weeklyTimesheetFiltersSchema,
});

/**
 * Get Weekly Timesheet Detail Schema
 * ===================================
 * Validates request for getting single timesheet details
 */
export const getWeeklyTimesheetDetailSchema = z.object({
  timesheetId: z.string().uuid('Invalid timesheet ID'),
  employeeId: z.string().min(1, 'Employee ID is required'), // Accept both UUID and human-readable IDs
});

/**
 * List Reportee Weekly Timesheets Schema
 * =======================================
 * Validates request for managers/HR to list reportee timesheets
 */
export const listReporteeWeeklyTimesheetsSchema = z.object({
  pagination: paginationSchema.optional(),
  filters: weeklyTimesheetFiltersSchema,
});

/**
 * Approve Weekly Timesheet Schema
 * ================================
 * Validates request for approving/rejecting weekly timesheets
 */
export const approveWeeklyTimesheetSchema = z.object({
  timesheetId: z.string().uuid('Invalid timesheet ID'),
  approvalStatus: z.enum(['APPROVED', 'REJECTED'] as const),
  comment: z.string().max(500, 'Comment must be at most 500 characters').optional(),
  employeeDetails: z.object({
    uuid: z.string().uuid('Invalid employee UUID'),
    name: z.string().min(1, 'Employee name is required'),
    officialEmailId: z.string().email('Invalid email address'),
  }),
});

/**
 * TypeScript Types
 * ----------------
 */
export type WeeklyTimesheetFilters = z.infer<typeof weeklyTimesheetFiltersSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type WeeklyTimesheetListRequest = z.infer<typeof weeklyTimesheetListRequestSchema>;
export type ApproveTimesheetInput = z.infer<typeof approveTimesheetSchema>;
export type CheckWeeklyTimesheetExistsInput = z.infer<typeof checkWeeklyTimesheetExistsSchema>;
