import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getEmployeesListSchema } from '../../schemas/employee.schemas';
import { getEmployeesList } from '../../services/employee.service';

/**
 * Get Employees List Procedure
 * ============================
 * Fetches paginated list of employees with optional filters.
 * 
 * Authorization:
 * - Requires valid JWT token (authenticated user)
 * - Role-based access control: Admin, HR, Directors, Managers only
 * 
 * Response Data:
 * - Array of employees with all fields
 * - Decrypted sensitive fields (PAN, Aadhaar, Bank Account, PF)
 * - Online status for each employee
 * 
 * @input {pagination, filters} - Page/limit and optional filters
 * @returns {EmployeeListResponse} - Array of employees
 * @throws {TRPCError} FORBIDDEN - User lacks permission
 * @throws {TRPCError} INTERNAL_SERVER_ERROR - Unexpected server error
 */
export const listProcedure = protectedProcedure
  .input(getEmployeesListSchema)
  .query(async ({ input, ctx }) => {
    const { pagination, filters } = input;
    const clientIp = ctx.req.ip || 'unknown';
    
    const timer = new PerformanceTimer('tRPC Employee List');
    
    try {
      logger.info('📊 Step 1: Employee list fetch initiated via tRPC', {
        type: 'TRPC_EMPLOYEE_LIST',
        requestedBy: ctx.user?.uuid,
        requestedByRole: ctx.user?.role,
        pagination,
        filters,
        timestamp: new Date().toISOString()
      });

      logSecurity('EMPLOYEE_LIST_ACCESS_ATTEMPT', 'low', {
        requestedByRole: ctx.user?.role,
        pagination
      }, clientIp, ctx.user?.uuid);

      // Step 2: Call service layer
      logger.debug('📞 Step 2: Calling employee service layer...', {
        userId: ctx.user?.uuid,
        pagination
      });

      const employees = await getEmployeesList(pagination, filters, {
        uuid: ctx.user!.uuid,
        role: ctx.user!.role as any,
        email: ctx.user!.email || ''
      });

      // Step 3: Log success
      const duration = timer.end({ success: true, count: employees.length }, 2000);

      logger.info('✅ Employees list fetched successfully via tRPC', {
        type: 'TRPC_EMPLOYEE_LIST_SUCCESS',
        count: employees.length,
        requestedBy: ctx.user?.uuid,
        duration: `${duration}ms`
      });

      logSecurity('EMPLOYEE_LIST_ACCESS_SUCCESS', 'low', {
        count: employees.length,
        duration
      }, clientIp, ctx.user?.uuid);

      return {
        success: true,
        message: 'Employees list fetched successfully',
        data: employees,
        pagination: {
          page: pagination?.page || 1,
          pageLimit: pagination?.pageLimit || 20,
          totalRecords: employees.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const duration = timer.end({ error: error.message }, 2000);

      logger.error('❌ Employees list fetch failed via tRPC', {
        type: 'TRPC_EMPLOYEE_LIST_ERROR',
        requestedBy: ctx.user?.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      if (error.code === 'FORBIDDEN') {
        logSecurity('EMPLOYEE_LIST_ACCESS_DENIED', 'medium', {
          reason: error.message,
          duration
        }, clientIp, ctx.user?.uuid);
      } else {
        logSecurity('EMPLOYEE_LIST_ACCESS_ERROR', 'medium', {
          error: error.message,
          duration
        }, clientIp, ctx.user?.uuid);
      }

      throw error;
    }
  });
