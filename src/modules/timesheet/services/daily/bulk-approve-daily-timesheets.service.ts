/**
 * Bulk Approve Daily Timesheets Service
 * ======================================
 * Business logic for bulk approving/rejecting multiple daily timesheets
 * Sends ONE email with all task details
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { updateDailyTimesheetApprovalStatus } from '../../stores/daily/update.store';
import { ApplicationUserRole } from '../../types/timesheet.types';
import { getTimesheetApprovedNotificationTemplate } from '../../templates/timesheet-approved.template';
import { getTimesheetRejectedNotificationTemplate } from '../../templates/timesheet-rejected.template';
import { config } from '../../../../config';
import { sendEmail } from '../../../../services/email.service';
import path from 'path';

/**
 * Helper function to format hours in readable format
 * Examples:
 * - "00:30" -> "30 mins"
 * - "01:00" -> "1 hr"
 * - "01:45" -> "1 hr 45 mins"
 * - "02:00" -> "2 hrs"
 */
function formatHoursReadable(timeStr: string): string {
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (hours === 0) {
    return `${minutes} mins`;
  }
  
  if (minutes === 0) {
    return hours === 1 ? `${hours} hr` : `${hours} hrs`;
  }
  
  return hours === 1 ? `${hours} hr ${minutes} mins` : `${hours} hrs ${minutes} mins`;
}

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
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * Bulk Approval Input
 */
interface BulkApprovalInput {
  timesheetUuids: string[];
  approvalStatus: ApprovalStatus;
  comment?: string;
  employeeName: string;
  employeeEmail?: string;
  employeeId: string;
  timesheetDate: string;
  taskIds: string[];
  taskCount: number;
  totalHours: string;
}

/**
 * Bulk Approve Daily Timesheets Service
 * ======================================
 * 
 * Approves/rejects multiple timesheets at once and sends ONE email
 * 
 * @param input - Bulk approval data
 * @param user - Authenticated user context
 */
export async function bulkApproveDailyTimesheets(
  input: BulkApprovalInput,
  user: UserContext
): Promise<{ success: boolean; approvedCount: number }> {
  const timer = new PerformanceTimer('bulkApproveDailyTimesheets_service');
  
  try {
    logger.info('✏️ Bulk approving/rejecting daily timesheets', {
      timesheetCount: input.timesheetUuids.length,
      approvalStatus: input.approvalStatus,
      employeeId: input.employeeId,
      approvedBy: user.uuid,
      operation: 'bulkApproveDailyTimesheets'
    });

    // Authorization Check
    const ADMIN_USERS = [ApplicationUserRole.superUser, ApplicationUserRole.hr];
    const EMP_MANAGERS = [ApplicationUserRole.manager, ApplicationUserRole.director];
    const CUSTOMER_USERS = [ApplicationUserRole.customer];
    
    const canApprove = [...ADMIN_USERS, ...EMP_MANAGERS, ...CUSTOMER_USERS].includes(user.role);

    if (!canApprove) {
      logger.warn('🚫 Access denied - User cannot approve timesheets', {
        userId: user.uuid,
        userRole: user.role
      });

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // Validate Approval Status
    if (![ApprovalStatus.APPROVED, ApprovalStatus.REJECTED].includes(input.approvalStatus)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid approval status. Must be either "APPROVED" or "REJECTED".'
      });
    }

    // Update all timesheets in database
    logger.info('💾 Updating timesheet approval statuses in database', {
      count: input.timesheetUuids.length
    });

    for (const timesheetUuid of input.timesheetUuids) {
      await updateDailyTimesheetApprovalStatus(
        user.uuid,
        timesheetUuid,
        input.comment || '',
        input.approvalStatus as 'APPROVED' | 'REJECTED',
        user.uuid
      );
    }

    // Send ONE email with all task details
    if (input.employeeEmail) {
      const appLink = config.frontendUrl;
      const formattedHours = formatHoursReadable(input.totalHours);
      
      if (input.approvalStatus === ApprovalStatus.APPROVED) {
        logger.info('📧 Sending bulk approval notification email', {
          employeeEmail: input.employeeEmail,
          taskCount: input.taskCount
        });

        const approvedTemplate = getTimesheetApprovedNotificationTemplate({
          employeeName: input.employeeName,
          requestNumber: `${input.taskCount} Tasks (${input.taskIds.join(', ')})`,
          totalHours: formattedHours,
          weekEndingDate: input.timesheetDate,
          approverName: user.name || user.email,
          approverComments: input.comment,
          appLink
        });

        const logoPath = path.resolve(process.cwd(), config.asset.path, 'Vodichron-logo.png');
        
        await sendEmail({
          to: input.employeeEmail,
          subject: `${input.taskCount} Timesheets Approved - ${input.timesheetDate} - Vodichron HRMS`,
          html: approvedTemplate.template,
          attachments: [
            {
              filename: 'vodichron-logo.png',
              path: logoPath,
              cid: 'vodichron-logo',
            },
          ],
        });
        
        logger.info('✅ Bulk approval email sent successfully', {
          to: input.employeeEmail,
          taskCount: input.taskCount
        });
      }

      if (input.approvalStatus === ApprovalStatus.REJECTED) {
        logger.info('📧 Sending bulk rejection notification email', {
          employeeEmail: input.employeeEmail,
          taskCount: input.taskCount
        });

        const rejectedTemplate = getTimesheetRejectedNotificationTemplate({
          employeeName: input.employeeName,
          requestNumber: `${input.taskCount} Tasks (${input.taskIds.join(', ')})`,
          totalHours: formattedHours,
          weekEndingDate: input.timesheetDate,
          approverName: user.name || user.email,
          rejectionReason: input.comment,
          appLink
        });

        const logoPath = path.resolve(process.cwd(), config.asset.path, 'Vodichron-logo.png');
        
        await sendEmail({
          to: input.employeeEmail,
          subject: `${input.taskCount} Timesheets Rejected - ${input.timesheetDate} - Vodichron HRMS`,
          html: rejectedTemplate.template,
          attachments: [
            {
              filename: 'vodichron-logo.png',
              path: logoPath,
              cid: 'vodichron-logo',
            },
          ],
        });
        
        logger.info('✅ Bulk rejection email sent successfully', {
          to: input.employeeEmail,
          taskCount: input.taskCount
        });
      }
    } else {
      logger.warn('⚠️ Skipping email notification - employee email not provided', {
        employeeId: input.employeeId
      });
    }

    const duration = timer.end();

    logger.info('✅ Bulk daily timesheet approval completed successfully', {
      approvedCount: input.timesheetUuids.length,
      approvalStatus: input.approvalStatus,
      approvedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('BULK_APPROVE_DAILY_TIMESHEETS_SUCCESS', 'low', {
      approvedCount: input.timesheetUuids.length,
      approvalStatus: input.approvalStatus,
      approvedByRole: user.role,
      duration
    }, undefined, user.uuid);

    return { success: true, approvedCount: input.timesheetUuids.length };

  } catch (error: any) {
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to bulk approve daily timesheets', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update timesheet approval status. Please try again later.'
    });
  }
}
