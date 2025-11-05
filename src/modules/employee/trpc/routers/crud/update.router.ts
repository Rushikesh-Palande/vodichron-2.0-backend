/**
 * Update Employee tRPC Router
 * ===========================
 * Type-safe tRPC procedure for updating existing employees
 * Provides end-to-end type safety from frontend to backend
 * Based on old vodichron employeeController.patch (lines 232-300)
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { updateEmployeeSchema } from '../../../schemas/crud/update.schemas';
import { updateEmployee } from '../../../services/crud/update.service';
import { ApplicationUserRole } from '../../../types/employee.types';

/**
 * Update Employee Procedure
 * =========================
 * tRPC mutation for updating an existing employee
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - Error handling
 * - Role-based field restrictions
 * - Password update support
 * 
 * Access Control:
 * - HR/Super users can update any employee and all fields
 * - Regular employees can only update their own profile
 * - Regular employees cannot update protected fields:
 *   * name, employeeId, currentCtc, officialEmailId
 *   * dateOfJoining, reportingManagerId, reportingDirectorId, designation
 * 
 * @input UpdateEmployeeInput - Validated employee data with uuid
 * @output { success: boolean, data: UpdateEmployeeInput } - Updated employee data
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if employee not found
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const updateEmployeeProcedure = protectedProcedure
  .input(updateEmployeeSchema)
  .mutation(async ({ input, ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    
    // Start performance timer for the entire operation
    const timer = new PerformanceTimer('tRPC Employee Update');
    
    try {
      logger.info('📥 Update employee request received (tRPC)', {
        type: 'TRPC_EMPLOYEE_UPDATE',
        employeeUuid: input.uuid,
        userId: ctx.user.uuid,
        userRole: ctx.user.role,
        operation: 'updateEmployee_trpc',
        timestamp: new Date().toISOString()
      });

      // Log security event for employee update attempt
      logSecurity('EMPLOYEE_UPDATE_ATTEMPT', 'low', {
        employeeUuid: input.uuid,
        requestedByRole: ctx.user.role,
        isSelfUpdate: ctx.user.uuid === input.uuid
      }, clientIp, ctx.user.uuid);

      // Extract user context from tRPC context
      const userContext = {
        uuid: ctx.user.uuid,
        role: ctx.user.role as ApplicationUserRole,
        email: ctx.user.email || ''
      };

      // Call service layer
      logger.debug('📞 Calling employee update service layer...', {
        employeeUuid: input.uuid,
        userId: ctx.user.uuid
      });

      const result = await updateEmployee(input, userContext);

      // Log success and performance metrics
      const duration = timer.end({ employeeUuid: input.uuid, success: true }, 2000);

      logger.info('✅ Employee updated successfully (tRPC)', {
        type: 'TRPC_EMPLOYEE_UPDATE_SUCCESS',
        employeeUuid: input.uuid,
        userId: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('EMPLOYEE_UPDATE_SUCCESS', 'low', {
        employeeUuid: input.uuid,
        userRole: ctx.user.role,
        isSelfUpdate: ctx.user.uuid === input.uuid,
        duration
      }, clientIp, ctx.user.uuid);

      return {
        success: true,
        message: 'Employee updated successfully',
        data: result.data,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // Error handling and logging
      const duration = timer.end({ employeeUuid: input.uuid, error: error.message }, 2000);

      logger.error('❌ Employee update failed via tRPC', {
        type: 'TRPC_EMPLOYEE_UPDATE_ERROR',
        employeeUuid: input.uuid,
        userId: ctx.user.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      // Log security event for update failure
      if (error.code === 'FORBIDDEN') {
        logSecurity('EMPLOYEE_UPDATE_ACCESS_DENIED', 'high', {
          employeeUuid: input.uuid,
          reason: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      } else if (error.code === 'BAD_REQUEST') {
        logSecurity('EMPLOYEE_UPDATE_BAD_REQUEST', 'medium', {
          employeeUuid: input.uuid,
          error: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      } else {
        logSecurity('EMPLOYEE_UPDATE_ERROR', 'high', {
          employeeUuid: input.uuid,
          error: error.message,
          duration
        }, clientIp, ctx.user.uuid);
      }

      // Re-throw the error for tRPC to handle
      throw error;
    }
  });
