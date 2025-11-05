/**
 * Get Employee Leaves tRPC Router
 * =================================
 * Type-safe tRPC procedure for fetching employee leave records
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { getEmployeeLeavesInputSchema } from '../../../schemas/get-employee-leaves.schemas';
import { getEmployeeLeaves } from '../../../services/get-employee-leaves.service';
import { ApplicationUserRole } from '../../../types/employee-leave.types';

/**
 * Get Employee Leaves Procedure
 * ==============================
 * tRPC query for fetching paginated leave records for a specific employee
 * 
 * Access Control:
 * - Employees can only view their own leaves
 * - Managers/Directors/HR/SuperUser can view any employee's leaves
 * 
 * @input GetEmployeeLeavesInput - Employee ID, pagination, filters
 * @output Array of employee leave records
 */
export const getEmployeeLeavesProcedure = protectedProcedure
  .input(getEmployeeLeavesInputSchema)
  .query(async ({ input, ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    const timer = new PerformanceTimer('tRPC Get Employee Leaves');

    try {
      logger.info('📊 Step 1: Get employee leaves request initiated via tRPC', {
        type: 'TRPC_GET_EMPLOYEE_LEAVES',
        employeeId: input.employeeId,
        requestedBy: ctx.user.uuid,
        requestedByRole: ctx.user.role,
        timestamp: new Date().toISOString()
      });

      logSecurity('EMPLOYEE_LEAVES_ACCESS_ATTEMPT', 'low', {
        employeeId: input.employeeId,
        requestedByRole: ctx.user.role
      }, clientIp, ctx.user.uuid);

      const result = await getEmployeeLeaves(input, {
        uuid: ctx.user.uuid,
        role: ctx.user.role as ApplicationUserRole,
        email: ctx.user.email || ''
      });

      const duration = timer.end({ 
        employeeId: input.employeeId,
        count: result.length,
        success: true 
      }, 2000);

      logger.info('✅ Employee leaves fetched successfully via tRPC', {
        type: 'TRPC_GET_EMPLOYEE_LEAVES_SUCCESS',
        employeeId: input.employeeId,
        count: result.length,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('EMPLOYEE_LEAVES_ACCESS_SUCCESS', 'low', {
        employeeId: input.employeeId,
        count: result.length,
        duration
      }, clientIp, ctx.user.uuid);

      return {
        success: true,
        message: 'Employee leaves fetched successfully',
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end({ error: error.message }, 2000);

      logger.error('❌ Get employee leaves failed via tRPC', {
        type: 'TRPC_GET_EMPLOYEE_LEAVES_ERROR',
        employeeId: input.employeeId,
        requestedBy: ctx.user.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('EMPLOYEE_LEAVES_ACCESS_DENIED', 'medium', {
          employeeId: input.employeeId,
          reason: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      }

      throw error;
    }
  });
