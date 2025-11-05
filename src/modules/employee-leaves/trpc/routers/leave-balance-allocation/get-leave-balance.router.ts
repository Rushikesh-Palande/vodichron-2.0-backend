/**
 * Get Leave Balance tRPC Router
 * ==============================
 * Type-safe tRPC procedure for fetching employee leave balance
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { getLeaveBalanceInputSchema } from '../../../schemas/leave-balance-allocation.schemas';
import { getLeaveBalance } from '../../../services/get-leave-balance.service';
import { ApplicationUserRole } from '../../../types/employee-leave.types';

/**
 * Get Leave Balance Procedure
 * ============================
 * tRPC query for fetching employee leave balance for a specific year
 */
export const getLeaveBalanceProcedure = protectedProcedure
  .input(getLeaveBalanceInputSchema)
  .query(async ({ input, ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    const timer = new PerformanceTimer('tRPC Get Leave Balance');

    try {
      logger.info('📊 Step 1: Get leave balance request initiated via tRPC', {
        type: 'TRPC_GET_LEAVE_BALANCE',
        employeeId: input.employeeId,
        year: input.filters?.year,
        requestedBy: ctx.user.uuid,
        requestedByRole: ctx.user.role,
        timestamp: new Date().toISOString()
      });

      logSecurity('LEAVE_BALANCE_ACCESS_ATTEMPT', 'low', {
        employeeId: input.employeeId,
        requestedByRole: ctx.user.role
      }, clientIp, ctx.user.uuid);

      const result = await getLeaveBalance(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role as ApplicationUserRole,
        email: ctx.user.email || ''
      });

      const duration = timer.end({ 
        employeeId: input.employeeId,
        success: true 
      }, 2000);

      logger.info('✅ Leave balance fetched successfully via tRPC', {
        type: 'TRPC_GET_LEAVE_BALANCE_SUCCESS',
        employeeId: input.employeeId,
        year: result.year,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('LEAVE_BALANCE_ACCESS_SUCCESS', 'low', {
        employeeId: input.employeeId,
        year: result.year,
        duration
      }, clientIp, ctx.user.uuid);

      return {
        success: true,
        message: 'Leave balance fetched successfully',
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end({ error: error.message }, 2000);

      logger.error('❌ Get leave balance failed via tRPC', {
        type: 'TRPC_GET_LEAVE_BALANCE_ERROR',
        employeeId: input.employeeId,
        requestedBy: ctx.user.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('LEAVE_BALANCE_ACCESS_DENIED', 'medium', {
          employeeId: input.employeeId,
          reason: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      }

      throw error;
    }
  });
