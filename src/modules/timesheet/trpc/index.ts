import { router } from '../../../trpc/trpc';

// Daily Timesheet Routers
import { createDailyTimesheetProcedure } from './routers/daily/create-daily-timesheet.router';
import { listDailyTimesheetsProcedure } from './routers/daily/list-daily-timesheets.router';
import { updateDailyTimesheetProcedure } from './routers/daily/update-daily-timesheet.router';
import { updateDailyTimesheetApprovalProcedure } from './routers/daily/update-daily-timesheet-approval.router';

// Weekly Timesheet Routers
import { createWeeklyTimesheetProcedure } from './routers/weekly/create-weekly-timesheet.router';
import { listWeeklyTimesheetsProcedure } from './routers/weekly/list-weekly-timesheets.router';
import { getWeeklyTimesheetDetailProcedure } from './routers/weekly/get-weekly-timesheet-detail.router';
import { listReporteeWeeklyTimesheetsProcedure } from './routers/weekly/list-reportee-weekly-timesheets.router';
import { approveWeeklyTimesheetProcedure } from './routers/weekly/approve-weekly-timesheet.router';

// Utility Routers
import { getNextTaskIdProcedure } from './routers/get-next-task-id.router';

/**
 * Vodichron HRMS Timesheet tRPC Router
 * =====================================
 * Handles timesheet-related operations for the Vodichron HRMS system using tRPC.
 * 
 * Features:
 * - Type-safe API with automatic validation
 * - Role-based access control (RBAC)
 * - Comprehensive logging and audit trail
 * - Performance monitoring
 * - Email notifications for submissions and approvals
 * 
 * Daily Timesheet Procedures:
 * - createDailyTimesheet: Create a new daily timesheet
 * - listDailyTimesheets: List employee's daily timesheets (paginated)
 * - updateDailyTimesheet: Update daily timesheet (same day only for employees)
 * - updateDailyTimesheetApproval: Approve/reject daily timesheet
 * 
 * Weekly Timesheet Procedures:
 * - createWeeklyTimesheet: Create a new weekly timesheet with email notifications
 * - listWeeklyTimesheets: List employee's weekly timesheets (paginated)
 * - getWeeklyTimesheetDetail: Get single weekly timesheet details
 * - listReporteeWeeklyTimesheets: List reportee timesheets (managers/HR only)
 * - approveWeeklyTimesheet: Approve/reject weekly timesheet with task unlocking
 */
export const timesheetRouter = router({
  // ============================================================================
  // DAILY TIMESHEET OPERATIONS
  // ============================================================================
  
  /**
   * Create Daily Timesheet
   * Authorization: Employees (own), Admin/HR/Super (any)
   */
  createDailyTimesheet: createDailyTimesheetProcedure,
  
  /**
   * List Daily Timesheets
   * Authorization: Employees (own), Admin/HR/Super (any)
   */
  listDailyTimesheets: listDailyTimesheetsProcedure,
  
  /**
   * Update Daily Timesheet
   * Authorization: Employees (own, same day only), Admin/HR/Super (any)
   */
  updateDailyTimesheet: updateDailyTimesheetProcedure,
  
  /**
   * Update Daily Timesheet Approval Status
   * Authorization: Admin/HR/Super/Manager/Director/Customer
   */
  updateDailyTimesheetApproval: updateDailyTimesheetApprovalProcedure,

  // ============================================================================
  // WEEKLY TIMESHEET OPERATIONS
  // ============================================================================
  
  /**
   * Create Weekly Timesheet
   * Authorization: Employees (own), Admin/HR/Super (any)
   * Sends email notifications to managers/directors/customers
   */
  createWeeklyTimesheet: createWeeklyTimesheetProcedure,
  
  /**
   * List Weekly Timesheets
   * Authorization: Employees (own), Admin/HR/Super/Manager/Director (any)
   */
  listWeeklyTimesheets: listWeeklyTimesheetsProcedure,
  
  /**
   * Get Weekly Timesheet Detail
   * Authorization: Employees (own), Admin/HR/Super/Manager/Director (any)
   */
  getWeeklyTimesheetDetail: getWeeklyTimesheetDetailProcedure,
  
  /**
   * List Reportee Weekly Timesheets
   * Authorization: HR/Super (all), Manager/Director (reportees only)
   */
  listReporteeWeeklyTimesheets: listReporteeWeeklyTimesheetsProcedure,
  
  /**
   * Approve Weekly Timesheet
   * Authorization: Admin/HR/Super/Manager/Director/Customer
   * Unlocks tasks on rejection, sends approval/rejection emails
   */
  approveWeeklyTimesheet: approveWeeklyTimesheetProcedure,

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================
  
  /**
   * Get Next Task ID
   * Authorization: Employees (own), Admin/HR/Super (any)
   * Returns next available task ID for pre-filling in UI
   */
  getNextTaskId: getNextTaskIdProcedure,
});
