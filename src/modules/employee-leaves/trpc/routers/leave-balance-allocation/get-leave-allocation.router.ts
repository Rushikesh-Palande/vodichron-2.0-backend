/**
 * Get Leave Allocation tRPC Router
 * =================================
 * Type-safe tRPC procedure for fetching employee leave allocation records
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { getLeaveAllocationInputSchema } from '../../../schemas/leave-balance-allocation.schemas';
import { getLeaveAllocation } from '../../../services/get-leave-allocation.service';
import { ApplicationUserRole } from '../../../types/employee-leave.types';

/**
 * Get Leave Allocation Procedure
 * ===============================
 * tRPC query for fetching employee leave allocation records for a specific year
 */
export const getLeaveAllocationProcedure = protectedProcedure
  .input(getLeaveAllocationInputSchema)
  .query(async ({ input, ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    const timer = new PerformanceTimer('tRPC Get Leave Allocation');

    try {
      logger.info('📊 Step 1: Get leave allocation request initiated via tRPC', {
        type: 'TRPC_GET_LEAVE_ALLOCATION',
        employeeId: input.employeeId,
        year: input.filters?.year,
        requestedBy: ctx.user.uuid,
        requestedByRole: ctx.user.role,
        timestamp: new Date().toISOString()
      });

      logSecurity('LEAVE_ALLOCATION_ACCESS_ATTEMPT', 'low', {
        employeeId: input.employeeId,
        requestedByRole: ctx.user.role
      }, clientIp, ctx.user.uuid);

      const result = await getLeaveAllocation(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role as ApplicationUserRole,
        email: ctx.user.email || ''
      });

      const duration = timer.end({ 
        employeeId: input.employeeId,
        count: result.length,
        success: true 
      }, 2000);

      logger.info('✅ Leave allocation fetched successfully via tRPC', {
        type: 'TRPC_GET_LEAVE_ALLOCATION_SUCCESS',
        employeeId: input.employeeId,
        count: result.length,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('LEAVE_ALLOCATION_ACCESS_SUCCESS', 'low', {
        employeeId: input.employeeId,
        count: result.length,
        duration
      }, clientIp, ctx.user.uuid);

      return {
        success: true,
        message: 'Leave allocation fetched successfully',
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end({ error: error.message }, 2000);

      logger.error('❌ Get leave allocation failed via tRPC', {
        type: 'TRPC_GET_LEAVE_ALLOCATION_ERROR',
        employeeId: input.employeeId,
        requestedBy: ctx.user.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('LEAVE_ALLOCATION_ACCESS_DENIED', 'medium', {
          employeeId: input.employeeId,
          reason: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      }

      throw error;
    }
  });
