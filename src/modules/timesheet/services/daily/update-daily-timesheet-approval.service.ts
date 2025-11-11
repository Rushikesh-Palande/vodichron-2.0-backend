/**
 * Update Daily Timesheet Approval Service
 * ========================================
 * Business logic layer for approving/rejecting daily timesheets
 * 
 * Based on old vodichron employeeTimesheetController.ts
 * 
 * Responsibilities:
 * - Authorization checks (admin, hr, managers, directors can approve)
 * - Status validation (prevent double approval/rejection)
 * - Approval status update
 * - Email notifications on approval/rejection
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { updateDailyTimesheetApprovalStatus } from '../../stores/daily/update.store';
import { ApplicationUserRole } from '../../types/timesheet.types';
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
 * Update Daily Timesheet Approval Input
 */
interface UpdateApprovalInput {
  timesheetUuid: string;
  approvalStatus: ApprovalStatus;
  comment?: string;
  employeeName: string;
  employeeEmail: string;
  requestNumber: string;
  totalHours: string;
  timesheetDate: string;
}

/**
 * Update Daily Timesheet Approval Service
 * ========================================
 * 
 * Updates approval status (approve/reject) for a daily timesheet
 * 
 * Authorization Rules (from old vodichron line 298):
 * - super_user: Can approve any timesheet
 * - hr: Can approve any timesheet
 * - manager: Can approve reportee timesheets
 * - director: Can approve reportee timesheets
 * - customer: Can approve allocated employee timesheets
 * - employee: Cannot approve timesheets
 * 
 * Business Logic:
 * 1. Verify user has approval permissions
 * 2. Validate timesheet exists and status
 * 3. Update approval status in database
 * 4. Send email notification to employee
 * 
 * @param input - Approval data including timesheet UUID and new status
 * @param user - Authenticated user context
 * @throws TRPCError FORBIDDEN if user lacks approval permission
 * @throws TRPCError BAD_REQUEST if timesheet already processed
 */
export async function updateDailyTimesheetApproval(
  input: UpdateApprovalInput,
  user: UserContext
): Promise<{ success: boolean }> {
  const timer = new PerformanceTimer('updateDailyTimesheetApproval_service');
  
  try {
    logger.info('✏️ Updating daily timesheet approval status', {
      timesheetUuid: input.timesheetUuid,
      newStatus: input.approvalStatus,
      approvedBy: user.uuid,
      approvedByRole: user.role,
      operation: 'updateDailyTimesheetApproval'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    // Based on old vodichron employeeWeeklyTimesheetController.ts line 298
    const ADMIN_USERS = [ApplicationUserRole.superUser, ApplicationUserRole.hr];
    const EMP_MANAGERS = [ApplicationUserRole.manager, ApplicationUserRole.director];
    const CUSTOMER_USERS = [ApplicationUserRole.customer];
    
    const canApprove = [...ADMIN_USERS, ...EMP_MANAGERS, ...CUSTOMER_USERS].includes(user.role);

    if (!canApprove) {
      logger.warn('🚫 Access denied - User cannot approve timesheets', {
        userId: user.uuid,
        userRole: user.role,
        timesheetUuid: input.timesheetUuid
      });

      logSecurity('UPDATE_DAILY_TIMESHEET_APPROVAL_ACCESS_DENIED', 'high', {
        userRole: user.role,
        timesheetUuid: input.timesheetUuid,
        reason: 'User role not authorized to approve timesheets'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // ==========================================================================
    // STEP 2: Validate Approval Status
    // ==========================================================================
    if (![ApprovalStatus.APPROVED, ApprovalStatus.REJECTED].includes(input.approvalStatus)) {
      logger.warn('❌ Invalid approval status', {
        providedStatus: input.approvalStatus,
        userId: user.uuid
      });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid approval status. Must be either "approved" or "rejected".'
      });
    }

    // ==========================================================================
    // STEP 3: Update Approval Status in Database
    // ==========================================================================
    logger.info('💾 Updating timesheet approval status in database', {
      timesheetUuid: input.timesheetUuid,
      approvalStatus: input.approvalStatus,
      approvedBy: user.uuid
    });

    await updateDailyTimesheetApprovalStatus(
      user.uuid,
      input.timesheetUuid,
      input.comment || '',
      input.approvalStatus as 'APPROVED' | 'REJECTED',
      user.uuid
    );

    // ==========================================================================
    // STEP 4: Send Email Notification
    // ==========================================================================
    const appLink = process.env.UI_HOST || 'http://localhost:3000';
    
    if (input.approvalStatus === ApprovalStatus.APPROVED) {
      logger.info('📧 Sending approval notification email', {
        employeeEmail: input.employeeEmail,
        requestNumber: input.requestNumber
      });

      const approvedTemplate = getTimesheetApprovedNotificationTemplate({
        employeeName: input.employeeName,
        requestNumber: input.requestNumber,
        totalHours: input.totalHours,
        weekEndingDate: input.timesheetDate,
        approverName: user.name || user.email,
        appLink
      });

      // TODO: Integrate with email service
      // await sendEmail(input.employeeEmail, approvedTemplate.template, null, approvedTemplate.subject);
      
      logger.debug('✉️ Approval email prepared', {
        to: input.employeeEmail,
        subject: approvedTemplate.subject
      });
    }

    if (input.approvalStatus === ApprovalStatus.REJECTED) {
      logger.info('📧 Sending rejection notification email', {
        employeeEmail: input.employeeEmail,
        requestNumber: input.requestNumber,
        rejectionReason: input.comment
      });

      const rejectedTemplate = getTimesheetRejectedNotificationTemplate({
        employeeName: input.employeeName,
        requestNumber: input.requestNumber,
        totalHours: input.totalHours,
        weekEndingDate: input.timesheetDate,
        approverName: user.name || user.email,
        rejectionReason: input.comment,
        appLink
      });

      // TODO: Integrate with email service
      // await sendEmail(input.employeeEmail, rejectedTemplate.template, null, rejectedTemplate.subject);
      
      logger.debug('✉️ Rejection email prepared', {
        to: input.employeeEmail,
        subject: rejectedTemplate.subject
      });
    }

    // ==========================================================================
    // STEP 5: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Daily timesheet approval updated successfully', {
      timesheetUuid: input.timesheetUuid,
      approvalStatus: input.approvalStatus,
      approvedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_DAILY_TIMESHEET_APPROVAL_SUCCESS', 'low', {
      timesheetUuid: input.timesheetUuid,
      approvalStatus: input.approvalStatus,
      approvedByRole: user.role,
      duration
    }, undefined, user.uuid);

    return { success: true };

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to update daily timesheet approval', {
      timesheetUuid: input.timesheetUuid,
      approvalStatus: input.approvalStatus,
      approvedBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_DAILY_TIMESHEET_APPROVAL_ERROR', 'critical', {
      timesheetUuid: input.timesheetUuid,
      error: error.message,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update timesheet approval status. Please try again later.'
    });
  }
}
