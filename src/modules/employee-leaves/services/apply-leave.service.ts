/**
 * Apply Leave Service
 * ===================
 * Business logic for leave application
 * 
 * Responsibilities:
 * - Authorization checks
 * - Validate employee and manager details
 * - Check leave overlap
 * - Calculate leave days
 * - Build approver workflow (manager + secondary + customer)
 * - Insert leave request
 * - Send email notifications
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import path from 'path';
import moment from 'moment';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { ApplyLeaveInput } from '../schemas/apply-leave.schemas';
import { ApplicationUserRole, LeaveApprover } from '../types/employee-leave.types';
import { LeaveApprovalStatus } from '../constants/leave.constants';
import { insertEmployeeLeave, checkLeaveOverlap } from '../stores/leave-application/apply-leave.store';
import { calculateLeaveDays, generateRandomRequestNumber, extractNameAndEmail } from '../helpers/leave-calculations.helper';
import { getLeaveSubmittedManagerNotificationTemplate } from '../templates/leave-submitted-manager.template';
import { getLeaveSubmittedEmployeeNotificationTemplate } from '../templates/leave-submitted-employee.template';
import { sendEmail } from '../../../services/email.service';
import { config } from '../../../config';
import { getEmployeeCustomerDetails } from '../stores/employee-customer-allocation.store';

// Import employee store functions
import { getEmployeeByUuid } from '../../employee/stores/crud/get-employee-by-uuid.store';

/**
 * User Context Interface
 * ----------------------
 * Represents the authenticated user making the request
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Apply Leave Service
 * ===================
 * 
 * Main service function for applying leave
 * 
 * Business Logic Flow:
 * 1. Authorization check (employees can only apply for themselves)
 * 2. Fetch employee details with manager info
 * 3. Validate half-day constraints
 * 4. Check for overlapping leaves
 * 5. Fetch manager and secondary approver details
 * 6. Check if employee is allocated to customer
 * 7. Build approver workflow
 * 8. Calculate leave days
 * 9. Generate request number
 * 10. Insert leave record
 * 11. Send email notifications
 * 12. Return leave UUID and request number
 * 
 * @param leaveData - Leave application data from validated input
 * @param user - Authenticated user context
 * @returns Leave UUID and request number
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST for validation failures
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function applyLeave(
  leaveData: ApplyLeaveInput,
  user: UserContext
): Promise<{ leaveUuid: string; requestNumber: number }> {
  const timer = new PerformanceTimer('applyLeave_service');
  
  try {
    logger.info('📝 Processing leave application', {
      employeeId: leaveData.employeeId,
      leaveType: leaveData.leaveType,
      startDate: leaveData.leaveStartDate,
      endDate: leaveData.leaveEndDate,
      appliedBy: user.uuid,
      operation: 'applyLeave'
    });

    // STEP 1: Authorization Check
    // Regular employees can only apply for their own leaves
    if (user.role === ApplicationUserRole.employee && user.uuid !== leaveData.employeeId) {
      logger.warn('🚫 Access denied - Employee trying to apply leave for someone else', {
        userId: user.uuid,
        targetEmployeeId: leaveData.employeeId
      });

      logSecurity('APPLY_LEAVE_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Employee trying to apply for another employee'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only apply leave for yourself.'
      });
    }

    // STEP 2: Fetch Employee Details
    logger.debug('👤 Fetching employee details', {
      employeeId: leaveData.employeeId
    });

    const employee = await getEmployeeByUuid(leaveData.employeeId);

    if (!employee) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Employee not found. Please check employee ID.'
      });
    }

    // STEP 3: Validate Half-Day Constraints
    let leaveDays = calculateLeaveDays(leaveData.leaveStartDate, leaveData.leaveEndDate);
    
    if (leaveData.isHalfDay && leaveDays > 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Half-day leave can only be applied for a single day. Start and end dates must be the same.'
      });
    }

    if (leaveData.isHalfDay) {
      leaveDays = 0.5;
    }

    logger.debug('📊 Leave days calculated', {
      leaveDays,
      isHalfDay: leaveData.isHalfDay
    });

    // STEP 4: Check Leave Overlap
    logger.debug('🔍 Checking for overlapping leaves', {
      employeeId: leaveData.employeeId
    });

    const hasOverlap = await checkLeaveOverlap(
      leaveData.employeeId,
      leaveData.leaveStartDate,
      leaveData.leaveEndDate
    );

    if (hasOverlap) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Leave dates overlap with an existing approved or pending leave request.'
      });
    }

    // STEP 5: Build Approver Workflow
    logger.debug('👥 Building approver workflow');

    const leaveApprovers: LeaveApprover[] = [];

    // Primary Approver (Reporting Manager)
    if (!employee.reportingManagerId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Employee does not have a reporting manager assigned. Please contact HR.'
      });
    }

    const managerDetails = await getEmployeeByUuid(employee.reportingManagerId);
    
    if (!managerDetails) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Reporting manager details not found. Please contact HR.'
      });
    }

    // Get manager's role from application_users table (simplified - assumes role field exists)
    const managerRole = (managerDetails as any).role || ApplicationUserRole.manager;

    leaveApprovers.push({
      approverId: employee.reportingManagerId,
      approverDetail: `${managerDetails.name} <${managerDetails.officialEmailId}>`,
      approverRole: managerRole,
      approvalStatus: LeaveApprovalStatus.REQUESTED,
    });

    logger.debug('✅ Primary approver added', {
      approverId: employee.reportingManagerId,
      approverName: managerDetails.name
    });

    // Secondary Approver (Optional)
    let secondaryApproverName = '';
    let secondaryApproverEmail = '';

    if (leaveData.secondaryApproverId) {
      const secondaryApprover = await getEmployeeByUuid(leaveData.secondaryApproverId);
      
      if (!secondaryApprover) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Secondary approver not found.'
        });
      }

      const secondaryRole = (secondaryApprover as any).role || ApplicationUserRole.manager;

      leaveApprovers.push({
        approverId: secondaryApprover.uuid,
        approverDetail: `${secondaryApprover.name} <${secondaryApprover.officialEmailId}>`,
        approverRole: secondaryRole,
        approvalStatus: LeaveApprovalStatus.REQUESTED,
      });

      secondaryApproverName = secondaryApprover.name;
      secondaryApproverEmail = secondaryApprover.officialEmailId || '';

      logger.debug('✅ Secondary approver added', {
        approverId: secondaryApprover.uuid,
        approverName: secondaryApprover.name
      });
    }

    // STEP 6: Customer Approver (if employee is allocated to customer)
    logger.debug('🔍 Checking customer allocation');

    const customerAllocation = await getEmployeeCustomerDetails(leaveData.employeeId);
    let customerApproverName = '';
    let customerApproverEmail = '';

    if (customerAllocation && customerAllocation.customerApprover) {
      leaveApprovers.push({
        approverId: customerAllocation.customerId,
        approverDetail: `${customerAllocation.customerName} (Customer)`,
        approverRole: ApplicationUserRole.customer,
        approvalStatus: LeaveApprovalStatus.REQUESTED,
      });

      customerApproverName = customerAllocation.customerName;
      customerApproverEmail = customerAllocation.email;

      logger.debug('✅ Customer approver added', {
        customerId: customerAllocation.customerId,
        customerName: customerAllocation.customerName
      });
    } else {
      logger.debug('ℹ️ No customer approver required', {
        hasAllocation: !!customerAllocation,
        customerApproverFlag: customerAllocation?.customerApprover
      });
    }

    // STEP 6: Generate Request Number
    const requestNumber = generateRandomRequestNumber(6);

    logger.debug('🔢 Request number generated', {
      requestNumber
    });

    // STEP 7: Insert Leave Record
    logger.info('💾 Inserting leave request', {
      requestNumber,
      leaveDays
    });

    const leaveUuid = await insertEmployeeLeave(
      requestNumber,
      {
        employeeId: leaveData.employeeId,
        leaveType: leaveData.leaveType,
        reason: leaveData.reason,
        leaveStartDate: leaveData.leaveStartDate,
        leaveEndDate: leaveData.leaveEndDate,
        leaveDays,
        isHalfDay: leaveData.isHalfDay,
        requestedDate: moment(new Date()).format('YYYY-MM-DD'),
        leaveApprovers,
        leaveApprovalStatus: LeaveApprovalStatus.REQUESTED,
      },
      user.uuid
    );

    logger.info('✅ Leave request created successfully', {
      leaveUuid,
      requestNumber
    });

    // STEP 8: Send Email Notifications
    logger.info('📧 Sending email notifications');

    const appLink = config.frontendUrl || 'http://localhost:3000';
    const logoPath = path.resolve(process.cwd(), config.asset.path, 'Vodichron-logo.png');

    const emailParams = {
      employeeName: employee.name,
      requestNumber: requestNumber.toString(),
      leaveDays: leaveDays.toString(),
      leaveType: leaveData.leaveType,
      startDate: moment(leaveData.leaveStartDate).format('DD-MM-YYYY'),
      endDate: moment(leaveData.leaveEndDate).format('DD-MM-YYYY'),
      appLink,
    };

    // Send email to primary approver (manager)
    try {
      const primaryApprover = extractNameAndEmail(leaveApprovers[0].approverDetail);
      
      if (primaryApprover) {
        const managerEmailTemplate = getLeaveSubmittedManagerNotificationTemplate({
          ...emailParams,
          managerName: primaryApprover.name,
        });

        await sendEmail({
          to: primaryApprover.email,
          subject: managerEmailTemplate.subject,
          html: managerEmailTemplate.template,
          attachments: [{
            filename: 'vodichron-logo.png',
            path: logoPath,
            cid: 'vodichron-logo',
          }],
        });

        logger.info('✅ Email sent to primary approver', {
          to: primaryApprover.email
        });
      }
    } catch (emailError: any) {
      logger.error('❌ Failed to send email to primary approver', {
        error: emailError.message
      });
      // Don't fail the request if email fails
    }

    // Send email to secondary approver (if exists)
    if (secondaryApproverName && secondaryApproverEmail) {
      try {
        const managerEmailTemplate = getLeaveSubmittedManagerNotificationTemplate({
          ...emailParams,
          managerName: secondaryApproverName,
        });

        await sendEmail({
          to: secondaryApproverEmail,
          subject: managerEmailTemplate.subject,
          html: managerEmailTemplate.template,
          attachments: [{
            filename: 'vodichron-logo.png',
            path: logoPath,
            cid: 'vodichron-logo',
          }],
        });

        logger.info('✅ Email sent to secondary approver', {
          to: secondaryApproverEmail
        });
      } catch (emailError: any) {
        logger.error('❌ Failed to send email to secondary approver', {
          error: emailError.message
        });
      }
    }

    // Send email to customer approver (if exists)
    if (customerApproverName && customerApproverEmail) {
      try {
        const customerEmailTemplate = getLeaveSubmittedManagerNotificationTemplate({
          ...emailParams,
          managerName: customerApproverName,
        });

        await sendEmail({
          to: customerApproverEmail,
          subject: customerEmailTemplate.subject,
          html: customerEmailTemplate.template,
          attachments: [{
            filename: 'vodichron-logo.png',
            path: logoPath,
            cid: 'vodichron-logo',
          }],
        });

        logger.info('✅ Email sent to customer approver', {
          to: customerApproverEmail
        });
      } catch (emailError: any) {
        logger.error('❌ Failed to send email to customer approver', {
          error: emailError.message
        });
      }
    }

    // Send confirmation email to employee
    if (employee.officialEmailId) {
      try {
        const employeeEmailTemplate = getLeaveSubmittedEmployeeNotificationTemplate(emailParams);

        await sendEmail({
          to: employee.officialEmailId,
          subject: employeeEmailTemplate.subject,
          html: employeeEmailTemplate.template,
          attachments: [{
            filename: 'vodichron-logo.png',
            path: logoPath,
            cid: 'vodichron-logo',
          }],
        });

        logger.info('✅ Confirmation email sent to employee', {
          to: employee.officialEmailId
        });
      } catch (emailError: any) {
        logger.error('❌ Failed to send confirmation email to employee', {
          error: emailError.message
        });
      }
    } else {
      logger.warn('⚠️ Employee has no official email - confirmation email skipped', {
        employeeId: employee.uuid
      });
    }

    const duration = timer.end();
    
    logger.info('✅ Leave application completed successfully', {
      leaveUuid,
      requestNumber,
      duration: `${duration}ms`
    });

    return {
      leaveUuid,
      requestNumber,
    };

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to apply leave', {
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
      message: `Failed to apply leave: ${error.message}`
    });
  }
}
