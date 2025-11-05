/**
 * Update Leave Status tRPC Router
 * ================================
 * Type-safe tRPC procedure for approving/rejecting leave requests
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { updateLeaveStatusInputSchema } from '../../../schemas/update-leave-status.schemas';
import { updateLeaveStatus } from '../../../services/update-leave-status.service';
import { ApplicationUserRole } from '../../../types/employee-leave.types';

/**
 * Update Leave Status Procedure
 * ==============================
 * tRPC mutation for updating leave approval status
 * 
 * Access Control:
 * - Only approvers, managers, directors, HR, superUser, and customers
 * - User must be in the approver list or have override permission
 */
export const updateLeaveStatusProcedure = protectedProcedure
  .input(updateLeaveStatusInputSchema)
  .mutation(async ({ input, ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    const timer = new PerformanceTimer('tRPC Update Leave Status');

    try {
      logger.info('📝 Step 1: Update leave status request initiated via tRPC', {
        type: 'TRPC_UPDATE_LEAVE_STATUS',
        leaveId: input.leaveId,
        approvalStatus: input.approvalStatus,
        requestedBy: ctx.user.uuid,
        requestedByRole: ctx.user.role,
        timestamp: new Date().toISOString()
      });

      logSecurity('LEAVE_STATUS_UPDATE_ATTEMPT', 'low', {
        leaveId: input.leaveId,
        approvalStatus: input.approvalStatus,
        requestedByRole: ctx.user.role
      }, clientIp, ctx.user.uuid);

      const result = await updateLeaveStatus(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role as ApplicationUserRole,
        email: ctx.user.email || ''
      });

      const duration = timer.end({ 
        leaveId: input.leaveId,
        success: true 
      }, 2000);

      logger.info('✅ Leave status updated successfully via tRPC', {
        type: 'TRPC_UPDATE_LEAVE_STATUS_SUCCESS',
        leaveId: input.leaveId,
        approvalStatus: input.approvalStatus,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('LEAVE_STATUS_UPDATE_SUCCESS', 'low', {
        leaveId: input.leaveId,
        approvalStatus: input.approvalStatus,
        duration
      }, clientIp, ctx.user.uuid);

      return {
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end({ error: error.message }, 2000);

      logger.error('❌ Update leave status failed via tRPC', {
        type: 'TRPC_UPDATE_LEAVE_STATUS_ERROR',
        leaveId: input.leaveId,
        requestedBy: ctx.user.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('LEAVE_STATUS_UPDATE_DENIED', 'medium', {
          leaveId: input.leaveId,
          reason: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      }

      throw error;
    }
  });
