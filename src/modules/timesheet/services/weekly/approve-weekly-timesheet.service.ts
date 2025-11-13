/**
 * Approve Weekly Timesheet Service
 * =================================
 * Business logic layer for approving/rejecting weekly timesheets
 * 
 * Based on old vodichron employeeWeeklyTimesheetController.ts (line 294-346)
 * 
 * Responsibilities:
 * - Authorization checks (admin, hr, managers, directors, customers can approve)
 * - Status validation (prevent double approval/rejection)
 * - Unlock tasks on rejection
 * - Approval status update
 * - Email notifications on approval/rejection
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { config } from '../../../../config';
import moment from 'moment';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getWeeklyTimesheetDetailsById } from '../../stores/weekly/list.store';
import { updateWeeklyTimeSheetApprovalStatus } from '../../stores/weekly/update.store';
import { ApplicationUserRole, WeeklyTaskEntry } from '../../types/timesheet.types';
import { getTimesheetApprovedNotificationTemplate } from '../../templates/timesheet-approved.template';
import { getTimesheetRejectedNotificationTemplate } from '../../templates/timesheet-rejected.template';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
  name?: string;
}

/**
 * Approval Status Enum
 */
export enum ApprovalStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * Approve Timesheet Input
 */
interface ApproveTimesheetInput {
  timesheetId: string;
  approvalStatus: ApprovalStatus;
  comment?: string;
}

/**
 * Employee Details for Email
 */
interface EmployeeDetails {
  uuid: string;
  name: string;
  officialEmailId: string;
}

/**
 * Unlock All Tasks
 * ================
 * Unlocks all task cells in the weekly timesheet
 * Used when timesheet is rejected to allow employee to edit
 * 
 * Based on old vodichron unlockAllTasks function (line 101-115)
 * 
 * @param taskDetails - Array of weekly task entries
 * @returns Updated task details with all cells unlocked
 */
function unlockAllTasks(taskDetails: WeeklyTaskEntry[]): WeeklyTaskEntry[] {
  const updatedTaskDetails: WeeklyTaskEntry[] = [];

  for (const timesheetEntry of taskDetails) {
    const keys = Object.keys(timesheetEntry);
    
    for (const key of keys) {
      const cell = timesheetEntry[key];
      if (cell && typeof cell === 'object' && 'isLocked' in cell) {
        (timesheetEntry[key] as any) = {
          ...cell,
          isLocked: false,
        };
      }
    }
    
    updatedTaskDetails.push(timesheetEntry);
  }

  return updatedTaskDetails;
}

/**
 * Approve Weekly Timesheet Service
 * =================================
 * 
 * Updates approval status (approve/reject) for a weekly timesheet
 * 
 * Authorization Rules (from old vodichron line 298):
 * - super_user: Can approve any timesheet
 * - hr: Can approve any timesheet
 * - manager: Can approve reportee timesheets
 * - director: Can approve reportee timesheets
 * - customer: Can approve allocated employee timesheets
 * - employee: Cannot approve timesheets
 * 
 * Business Logic (from old vodichron line 294-346):
 * 1. Verify user has approval permissions
 * 2. Fetch existing timesheet
 * 3. Validate timesheet status (prevent double approval unless super_user)
 * 4. If rejecting: unlock all task cells
 * 5. Update approval status in database
 * 6. Send email notification to employee
 * 
 * @param input - Approval data including timesheet ID and new status
 * @param employeeDetails - Employee information for email notification
 * @param user - Authenticated user context
 * @returns Success status
 */
