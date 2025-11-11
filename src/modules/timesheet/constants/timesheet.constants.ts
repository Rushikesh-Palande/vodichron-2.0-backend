/**
 * Timesheet Module Constants
 * ==========================
 * 
 * Contains constants used across the timesheet module.
 * Following the same pattern as employee.constants.ts
 */

/**
 * Timesheet Approval Status
 * -------------------------
 * Status values for timesheet approval workflow
 */
export const TIMESHEET_APPROVAL_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SAVED: 'SAVED',
} as const;

export type TimesheetApprovalStatus = typeof TIMESHEET_APPROVAL_STATUS[keyof typeof TIMESHEET_APPROVAL_STATUS];

/**
 * Timesheet Status
 * ----------------
 * Overall status of the timesheet
 */
export const TIMESHEET_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SAVED: 'SAVED',
} as const;

export type TimesheetStatus = typeof TIMESHEET_STATUS[keyof typeof TIMESHEET_STATUS];

/**
 * Task Status
 * -----------
 * Status values for individual tasks within timesheets
 */
export const TASK_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

/**
 * Timesheet API Routes
 * --------------------
 * Base paths for timesheet-related endpoints
 */
export const TIMESHEET_ROUTES = {
  BASE: '/api/timesheets',
  
  // Daily timesheet routes
  DAILY: {
    CREATE: '/daily/create',
    GET_LIST: '/daily/:employeeId/list',
  },
  
  // Weekly timesheet routes
  WEEKLY: {
    CREATE: '/weekly/create',
    UPDATE: '/weekly/update',
    GET_LIST: '/weekly/:employeeId/list',
    GET_DETAIL: '/weekly/:id/detail',
    GET_REPORTEE_LIST: '/weekly/reportee/list',
    APPROVE: '/weekly/:timesheetId/approve',
    LOCK_TOGGLE: '/weekly/:timesheetId/lock/:taskCellId',
    CHECK_EXISTS: '/weekly/check-exists',
  },
} as const;

/**
 * Timesheet Data Limits
 * ---------------------
 * Pagination and data size limits
 */
export const TIMESHEET_LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_HOURS_PER_DAY: 24,
  MAX_HOURS_PER_WEEK: 168, // 24 * 7
  MIN_HOURS: 0,
  REQUEST_NUMBER_LENGTH: 6, // Random number length for request tracking
} as const;

/**
 * Authorized Roles for Timesheet Operations
 * -----------------------------------------
 * Role-based access control for different timesheet operations
 */
export const TIMESHEET_ROLES = {
  // Roles that can approve timesheets
  APPROVERS: ['super_user', 'hr', 'manager', 'director', 'customer'],
  
  // Roles that can view all timesheets
  ADMIN_VIEWERS: ['super_user', 'hr'],
  
  // Roles that can view reportee timesheets
  MANAGER_VIEWERS: ['manager', 'director'],
  
  // Roles that can lock/unlock tasks
  TASK_LOCKERS: ['super_user', 'hr', 'manager', 'director'],
} as const;

/**
 * Time Format Patterns
 * --------------------
 * Regular expressions for time validation
 */
export const TIME_FORMATS = {
  // HH:MM or H:MM format (e.g., "08:30" or "8:30")
  HOURS_MINUTES: /^[0-9]{1,2}:[0-5][0-9]$/,
  
  // Decimal hours format (e.g., "8.5")
  DECIMAL_HOURS: /^[0-9]+(\.[0-9]{1,2})?$/,
} as const;

/**
 * Email Notification Templates
 * ----------------------------
 * Template identifiers for timesheet-related emails
 */
export const TIMESHEET_EMAIL_TEMPLATES = {
  SUBMITTED_TO_EMPLOYEE: 'timesheet_submitted_employee',
  SUBMITTED_TO_MANAGER: 'timesheet_submitted_manager',
  APPROVED: 'timesheet_approved',
  REJECTED: 'timesheet_rejected',
} as const;

/**
 * Timesheet Validation Rules
 * --------------------------
 * Business rules for timesheet validation
 */
export const TIMESHEET_VALIDATION = {
  // Minimum task details required
  MIN_TASK_DETAILS: 1,
  
  // Total hours validation
  MIN_TOTAL_HOURS: 0,
  MAX_TOTAL_HOURS_DAILY: 24,
  MAX_TOTAL_HOURS_WEEKLY: 168,
  
  // Date validation
  ALLOW_FUTURE_DATES: false,
  MAX_BACKDATE_DAYS: 30, // Can submit timesheets up to 30 days back
} as const;
