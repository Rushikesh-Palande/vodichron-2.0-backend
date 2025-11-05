/**
 * Get Reportee Leaves tRPC Router
 * ================================
 * Type-safe tRPC procedure for fetching reportee leave records (for managers/HR)
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { getReporteeLeavesInputSchema } from '../../../schemas/get-reportee-leaves.schemas';
import { getReporteeLeaves } from '../../../services/get-reportee-leaves.service';
import { ApplicationUserRole } from '../../../types/employee-leave.types';

/**
 * Get Reportee Leaves Procedure
 * ==============================
 * tRPC query for fetching paginated leave records for reportees/team members
 * 
 * Access Control:
 * - Only managers, directors, HR, and superUser can access
 * - Regular employees are forbidden
 * 
 * @input GetReporteeLeavesInput - Pagination and filters
 * @output Array of reportee leave records
 */
export const getReporteeLeavesProcedure = protectedProcedure
  .input(getReporteeLeavesInputSchema)
  .query(async ({ input, ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    const timer = new PerformanceTimer('tRPC Get Reportee Leaves');

    try {
      logger.info('📊 Step 1: Get reportee leaves request initiated via tRPC', {
        type: 'TRPC_GET_REPORTEE_LEAVES',
        requestedBy: ctx.user.uuid,
        requestedByRole: ctx.user.role,
        timestamp: new Date().toISOString()
      });

      logSecurity('REPORTEE_LEAVES_ACCESS_ATTEMPT', 'low', {
        requestedByRole: ctx.user.role
      }, clientIp, ctx.user.uuid);

      const result = await getReporteeLeaves(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role as ApplicationUserRole,
        email: ctx.user.email || ''
      });

      const duration = timer.end({ 
        count: result.length,
        success: true 
      }, 2000);

      logger.info('✅ Reportee leaves fetched successfully via tRPC', {
        type: 'TRPC_GET_REPORTEE_LEAVES_SUCCESS',
        count: result.length,
        requestedBy: ctx.user.uuid,
        requestedByRole: ctx.user.role,
        duration: `${duration}ms`
      });

      logSecurity('REPORTEE_LEAVES_ACCESS_SUCCESS', 'low', {
        count: result.length,
        duration
      }, clientIp, ctx.user.uuid);

      return {
        success: true,
        message: 'Reportee leaves fetched successfully',
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end({ error: error.message }, 2000);

      logger.error('❌ Get reportee leaves failed via tRPC', {
        type: 'TRPC_GET_REPORTEE_LEAVES_ERROR',
        requestedBy: ctx.user.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('REPORTEE_LEAVES_ACCESS_DENIED', 'medium', {
          reason: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      }

      throw error;
    }
  });
