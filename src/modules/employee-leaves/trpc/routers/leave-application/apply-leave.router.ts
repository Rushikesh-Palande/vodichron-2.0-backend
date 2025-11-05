/**
 * Apply Leave tRPC Router
 * ========================
 * Type-safe tRPC procedure for applying for leave
 * Provides end-to-end type safety from frontend to backend
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { applyLeaveInputSchema } from '../../../schemas/apply-leave.schemas';
import { applyLeave } from '../../../services/apply-leave.service';
import { ApplicationUserRole } from '../../../types/employee-leave.types';

/**
 * Apply Leave Procedure
 * =====================
 * tRPC mutation for submitting a new leave application
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - Error handling
 * - Customer approver integration
 * 
 * Access Control:
 * - All authenticated users can apply
 * - Employees can only apply for themselves
 * - Managers/HR can apply on behalf of employees
 * 
 * @input ApplyLeaveInput - Validated leave application data
 * @output { leaveUuid: string, requestNumber: number } - Created leave details
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails or dates overlap
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const applyLeaveProcedure = protectedProcedure
  .input(applyLeaveInputSchema)
  .mutation(async ({ input, ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    const timer = new PerformanceTimer('tRPC Apply Leave');

    try {
      logger.info('📥 Step 1: Apply leave request initiated via tRPC', {
        type: 'TRPC_APPLY_LEAVE',
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        startDate: input.leaveStartDate,
        endDate: input.leaveEndDate,
        requestedBy: ctx.user.uuid,
        requestedByRole: ctx.user.role,
        timestamp: new Date().toISOString()
      });

      // Log security event for leave application
      logSecurity('LEAVE_APPLICATION_ATTEMPT', 'low', {
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        requestedByRole: ctx.user.role
      }, clientIp, ctx.user.uuid);

      // Step 2: Call service layer
      logger.debug('📞 Step 2: Calling apply leave service layer...', {
        employeeId: input.employeeId,
        userId: ctx.user.uuid
      });

      const result = await applyLeave(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role as ApplicationUserRole,
        email: ctx.user.email || ''
      });

      // Step 3: Log success
      const duration = timer.end({ 
        leaveUuid: result.leaveUuid, 
        requestNumber: result.requestNumber,
        success: true 
      }, 2000);

      logger.info('✅ Leave application submitted successfully via tRPC', {
        type: 'TRPC_APPLY_LEAVE_SUCCESS',
        leaveUuid: result.leaveUuid,
        requestNumber: result.requestNumber,
        employeeId: input.employeeId,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('LEAVE_APPLICATION_SUCCESS', 'low', {
        leaveUuid: result.leaveUuid,
        requestNumber: result.requestNumber,
        duration
      }, clientIp, ctx.user.uuid);

      return {
        success: true,
        message: 'Leave application submitted successfully',
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end({ error: error.message }, 2000);

      logger.error('❌ Leave application failed via tRPC', {
        type: 'TRPC_APPLY_LEAVE_ERROR',
        employeeId: input.employeeId,
        requestedBy: ctx.user.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('LEAVE_APPLICATION_DENIED', 'medium', {
          employeeId: input.employeeId,
          reason: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      } else {
        logSecurity('LEAVE_APPLICATION_ERROR', 'medium', {
          employeeId: input.employeeId,
          error: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      }

      throw error;
    }
  });
