import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../../utils/logger';
import { getEmployeeByIdSchema } from '../../../schemas/crud/get-by-id.schemas';
import { getEmployeeById } from '../../../services/employee.service';

/**
 * Get Employee By ID Procedure
 * ============================
 * Fetches complete employee profile with authorization checks.
 * 
 * Authorization:
 * - Requires valid JWT token (authenticated user)
 * - Role-based access control applied in service layer:
 *   * Super users, admins, HR: Can view any employee
 *   * Managers/Directors: Can view their reportees + self
 *   * Customers: Can view employees mapped to their projects + self
 *   * Employees: Can view own profile only
 * 
 * Response Data:
 * - Full employee details (personal, employment, contact)
 * - Manager and director information (if applicable)
 * - User role and online status
 * - Decrypted sensitive fields (PAN, Aadhaar, Bank Account, PF)
 * 
 * Performance:
 * - Single database query with JOINs (no N+1 problem)
 * - Indexed UUID lookup for fast retrieval
 * - Automatic performance logging for slow queries
 * 
 * Security:
 * - JWT authentication required
 * - Authorization checks enforce data access policies
 * - Sensitive fields automatically decrypted
 * - All operations logged for audit trail
 * 
 * @input {employeeId} - UUID of the employee to fetch
 * @returns {EmployeeResponse} - Complete employee profile
 * @throws {TRPCError} BAD_REQUEST - Invalid employee ID format
 * @throws {TRPCError} UNAUTHORIZED - No valid authentication
 * @throws {TRPCError} FORBIDDEN - User lacks permission to view employee
 * @throws {TRPCError} NOT_FOUND - Employee doesn't exist
 * @throws {TRPCError} INTERNAL_SERVER_ERROR - Unexpected server error
 */
export const getByIdProcedure = protectedProcedure
  .input(getEmployeeByIdSchema)
  .query(async ({ input, ctx }) => {
    const { employeeId } = input;
    const clientIp = ctx.req.ip || 'unknown';
    
    // Start performance timer for the entire operation
    const timer = new PerformanceTimer('tRPC Employee GetById');
    
    try {
      logger.info('👤 Step 1: Employee profile fetch initiated via tRPC', {
        type: 'TRPC_EMPLOYEE_GETBYID',
        employeeId,
        requestedBy: ctx.user?.uuid,
        requestedByRole: ctx.user?.role,
        timestamp: new Date().toISOString()
      });

      // Log security event for employee access attempt
      logSecurity('EMPLOYEE_PROFILE_ACCESS_ATTEMPT', 'low', {
        employeeId,
        requestedByRole: ctx.user?.role
      }, clientIp, ctx.user?.uuid);

      // Step 2: Call service layer to handle business logic
      logger.debug('📞 Step 2: Calling employee service layer...', {
        employeeId,
        userId: ctx.user?.uuid
      });

      const employee = await getEmployeeById(employeeId, {
        uuid: ctx.user!.uuid,
        role: ctx.user!.role as any,
        email: ctx.user!.email || ''
      });

      // Step 3: Log success and performance metrics
      const duration = timer.end({ employeeId, success: true }, 2000);

      logger.info('✅ Employee profile fetched successfully via tRPC', {
        type: 'TRPC_EMPLOYEE_GETBYID_SUCCESS',
        employeeId,
        employeeName: employee.name,
        requestedBy: ctx.user?.uuid,
        duration: `${duration}ms`
      });

      logSecurity('EMPLOYEE_PROFILE_ACCESS_SUCCESS', 'low', {
        employeeId,
        employeeName: employee.name,
        duration
      }, clientIp, ctx.user?.uuid);

      // Return employee profile wrapped in data object
      return {
        success: true,
        message: 'Employee profile fetched successfully',
        data: {
          employee
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // Step 4: Error handling and logging
      const duration = timer.end({ employeeId, error: error.message }, 2000);

      logger.error('❌ Employee profile fetch failed via tRPC', {
        type: 'TRPC_EMPLOYEE_GETBYID_ERROR',
        employeeId,
        requestedBy: ctx.user?.uuid,
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
        stack: error.stack
      });

      // Log security event for access failure
      if (error.code === 'FORBIDDEN') {
        logSecurity('EMPLOYEE_PROFILE_ACCESS_DENIED', 'medium', {
          employeeId,
          reason: error.message,
          duration
        }, clientIp, ctx.user?.uuid);
      } else if (error.code !== 'NOT_FOUND') {
        // Don't log NOT_FOUND as security event (normal case)
        logSecurity('EMPLOYEE_PROFILE_ACCESS_ERROR', 'medium', {
          employeeId,
          error: error.message,
          duration
        }, clientIp, ctx.user?.uuid);
      }

      // Re-throw the error for tRPC to handle
      throw error;
    }
  });
