/**
 * Update Leave Allocation Service
 * =================================
 * Business logic for updating employee leave allocation (HR only)
 * 
 * Responsibilities:
 * - Authorization checks (only HR/superUser)
 * - Batch update leave allocations
 * - Update allocated leaves and carry forward
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { UpdateLeaveAllocationInput } from '../schemas/leave-balance-allocation.schemas';
import { ApplicationUserRole } from '../types/employee-leave.types';
import { updateLeaveAllocatedForEmployee } from '../stores/leave-allocation/leave-allocation.store';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Update Leave Allocation Service
 * =================================
 * 
 * Updates leave allocation for employees (bulk operation)
 * Only HR and SuperUser can perform this operation
 * 
 * Business Logic:
 * 1. Authorization check (only HR/superUser)
 * 2. Validate input
 * 3. Batch update all allocations
 * 4. Return success message
 * 
 * @param input - Array of leave allocations to update
 * @param user - Authenticated user context
 * @returns Success message
 */
export async function updateLeaveAllocation(
  input: UpdateLeaveAllocationInput,
  user: UserContext
): Promise<{ message: string; count: number }> {
  const timer = new PerformanceTimer('updateLeaveAllocation_service');
  
  try {
    logger.info('📝 Updating leave allocation', {
      count: input.leaveAllocation.length,
      updatedBy: user.uuid,
      userRole: user.role,
      operation: 'updateLeaveAllocation'
    });

    // Authorization Check
    // Only HR and SuperUser can update leave allocations
    const allowedRoles = [
      ApplicationUserRole.hr,
      ApplicationUserRole.superUser,
    ];

    if (!allowedRoles.includes(user.role)) {
      logger.warn('🚫 Access denied - Non-admin trying to update leave allocation', {
        userId: user.uuid,
        userRole: user.role
      });

      logSecurity('UPDATE_LEAVE_ALLOCATION_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Non-admin trying to update leave allocation'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. Only HR and Super User can update leave allocations.'
      });
    }

    // Validate input
    if (!input.leaveAllocation || input.leaveAllocation.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No leave allocations provided for update.'
      });
    }

    logger.debug('💾 Updating leave allocations in database', {
      count: input.leaveAllocation.length
    });

    // Batch update all allocations
    await Promise.all(
      input.leaveAllocation.map(async (allocation) => {
        const id = allocation.uuid;
        const allocatedLeave = allocation.leavesAllocated;
        const carryForward = allocation.leavesCarryForwarded;

        logger.debug('📝 Updating allocation', {
          uuid: id,
          allocated: allocatedLeave,
          carryForward
        });

        return updateLeaveAllocatedForEmployee(id, allocatedLeave, carryForward);
      })
    );

    const duration = timer.end();
    
    logger.info('✅ Leave allocations updated successfully', {
      count: input.leaveAllocation.length,
      duration: `${duration}ms`
    });

    return {
      message: 'Leave allocations updated successfully.',
      count: input.leaveAllocation.length,
    };

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to update leave allocations', {
      error: error.message,
      duration: `${duration}ms`
    });

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to update leave allocations: ${error.message}`
    });
  }
}
