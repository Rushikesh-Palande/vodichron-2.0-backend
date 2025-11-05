/**
 * Get Leave Allocation Service
 * =============================
 * Business logic for fetching employee leave allocation records
 * 
 * Responsibilities:
 * - Authorization checks
 * - Fetch leave allocation by year
 * - Filter and transform special leaves
 * - Return allocation records
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { GetLeaveAllocationInput } from '../schemas/leave-balance-allocation.schemas';
import { ApplicationUserRole, EmployeeLeaveAllocation } from '../types/employee-leave.types';
import { getEmployeeLeaveAllocationByEmployeeId } from '../stores/leave-allocation/leave-allocation.store';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Leave Allocation Service
 * =============================
 * 
 * Fetches leave allocation records for an employee for a specific year
 * 
 * Business Logic:
 * 1. Authorization check
 * 2. Fetch allocation records by employee and year
 * 3. Filter out zero-balance records (0 allocated, 0 applied)
 * 4. Transform special leaves (show 999 balance for unlimited)
 * 5. Return allocation records
 * 
 * @param input - Employee ID and year
 * @param user - Authenticated user context
 * @returns Leave allocation records
 */
export async function getLeaveAllocation(
  input: GetLeaveAllocationInput,
  user: UserContext
): Promise<EmployeeLeaveAllocation[]> {
  const timer = new PerformanceTimer('getLeaveAllocation_service');
  
  try {
    const year = input.filters?.year || new Date().getFullYear().toString();

    logger.info('🔍 Fetching leave allocation', {
      employeeId: input.employeeId,
      year,
      requestedBy: user.uuid,
      operation: 'getLeaveAllocation'
    });

    // Authorization Check
    if (user.role === ApplicationUserRole.employee && user.uuid !== input.employeeId) {
      logger.warn('🚫 Access denied - Employee trying to view another employee\'s allocation', {
        userId: user.uuid,
        targetEmployeeId: input.employeeId
      });

      logSecurity('GET_LEAVE_ALLOCATION_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Employee trying to view another employee\'s allocation'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. You can only view your own leave allocation.'
      });
    }

    // Fetch leave allocation
    const employeeLeaves = await getEmployeeLeaveAllocationByEmployeeId(
      input.employeeId,
      year
    );

    // Filter out leaves with 0 allocated and 0 applied
    const filterSpecialLeaves = employeeLeaves.filter(leaves => {
      const leavesAllocated = parseFloat(`${leaves.leavesAllocated}`);
      const leavesApplied = parseFloat(`${leaves.leavesApplied}`);
      
      if (leavesAllocated === 0 && leavesApplied === 0) {
        return false;
      }
      
      return true;
    });

    // Transform special leaves (show 999 for unlimited balance)
    const transformSpecialLeaves = filterSpecialLeaves.map(leaves => {
      const leavesApplied = parseFloat(`${leaves.leavesApplied}`);
      const leavesBalance = parseFloat(`${leaves.leavesBalance}`);
      
      // For special leaves: if applied > 0 and balance <= 0, show 999
      if (leavesApplied > 0 && leavesBalance <= 0) {
        return {
          ...leaves,
          leavesBalance: 999, // Frontend shows this as "-" (unlimited)
        };
      }
      
      return leaves;
    });

    const duration = timer.end();
    
    logger.info('✅ Leave allocation fetched successfully', {
      employeeId: input.employeeId,
      year,
      count: transformSpecialLeaves.length,
      duration: `${duration}ms`
    });

    return transformSpecialLeaves;

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to fetch leave allocation', {
      employeeId: input.employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to fetch leave allocation: ${error.message}`
    });
  }
}
