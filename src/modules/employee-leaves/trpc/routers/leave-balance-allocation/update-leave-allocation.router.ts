/**
 * Update Leave Allocation tRPC Router
 * ====================================
 * Type-safe tRPC procedure for updating employee leave allocations (HR only)
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { updateLeaveAllocationInputSchema } from '../../../schemas/leave-balance-allocation.schemas';
import { updateLeaveAllocation } from '../../../services/update-leave-allocation.service';
import { ApplicationUserRole } from '../../../types/employee-leave.types';

/**
 * Update Leave Allocation Procedure
 * ==================================
 * tRPC mutation for updating leave allocations (bulk operation)
 * 
 * Access Control:
 * - Only HR and SuperUser can update
 */
export const updateLeaveAllocationProcedure = protectedProcedure
  .input(updateLeaveAllocationInputSchema)
  .mutation(async ({ input, ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    const timer = new PerformanceTimer('tRPC Update Leave Allocation');

    try {
      logger.info('📝 Step 1: Update leave allocation request initiated via tRPC', {
        type: 'TRPC_UPDATE_LEAVE_ALLOCATION',
        count: input.leaveAllocation.length,
        requestedBy: ctx.user.uuid,
        requestedByRole: ctx.user.role,
        timestamp: new Date().toISOString()
      });

      logSecurity('LEAVE_ALLOCATION_UPDATE_ATTEMPT', 'low', {
        count: input.leaveAllocation.length,
        requestedByRole: ctx.user.role
      }, clientIp, ctx.user.uuid);

      const result = await updateLeaveAllocation(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role as ApplicationUserRole,
        email: ctx.user.email || ''
      });

      const duration = timer.end({ 
        count: result.count,
        success: true 
      }, 2000);

      logger.info('✅ Leave allocation updated successfully via tRPC', {
        type: 'TRPC_UPDATE_LEAVE_ALLOCATION_SUCCESS',
        count: result.count,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('LEAVE_ALLOCATION_UPDATE_SUCCESS', 'low', {
        count: result.count,
        duration
      }, clientIp, ctx.user.uuid);

      return {
        success: true,
        message: result.message,
        data: {
          count: result.count
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end({ error: error.message }, 2000);

      logger.error('❌ Update leave allocation failed via tRPC', {
        type: 'TRPC_UPDATE_LEAVE_ALLOCATION_ERROR',
        requestedBy: ctx.user.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('LEAVE_ALLOCATION_UPDATE_DENIED', 'medium', {
          reason: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      }

      throw error;
    }
  });
