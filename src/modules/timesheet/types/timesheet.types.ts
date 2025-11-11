/**
 * Timesheet Module Types
 * ======================
 * 
 * TypeScript interfaces and types for the timesheet module.
 * Follows the same pattern as employee.types.ts
 * 
 * Based on:
 * - Old vodichron backend types (EmployeeTimesheet, WeeklyTimesheet)
 * - New timesheet model fields (15 new task tracking fields)
 */

import { TimesheetApprovalStatus, TimesheetStatus, TaskStatus } from '../constants/timesheet.constants';

/**
 * Application User Role
 * ---------------------
 * User roles for authorization checks
 * (Re-exported from employee module for consistency)
 */
export enum ApplicationUserRole {
  superUser = 'super_user',
  admin = 'admin',
  hr = 'hr',
  manager = 'manager',
  director = 'director',
  employee = 'employee',
  customer = 'customer',
}

/**
 * User Context Interface
 * ----------------------
 * Represents the authenticated user making the request
 */
export interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

// ============================================================================
// DAILY TIMESHEET TYPES
// ============================================================================

/**
 * Task Detail for Daily Timesheet
 * --------------------------------
 * Represents a single task entry in a daily timesheet
 */
export interface DailyTaskDetail {
  // Legacy field (JSON containing task info)
  task?: string;
  hours?: string | number;
  
  // New task tracking fields
  taskId?: string | null;
  customer?: string | null;
  project?: string | null;
  manager?: string | null;
  taskBrief?: string | null;
  taskStatus?: TaskStatus | null;
  responsible?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  completionPercentage?: number | null;
  remarks?: string | null;
  reasonForDelay?: string | null;
  taskHours?: string | null;
}

/**
 * Daily Timesheet (Database Record)
 * ----------------------------------
 * Represents a daily timesheet record from the database
 */
export interface DailyTimesheet {
  uuid: string;
  employeeId: string;
  requestNumber: number;
  timesheetDate: string;
  taskDetails: DailyTaskDetail[] | string; // Can be JSON string from DB
  totalHours: number;
  approvalStatus: TimesheetApprovalStatus | null;
  approverId: string | null;
  approverRole: string | null;
  approvalDate: string | null;
  approverComments: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string;
  
  // Joined fields (from SQL queries)
  approverDetail?: string;
  employeeName?: string;
}

/**
| * Create Daily Timesheet Input
| * -----------------------------
| * Input data for creating a daily timesheet
| */
export interface CreateDailyTimesheetInput {
  employeeId: string;
  timesheetDate: string;
  taskDetails: DailyTaskDetail[];
  totalHours: number;
  
  // Optional new task tracking fields
  taskId?: string | null;
  customer?: string | null;
  project?: string | null;
  manager?: string | null;
  taskBrief?: string | null;
  taskStatus?: TaskStatus | null;
  responsible?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  completionPercentage?: number | null;
  remarks?: string | null;
  reasonForDelay?: string | null;
  taskHours?: string | null;
}

/**
 * Daily Timesheet Filters
 * ------------------------
 * Filter options for querying daily timesheets
 */
export interface DailyTimesheetFilters {
  month?: string; // Format: "01" to "12"
  year?: string;  // Format: "2024"
  approvalStatus?: TimesheetApprovalStatus;
}

/**
 * Daily Timesheet List Request
 * -----------------------------
 * Request payload for getting paginated daily timesheets
 */
export interface DailyTimesheetListRequest {
  pagination: {
    page?: number;
    pageLimit?: number;
  };
  filters?: DailyTimesheetFilters;
}

// ============================================================================
// WEEKLY TIMESHEET TYPES
// ============================================================================

/**
 * Weekly Task Cell
 * ----------------
 * Represents a single cell in the weekly timesheet grid
 * Each cell has a UUID for locking mechanism
 */
export interface WeeklyTaskCell {
  uuid: string;
  value: string | number; // Hours worked
  isLocked: boolean;      // Locked after approval
}

/**
 * Weekly Task Entry (Row in Weekly Grid)
 * ---------------------------------------
 * Represents one row in the weekly timesheet
 * Keys: 'task', 'rowTotal', 'day0' through 'day6'
 */
