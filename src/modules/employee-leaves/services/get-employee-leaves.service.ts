/**
 * Get Employee Leaves Service
 * ============================
 * Business logic for fetching employee's own leave records
 * 
 * Responsibilities:
 * - Authorization checks (employees can only view their own leaves)
 * - Fetch paginated leave records with filters
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { GetEmployeeLeavesInput } from '../schemas/get-employee-leaves.schemas';
import { ApplicationUserRole, EmployeeLeave } from '../types/employee-leave.types';
import { getPaginatedEmployeeLeavesByEmployeeId } from '../stores/leave-application/get-leaves.store';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Employee Leaves Service
 * ============================
 * 
 * Fetches paginated leave records for a specific employee
 * 
 * Business Logic Flow:
 * 1. Authorization check (regular employees can only view their own leaves)
 * 2. Fetch paginated leaves with filters
 * 3. Return leave records
 * 
 * Authorization Rules:
 * - Regular employees: Can only view their own leaves
 * - Managers/Directors/HR/SuperUser: Can view any employee's leaves
 * 
 * @param input - Employee ID, pagination, and filters
 * @param user - Authenticated user context
 * @returns Paginated employee leave records
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function getEmployeeLeaves(
  input: GetEmployeeLeavesInput,
  user: UserContext
): Promise<EmployeeLeave[]> {
  const timer = new PerformanceTimer('getEmployeeLeaves_service');
  
  try {
    logger.info('🔍 Fetching employee leaves', {
      employeeId: input.employeeId,
      page: input.pagination.page,
      pageLimit: input.pagination.pageLimit,
      filters: input.filters,
      requestedBy: user.uuid,
      operation: 'getEmployeeLeaves'
    });

    // Authorization Check
    // Regular employees can only view their own leaves
    if (user.role === ApplicationUserRole.employee && user.uuid !== input.employeeId) {
      logger.warn('🚫 Access denied - Employee trying to view another employee\'s leaves', {
        userId: user.uuid,
        targetEmployeeId: input.employeeId
      });

      logSecurity('GET_EMPLOYEE_LEAVES_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Employee trying to view another employee\'s leaves'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. You can only view your own leave records.'
      });
    }

    // Fetch paginated employee leaves
    logger.debug('📊 Fetching leaves from database', {
      employeeId: input.employeeId,
      page: input.pagination.page,
      pageLimit: input.pagination.pageLimit
    });

    const employeeLeaves = await getPaginatedEmployeeLeavesByEmployeeId(
      input.employeeId,
      input.filters || {},
      input.pagination.page,
      input.pagination.pageLimit
    );

    const duration = timer.end();
    
    logger.info('✅ Employee leaves fetched successfully', {
      employeeId: input.employeeId,
      count: employeeLeaves.length,
      page: input.pagination.page,
      duration: `${duration}ms`
    });

    return employeeLeaves;

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to fetch employee leaves', {
      employeeId: input.employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    // Re-throw TRPCError as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Wrap other errors
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to fetch employee leaves: ${error.message}`
    });
  }
}
