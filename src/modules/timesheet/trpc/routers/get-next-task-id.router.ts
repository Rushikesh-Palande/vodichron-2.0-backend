/**
 * Get Next Task ID tRPC Router
 * ==============================
 * Type-safe tRPC procedure for getting the next available task ID
 */

import { protectedProcedure } from '../../../../trpc/trpc';
import { logger } from '../../../../utils/logger';
import { getNextTaskId } from '../../services/get-next-task-id.service';
import { getNextTaskIdSchema } from '../../schemas/get-next-task-id.schemas';

/**
 * Get Next Task ID Procedure
 * ===========================
 * tRPC query for getting the next available task ID for an employee
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Returns next sequential task ID (TASK001, TASK002, etc.)
 * - Used when user clicks "Add Task" in timesheet UI
 * - Task ID field will be pre-filled and disabled
 * 
 * Access Control:
 * - Employees can only get their own next task ID
 * - Admin/HR can get task ID for any employee
 * 
 * @input { employeeId: string }
 * @output { taskId: string, taskNumber: number, currentTaskCount: number }
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const getNextTaskIdProcedure = protectedProcedure
  .input(getNextTaskIdSchema)
  .query(async ({ input, ctx }) => {
    logger.info('📥 Get next task ID request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      employeeId: input.employeeId,
      operation: 'getNextTaskId_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role,
      email: ctx.user.email || ''
    };

    // Call service layer
    const result = await getNextTaskId(input.employeeId, userContext);

    logger.info('✅ Next task ID retrieved successfully (tRPC)', {
      employeeId: input.employeeId,
      taskId: result.taskId,
      userId: ctx.user.uuid
    });

    return result;
  });