export interface WeeklyTaskEntry {
  task: {
    uuid: string;
    value: string; // Task description
    isLocked: boolean;
  };
  rowTotal?: {
    uuid: string;
    value: string | number;
    isLocked: boolean;
  };
  [key: string]: WeeklyTaskCell | undefined; // day0, day1, day2, etc.
}

/**
 * Weekly Timesheet (Database Record)
 * -----------------------------------
 * Represents a weekly timesheet record from the database
 */
export interface WeeklyTimesheet {
  uuid: string;
  employeeId: string;
  requestNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  taskDetails: WeeklyTaskEntry[] | string; // Can be JSON string from DB
  totalHours: number;
  approvalStatus: TimesheetApprovalStatus | null;
  approverId: string | null;
  approverRole: string | null;
  approvalDate: string | null;
  approverComments: string | null;
  timeSheetStatus: TimesheetStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string;
  
  // New task tracking fields
  taskId?: string | null;
  customer?: string | null;
  project?: string | null;
  manager?: string | null;
  taskBrief?: string | null;
  taskStatus?: TaskStatus | null;
  responsible?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  completionPercentage?: number | null;
  remarks?: string | null;
  reasonForDelay?: string | null;
  taskHours?: string | null;
  
  // Joined fields (from SQL queries)
  approverDetail?: string;
  employeeName?: string;
}

/**
 * Create Weekly Timesheet Input
 * ------------------------------
 * Input data for creating a weekly timesheet
 */
export interface CreateWeeklyTimesheetInput {
  employeeId: string;
  weekStartDate: string;
  weekEndDate: string;
  taskDetails: WeeklyTaskEntry[];
  totalHours: number;
  timeSheetStatus: TimesheetStatus;
  
  // Optional new task tracking fields
  taskId?: string | null;
  customer?: string | null;
  project?: string | null;
  manager?: string | null;
  taskBrief?: string | null;
  taskStatus?: TaskStatus | null;
  responsible?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  completionPercentage?: number | null;
  remarks?: string | null;
  reasonForDelay?: string | null;
  taskHours?: string | null;
}

/**
 * Update Weekly Timesheet Input
 * ------------------------------
 * Input data for updating an existing weekly timesheet
 */
export interface UpdateWeeklyTimesheetInput extends CreateWeeklyTimesheetInput {
  // Inherits all fields from CreateWeeklyTimesheetInput
}

/**
 * Weekly Timesheet Filters
 * -------------------------
 * Filter options for querying weekly timesheets
 */
export interface WeeklyTimesheetFilters {
  month?: string; // Format: "01" to "12"
  year?: string;  // Format: "2024"
  approvalStatus?: TimesheetApprovalStatus;
}

/**
 * Weekly Timesheet List Request
 * ------------------------------
 * Request payload for getting paginated weekly timesheets
 */
export interface WeeklyTimesheetListRequest {
  pagination: {
    page?: number;
    pageLimit?: number;
  };
  filters?: WeeklyTimesheetFilters;
}

/**
 * Approve Timesheet Input
 * ------------------------
 * Input data for approving/rejecting a timesheet
 */
export interface ApproveTimesheetInput {
  approvalStatus: 'APPROVED' | 'REJECTED';
  comment?: string;
}

/**
 * Check Weekly Timesheet Exists Input
 * ------------------------------------
 * Input for checking if a weekly timesheet already exists
 */
export interface CheckWeeklyTimesheetExistsInput {
  weekStartDate: string;
  employeeId: string;
}

/**
 * Check Weekly Timesheet Exists Response
 * ---------------------------------------
 * Response for timesheet existence check
 */
export interface CheckWeeklyTimesheetExistsResponse {
  requestNumber: number | null;
  timesheetId: string | null;
}

/**
 * Employee with Manager Details
 * ------------------------------
 * Employee record with manager/director contact info
 * Used for email notifications
 */
export interface EmployeeWithManagerDetails {
  uuid: string;
  name: string;
  officialEmailId: string;
  managerDetail?: string | null; // Format: "Name <email@example.com>"
  directorDetail?: string | null; // Format: "Name <email@example.com>"
}

/**
 * Customer Details for Timesheet
 * -------------------------------
 * Customer information for timesheet notifications
 */
export interface CustomerDetails {
  customerName: string;
  email: string;
  customerApprover: boolean;
}
