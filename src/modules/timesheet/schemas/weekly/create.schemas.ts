import { z } from 'zod';
import { TIMESHEET_STATUS, TASK_STATUS, TIME_FORMATS } from '../../constants/timesheet.constants';

/**
 * Weekly Timesheet Schemas
 * ========================
 * Zod validation schemas for weekly timesheet operations
 * 
 * Based on old vodichron WeeklyTimesheetInsert type
 * Updated with new task tracking fields from updated models
 */

/**
 * Weekly Task Cell Schema
 * -----------------------
 * Validates a single cell in the weekly timesheet grid
 */
export const weeklyTaskCellSchema = z.object({
  uuid: z.string().uuid('Invalid cell UUID'),
  value: z.union([z.string(), z.number()]),
  isLocked: z.boolean(),
});

/**
 * Weekly Task Entry Schema
 * -------------------------
 * Validates one row in the weekly timesheet
 * Contains task description and hours for each day
 */
export const weeklyTaskEntrySchema = z.object({
  task: z.object({
    uuid: z.string().uuid('Invalid task UUID'),
    value: z.string().min(1, 'Task description is required'),
    isLocked: z.boolean(),
  }),
  rowTotal: z.object({
    uuid: z.string().uuid('Invalid rowTotal UUID'),
    value: z.union([z.string(), z.number()]),
    isLocked: z.boolean(),
  }).optional(),
}).catchall(weeklyTaskCellSchema); // Allow day0, day1, day2, etc.

/**
 * Create Weekly Timesheet Schema
 * -------------------------------
 * Validates input for creating a new weekly timesheet
 */
export const createWeeklyTimesheetSchema = z.object({
  // ============================================================================
  // REQUIRED FIELDS
  // ============================================================================
  
  employeeId: z.string().uuid('Invalid employee ID'),
  
  weekStartDate: z.string().min(1, 'Week start date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start date must be in YYYY-MM-DD format'),
  
  weekEndDate: z.string().min(1, 'Week end date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Week end date must be in YYYY-MM-DD format'),
  
  taskDetails: z.array(weeklyTaskEntrySchema)
    .min(1, 'At least one task is required'),
  
  totalHours: z.number()
    .min(0, 'Total hours cannot be negative')
    .max(168, 'Total hours cannot exceed 168 (24 hours × 7 days)'),
  
  timeSheetStatus: z.enum([
    TIMESHEET_STATUS.REQUESTED,
    TIMESHEET_STATUS.APPROVED,
    TIMESHEET_STATUS.REJECTED,
    TIMESHEET_STATUS.SAVED,
  ] as const),
  
  // ============================================================================
  // NEW TASK TRACKING FIELDS (Optional)
  // ============================================================================
  
  taskId: z.string().max(50, 'Task ID must be at most 50 characters').nullable().optional(),
  
  customer: z.string().max(100, 'Customer name must be at most 100 characters').nullable().optional(),
  
  project: z.string().max(100, 'Project name must be at most 100 characters').nullable().optional(),
  
  manager: z.string().max(100, 'Manager name must be at most 100 characters').nullable().optional(),
  
  taskBrief: z.string().nullable().optional(),
  
  taskStatus: z.enum([
    TASK_STATUS.NOT_STARTED,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.COMPLETED,
    TASK_STATUS.ON_HOLD,
  ] as const).nullable().optional(),
  
  responsible: z.string().max(100, 'Responsible person name must be at most 100 characters').nullable().optional(),
  
  plannedStartDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Planned start date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
  
  plannedEndDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Planned end date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
  
  actualStartDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Actual start date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
  
  actualEndDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Actual end date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
  
  completionPercentage: z.number()
    .min(0, 'Completion percentage cannot be negative')
    .max(100, 'Completion percentage cannot exceed 100')
    .nullable()
    .optional(),
  
  remarks: z.string().nullable().optional(),
  
  reasonForDelay: z.string().nullable().optional(),
  
  taskHours: z.string()
    .regex(TIME_FORMATS.HOURS_MINUTES, 'Task hours must be in HH:MM format')
    .nullable()
    .optional(),
});

/**
 * Update Weekly Timesheet Schema
 * -------------------------------
 * Same as create schema (reusing the same validation)
 */
export const updateWeeklyTimesheetSchema = createWeeklyTimesheetSchema;

/**
 * Employee Details Schema
 * =======================
 * Schema for employee information needed for email notifications
 */
export const employeeDetailsSchema = z.object({
  uuid: z.string().uuid('Invalid employee UUID'),
  name: z.string().min(1, 'Employee name is required'),
  officialEmailId: z.string().email('Invalid email address'),
  managerDetail: z.string().optional(),
  directorDetail: z.string().optional(),
});

/**
 * Create Weekly Timesheet Input Schema (for tRPC)
 * ================================================
 * Combined schema with timesheet data and employee details
 */
export const createWeeklyTimesheetInputSchema = z.object({
  timesheetData: createWeeklyTimesheetSchema,
  employeeDetails: employeeDetailsSchema,
});

/**
 * TypeScript Types
 * ----------------
 * Inferred from Zod schemas for type safety
 */
export type CreateWeeklyTimesheetInput = z.infer<typeof createWeeklyTimesheetSchema>;
export type UpdateWeeklyTimesheetInput = z.infer<typeof updateWeeklyTimesheetSchema>;
export type WeeklyTaskEntry = z.infer<typeof weeklyTaskEntrySchema>;
export type WeeklyTaskCell = z.infer<typeof weeklyTaskCellSchema>;
