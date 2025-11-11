/**
 * Get Next Task ID Service
 * =========================
 * Service to get the next available task ID for an employee
 * Used when adding new tasks in the timesheet UI
 */

import { TRPCError } from '@trpc/server';
import { logger, PerformanceTimer } from '../../../utils/logger';
import { getEmployeeTaskCount } from '../stores/get-employee-task-count.store';
import { formatTaskNumber } from '../helpers/generate-task-id';

/**
 * User Context Interface
 * ----------------------
 */
interface UserContext {
  uuid: string;
  role: string;
  email: string;
}

/**
 * Get Next Task ID Service
 * =========================
 * Returns the next available task ID for an employee
 * Used by frontend when user clicks "Add Task"
 * 
 * @param employeeId - UUID of employee
 * @param user - Authenticated user context
 * @returns Next task ID (e.g., TASK001, TASK002, etc.)
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function getNextTaskId(
  employeeId: string,
  user: UserContext
): Promise<{ taskId: string; taskNumber: number; currentTaskCount: number }> {
  const timer = new PerformanceTimer('getNextTaskId_service');
  
  try {
    logger.info('🔢 Getting next task ID for employee', {
      employeeId,
      requestedBy: user.uuid,
      userRole: user.role,
      operation: 'getNextTaskId'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    const adminRoles = ['super_user', 'admin', 'hr'];
    const isAdmin = adminRoles.includes(user.role);
    const isOwnTimesheet = user.uuid === employeeId;

    if (!isAdmin && !isOwnTimesheet) {
      logger.warn('🚫 Access denied - User cannot get task ID for another employee', {
        userId: user.uuid,
        userRole: user.role,
        targetEmployeeId: employeeId
      });

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only get task IDs for yourself.'
      });
    }

    // ==========================================================================
    // STEP 2: Get Current Task Count
    // ==========================================================================
    logger.debug('📊 Fetching employee task count', { employeeId });
    
    const currentTaskCount = await getEmployeeTaskCount(employeeId);
    const nextTaskNumber = currentTaskCount + 1;
    const taskId = formatTaskNumber(nextTaskNumber);

    // ==========================================================================
    // STEP 3: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Next task ID generated successfully', {
      employeeId,
      currentTaskCount,
      nextTaskNumber,
      taskId,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    return {
      taskId,
      taskNumber: nextTaskNumber,
      currentTaskCount
    };

  } catch (error: unknown) {
    // ==========================================================================
    // STEP 4: Error Handling
    // ==========================================================================
    const duration = timer.end();

    // If it's already a TRPCError, re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log unexpected errors
    logger.error('❌ Failed to get next task ID', {
      employeeId,
      requestedBy: user.uuid,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    });

    // Throw generic error to avoid exposing internal details
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get next task ID. Please try again.'
    });
  }
}
