import { z } from 'zod';
import { TASK_STATUS, TIME_FORMATS } from '../../constants/timesheet.constants';
import { dateTransformSchema } from '../../helpers/transform-date-to-yyyy-mm-dd';

/**
 * Daily Timesheet Schemas
 * ========================
 * Zod validation schemas for daily timesheet operations
 * 
 * Based on old vodichron EmployeeInsertTimesheet type
 * Updated with new task tracking fields from updated models
 */

/**
 * Daily Task Detail Schema
 * -------------------------
 * Validates a single task entry in a daily timesheet
 */
export const dailyTaskDetailSchema = z.object({
  // Legacy fields
  task: z.string().min(1, 'Task description is required').optional(),
  hours: z.union([z.string(), z.number()]).optional(),
  
  // New task tracking fields (all optional)
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
  
  taskDate: dateTransformSchema.nullable().optional(),
  
  plannedStartDate: dateTransformSchema.nullable().optional(),
  plannedEndDate: dateTransformSchema.nullable().optional(),
  actualStartDate: dateTransformSchema.nullable().optional(),
  actualEndDate: dateTransformSchema.nullable().optional(),
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
| * Create Daily Timesheet Schema
| * ------------------------------
| * Validates input for creating a daily timesheet
| */
export const createDailyTimesheetSchema = z.object({
  // ============================================================================
  // REQUIRED FIELDS
  // ============================================================================
  
  employeeId: z.string().min(1, 'Employee ID is required'), // Accept both UUID and human-readable IDs (e.g., '0000001', 'EMP1')
  
  timesheetDate: z.string()
    .min(1, 'Timesheet date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Timesheet date must be in YYYY-MM-DD format'),
  
  taskDetails: z.array(dailyTaskDetailSchema)
    .min(1, 'At least one task is required'),
  
  totalHours: z.number()
    .min(0, 'Total hours cannot be negative')
    .max(24, 'Total hours cannot exceed 24 hours per day'),
  
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
  
  plannedStartDate: dateTransformSchema.nullable().optional(),
  
  plannedEndDate: dateTransformSchema.nullable().optional(),
  
  actualStartDate: dateTransformSchema.nullable().optional(),
  
  actualEndDate: dateTransformSchema.nullable().optional(),
  
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
| * TypeScript Types
| * ----------------
| */
export type DailyTaskDetail = z.infer<typeof dailyTaskDetailSchema>;
export type CreateDailyTimesheetInput = z.infer<typeof createDailyTimesheetSchema>;
