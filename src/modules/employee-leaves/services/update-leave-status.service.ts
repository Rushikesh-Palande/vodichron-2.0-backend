/**
 * Update Leave Status Service
 * ============================
 * Business logic for approving/rejecting leave requests
 * 
 * Responsibilities:
 * - Authorization checks (only approvers/HR/superUser)
 * - Update approver status in workflow
 * - Determine final leave status
 * - Update leave allocation
 * - Send email notifications
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import path from 'path';
import moment from 'moment';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { UpdateLeaveStatusInput } from '../schemas/update-leave-status.schemas';
import { ApplicationUserRole, LeaveApprover } from '../types/employee-leave.types';
import { LeaveApprovalStatus } from '../constants/leave.constants';
import { getLeaveDetailsById } from '../stores/leave-application/get-leaves.store';
import { updateLeaveStatusByLeaveId } from '../stores/leave-application/update-leave-status.store';
import { upsertLeaveAllocations } from './leave-calculation.service';
import { getEmployeeByUuid } from '../../employee/stores/crud/get-employee-by-uuid.store';
import { getLeaveApprovedNotificationTemplate } from '../templates/leave-approved.template';
import { getLeaveRejectedNotificationTemplate } from '../templates/leave-rejected.template';
import { sendEmail } from '../../../services/email.service';
import { config } from '../../../config';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Update Leave Status Service
 * ============================
 * 
 * Approves or rejects leave requests
 * 
 * Business Logic Flow:
 * 1. Authorization check (only approvers/HR/superUser)
 * 2. Fetch leave details
 * 3. Validate leave can be updated
 * 4. Find or add approver in workflow
 * 5. Update approver status
 * 6. Determine final leave status (all approved / rejected / pending)
 * 7. Update leave record
 * 8. Update leave allocation
 * 9. Send email notification to employee
 * 
 * Authorization Rules:
 * - Regular employees: Forbidden
 * - Approvers: Can approve/reject if they are in approver list
 * - HR/SuperUser: Can approve/reject any leave (added to approver list)
 * - SuperUser: Can update already approved/rejected leaves
 * 
 * @param input - Leave ID, approval status, comments
 * @param user - Authenticated user context
 * @returns Success message
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST for validation failures
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function updateLeaveStatus(
  input: UpdateLeaveStatusInput,
  user: UserContext
): Promise<{ message: string }> {
  const timer = new PerformanceTimer('updateLeaveStatus_service');
  
  try {
    logger.info('📝 Updating leave status', {
      leaveId: input.leaveId,
      approvalStatus: input.approvalStatus,
      hasComment: !!input.comment,
      updatedBy: user.uuid,
      userRole: user.role,
      operation: 'updateLeaveStatus'
    });

    // Authorization Check
    // Only managers, directors, HR, superUser, and customers can update leave status
    const allowedRoles = [
      ApplicationUserRole.manager,
      ApplicationUserRole.director,
      ApplicationUserRole.hr,
      ApplicationUserRole.superUser,
      ApplicationUserRole.customer,
    ];

    if (!allowedRoles.includes(user.role)) {
      logger.warn('🚫 Access denied - Regular employee trying to update leave status', {
        userId: user.uuid,
        userRole: user.role
      });

      logSecurity('UPDATE_LEAVE_STATUS_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Regular employee trying to update leave status'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. Only managers, directors, and HR can update leave status.'
      });
    }

    // Fetch leave details
    logger.debug('🔍 Fetching leave details', {
      leaveId: input.leaveId
    });

    const leaveData = await getLeaveDetailsById(input.leaveId);

    if (!leaveData) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Leave request not found.'
      });
    }

    // Validate leave can be updated
    // SuperUser can always update, others cannot update already approved/rejected leaves
    if (
      user.role !== ApplicationUserRole.superUser &&
      (leaveData.leaveApprovalStatus === LeaveApprovalStatus.REJECTED ||
       leaveData.leaveApprovalStatus === LeaveApprovalStatus.APPROVED)
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Leave is already ${leaveData.leaveApprovalStatus} and cannot be updated again.`
      });
    }

    logger.debug('✅ Leave found and can be updated', {
      leaveId: input.leaveId,
      currentStatus: leaveData.leaveApprovalStatus
    });

    // Build approver list
    const approverList = leaveData.leaveApprovers as LeaveApprover[];
    const approverKey = approverList.findIndex(approver => approver.approverId === user.uuid);
    const currentDateTime = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');

    // Check if user is authorized to approve this leave
    if (
      user.role !== ApplicationUserRole.hr &&
      user.role !== ApplicationUserRole.superUser &&
      approverKey === -1
    ) {
      logger.warn('🚫 Access denied - User not in approver list', {
        userId: user.uuid,
        leaveId: input.leaveId
      });

      logSecurity('APPROVE_LEAVE_NOT_APPROVER', 'medium', {
        userRole: user.role,
        reason: 'User trying to approve leave they are not assigned to'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. You are not an approver for this leave request.'
      });
    }

    // HR or SuperUser: Add to approver list if not already there
    if (
      (user.role === ApplicationUserRole.hr || user.role === ApplicationUserRole.superUser) &&
      approverKey === -1
    ) {
      const higherApprover = await getEmployeeByUuid(user.uuid);
      
      if (higherApprover) {
        approverList.push({
          approverId: higherApprover.uuid,
          approverDetail: `${higherApprover.name} <${higherApprover.officialEmailId || ''}>`,
          approvalStatus: input.approvalStatus,
          approverComments: input.comment,
          approvalDate: currentDateTime,
          approverRole: user.role,
        });

        logger.debug('✅ HR/SuperUser added to approver list', {
          approverId: higherApprover.uuid
        });
      }
    } 
    // Regular approver: Update their status
    else {
      approverList[approverKey] = {
        ...approverList[approverKey],
        approvalStatus: input.approvalStatus,
        approverComments: input.comment,
        approvalDate: currentDateTime,
      };

      logger.debug('✅ Approver status updated', {
        approverId: user.uuid,
        status: input.approvalStatus
      });
    }

    // Determine final leave status
    let finalStatus = LeaveApprovalStatus.PENDING;

    if (input.approvalStatus === LeaveApprovalStatus.REJECTED) {
      // Any rejection means leave is rejected
      finalStatus = LeaveApprovalStatus.REJECTED;
      logger.debug('❌ Leave rejected by approver');
    } else {
      // Check if all approvers have approved
      const isApprovedByAll = approverList.every(
        approver => approver.approvalStatus === LeaveApprovalStatus.APPROVED
      );

      if (isApprovedByAll) {
        finalStatus = LeaveApprovalStatus.APPROVED;
        logger.debug('✅ Leave approved by all approvers');
      } else if (
        input.approvalStatus === LeaveApprovalStatus.APPROVED &&
        (user.role === ApplicationUserRole.hr || user.role === ApplicationUserRole.superUser)
      ) {
        // HR/SuperUser can override and approve directly
        finalStatus = LeaveApprovalStatus.APPROVED;
        logger.debug('✅ Leave approved by HR/SuperUser (override)');
      } else {
        finalStatus = LeaveApprovalStatus.PENDING;
        logger.debug('⏳ Leave still pending (waiting for other approvers)');
      }
    }

    // Update leave status in database
    logger.info('💾 Updating leave status in database', {
      leaveId: input.leaveId,
      finalStatus
    });

    await updateLeaveStatusByLeaveId(
      user.uuid,
      input.leaveId,
      approverList,
      finalStatus
    );

    // Update leave allocation
    logger.debug('📊 Updating leave allocation', {
      leaveId: input.leaveId,
      status: finalStatus
    });

    await upsertLeaveAllocations(leaveData, finalStatus);

    // Send email notification to employee
    if (finalStatus === LeaveApprovalStatus.APPROVED || finalStatus === LeaveApprovalStatus.REJECTED) {
      logger.info('📧 Sending email notification to employee');

      const employeeDetail = await getEmployeeByUuid(leaveData.employeeId);

      if (employeeDetail && employeeDetail.officialEmailId) {
        const appLink = config.frontendUrl || 'http://localhost:3000';
        const logoPath = path.resolve(process.cwd(), config.asset.path, 'Vodichron-logo.png');

        const mailConfig = {
          appLink,
          employeeName: employeeDetail.name,
          requestNumber: leaveData.requestNumber.toString(),
        };

        try {
          if (finalStatus === LeaveApprovalStatus.REJECTED) {
            const rejectedMailTemplate = getLeaveRejectedNotificationTemplate(mailConfig);

            await sendEmail({
              to: employeeDetail.officialEmailId,
              subject: rejectedMailTemplate.subject,
              html: rejectedMailTemplate.template,
              attachments: [{
                filename: 'vodichron-logo.png',
                path: logoPath,
                cid: 'vodichron-logo',
              }],
            });

            logger.info('✅ Rejection email sent to employee', {
              to: employeeDetail.officialEmailId
            });
          } else {
            const approvedMailTemplate = getLeaveApprovedNotificationTemplate(mailConfig);

            await sendEmail({
              to: employeeDetail.officialEmailId,
              subject: approvedMailTemplate.subject,
              html: approvedMailTemplate.template,
              attachments: [{
                filename: 'vodichron-logo.png',
                path: logoPath,
                cid: 'vodichron-logo',
              }],
            });

            logger.info('✅ Approval email sent to employee', {
              to: employeeDetail.officialEmailId
            });
          }
        } catch (emailError: any) {
          logger.error('❌ Failed to send email notification', {
            error: emailError.message
          });
          // Don't fail the request if email fails
        }
      }
    }

    const duration = timer.end();
    
    logger.info('✅ Leave status updated successfully', {
      leaveId: input.leaveId,
      finalStatus,
      duration: `${duration}ms`
    });

    return {
      message: `Leave ${finalStatus.toLowerCase()} successfully.`
    };

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to update leave status', {
      leaveId: input.leaveId,
      error: error.message,
      duration: `${duration}ms`
    });

    // Re-throw TRPCError as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Wrap other errors
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to update leave status: ${error.message}`
    });
  }
}