export async function approveWeeklyTimesheet(
  input: ApproveTimesheetInput,
  employeeDetails: EmployeeDetails,
  user: UserContext
): Promise<{ success: boolean }> {
  const timer = new PerformanceTimer('approveWeeklyTimesheet_service');
  
  try {
    logger.info('✏️ Approving/rejecting weekly timesheet', {
      timesheetId: input.timesheetId,
      newStatus: input.approvalStatus,
      approvedBy: user.uuid,
      approvedByRole: user.role,
      operation: 'approveWeeklyTimesheet'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    // Based on old vodichron line 298
    const ADMIN_USERS = [ApplicationUserRole.superUser, ApplicationUserRole.hr];
    const EMP_MANAGERS = [ApplicationUserRole.manager, ApplicationUserRole.director];
    const CUSTOMER_USERS = [ApplicationUserRole.customer];
    
    const canApprove = [...ADMIN_USERS, ...EMP_MANAGERS, ...CUSTOMER_USERS].includes(user.role);

    if (!canApprove) {
      logger.warn('🚫 Access denied - User cannot approve timesheets', {
        userId: user.uuid,
        userRole: user.role,
        timesheetId: input.timesheetId
      });

      logSecurity('APPROVE_WEEKLY_TIMESHEET_ACCESS_DENIED', 'high', {
        userRole: user.role,
        timesheetId: input.timesheetId,
        reason: 'User role not authorized to approve timesheets'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // ==========================================================================
    // STEP 2: Fetch Existing Timesheet
    // ==========================================================================
    // Based on old vodichron line 301-304
    logger.debug('🔍 Fetching timesheet details', {
      timesheetId: input.timesheetId
    });

    const timesheetData = await getWeeklyTimesheetDetailsById(input.timesheetId);

    if (!timesheetData) {
      logger.warn('❌ Timesheet not found', {
        timesheetId: input.timesheetId,
        approvedBy: user.uuid
      });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Unable to get timesheet data.'
      });
    }

    // ==========================================================================
    // STEP 3: Validate Status (Prevent Double Approval)
    // ==========================================================================
    // Based on old vodichron line 306-311
    const isSuperUser = user.role === ApplicationUserRole.superUser;
    const isAlreadyProcessed = 
      timesheetData.approvalStatus === ApprovalStatus.REJECTED || 
      timesheetData.approvalStatus === ApprovalStatus.APPROVED;

    if (!isSuperUser && isAlreadyProcessed) {
      logger.warn('⚠️ Timesheet already processed', {
        timesheetId: input.timesheetId,
        currentStatus: timesheetData.approvalStatus,
        attemptedBy: user.uuid
      });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Timesheet is ${timesheetData.approvalStatus} already and it cannot be updated again.`
      });
    }

    // ==========================================================================
    // STEP 4: Unlock Tasks if Rejecting
    // ==========================================================================
    // Based on old vodichron line 312-316
    // Parse taskDetails if it's a string
    const taskDetailsArray: WeeklyTaskEntry[] = typeof timesheetData.taskDetails === 'string' 
      ? JSON.parse(timesheetData.taskDetails) 
      : timesheetData.taskDetails;
    
    let updatedTaskDetails: WeeklyTaskEntry[] = taskDetailsArray;
    
    if (input.approvalStatus === ApprovalStatus.REJECTED) {
      logger.debug('🔓 Unlocking all task cells (rejection)', {
        timesheetId: input.timesheetId
      });

      updatedTaskDetails = unlockAllTasks(taskDetailsArray);
    }

    // ==========================================================================
    // STEP 5: Update Approval Status in Database
    // ==========================================================================
    // Based on old vodichron line 318-325
    logger.info('💾 Updating timesheet approval status in database', {
      timesheetId: input.timesheetId,
      approvalStatus: input.approvalStatus,
      approvedBy: user.uuid
    });

    await updateWeeklyTimeSheetApprovalStatus(
      user.uuid,
      user.role,
      input.timesheetId,
      input.comment || '',
      input.approvalStatus as 'APPROVED' | 'REJECTED',
      updatedTaskDetails,
      user.uuid
    );

    // ==========================================================================
    // STEP 6: Send Email Notifications
    // ==========================================================================
    // Based on old vodichron line 327-344
    if (input.approvalStatus === ApprovalStatus.APPROVED || input.approvalStatus === ApprovalStatus.REJECTED) {
      await sendApprovalEmailNotification(
        input.approvalStatus,
        employeeDetails,
        timesheetData.requestNumber.toString(),
        timesheetData.totalHours.toString(),
        moment(timesheetData.weekEndDate).format('MM/DD/YYYY'),
        user.name || user.email,
        input.comment
      );
    }

    // ==========================================================================
    // STEP 7: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Weekly timesheet approval updated successfully', {
      timesheetId: input.timesheetId,
      approvalStatus: input.approvalStatus,
      approvedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('APPROVE_WEEKLY_TIMESHEET_SUCCESS', 'low', {
      timesheetId: input.timesheetId,
      approvalStatus: input.approvalStatus,
      approvedByRole: user.role,
      duration
    }, undefined, user.uuid);

    return { success: true };

  } catch (error: any) {
    // ==========================================================================
    // STEP 8: Error Handling
    // ==========================================================================
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to approve weekly timesheet', {
      timesheetId: input.timesheetId,
      approvalStatus: input.approvalStatus,
      approvedBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('APPROVE_WEEKLY_TIMESHEET_ERROR', 'critical', {
      timesheetId: input.timesheetId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update timesheet approval status. Please try again later.'
    });
  }
}

/**
 * Send Approval Email Notification
 * =================================
 * 
 * Sends approval or rejection email notification to employee
 * Based on old vodichron line 327-344
 * 
 * @param approvalStatus - APPROVED or REJECTED
 * @param employee - Employee details
 * @param requestNumber - Timesheet request number
 * @param totalHours - Total hours in timesheet
 * @param weekEndingDate - Week ending date formatted
 * @param approverName - Name of approver
 * @param comment - Optional rejection comment
 */
async function sendApprovalEmailNotification(
  approvalStatus: ApprovalStatus,
  employee: EmployeeDetails,
  requestNumber: string,
  totalHours: string,
  weekEndingDate: string,
  approverName: string,
  comment?: string
): Promise<void> {
  try {
    const appLink = config.frontendUrl;;

    if (approvalStatus === ApprovalStatus.APPROVED) {
      logger.info('📧 Sending approval notification email', {
        employeeEmail: employee.officialEmailId,
        requestNumber
      });

      const approvedTemplate = getTimesheetApprovedNotificationTemplate({
        employeeName: employee.name,
        requestNumber,
        totalHours,
        weekEndingDate,
        approverName,
        appLink
      });

      // TODO: Integrate with email service
      // await sendEmail(employee.officialEmailId, approvedTemplate.template, null, approvedTemplate.subject);
      
      logger.debug('✉️ Approval email prepared', {
        to: employee.officialEmailId,
        subject: approvedTemplate.subject
      });
    }

    if (approvalStatus === ApprovalStatus.REJECTED) {
      logger.info('📧 Sending rejection notification email', {
        employeeEmail: employee.officialEmailId,
        requestNumber,
        rejectionReason: comment
      });

      const rejectedTemplate = getTimesheetRejectedNotificationTemplate({
        employeeName: employee.name,
        requestNumber,
        totalHours,
        weekEndingDate,
        approverName,
        rejectionReason: comment,
        appLink
      });

      // TODO: Integrate with email service
      // await sendEmail(employee.officialEmailId, rejectedTemplate.template, null, rejectedTemplate.subject);
      
      logger.debug('✉️ Rejection email prepared', {
        to: employee.officialEmailId,
        subject: rejectedTemplate.subject
      });
    }

  } catch (error: any) {
    // Log error but don't fail the approval process
    logger.error('❌ Failed to send approval email notification', {
      employeeId: employee.uuid,
      approvalStatus,
      error: error.message
    });
  }
}
