/**
 * Delete Employee tRPC Router
 * ===========================
 * 
 * Type-safe tRPC procedure for deleting employees.
 * Provides end-to-end type safety from frontend to backend.
 * 
 * Based on: old vodichron deleteEmployee controller
 * Location: vodichron-backend-master/src/controllers/employeeController.ts (line 163-171)
 * 
 * Pattern:
 * tRPC Router → Service (business logic) → Store (database)
 * 
 * Procedure Type: Mutation (modifies data)
 * 
 * Input Schema: deleteEmployeeSchema (Zod validation)
 * Output Schema: deleteEmployeeOutputSchema
 * 
 * Usage (Frontend):
 * ```typescript
 * const result = await trpc.employee.delete.mutate({
 *   employeeUuid: "550e8400-e29b-41d4-a716-446655440000"
 * });
 * ```
 * 
 * Authorization:
 * - User must be authenticated
 * - Only HR and SuperUser can delete employees
 * 
 * Error Handling:
 * - FORBIDDEN: User not authorized
 * - NOT_FOUND: Employee not found
 * - INTERNAL_SERVER_ERROR: Database errors
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { deleteEmployeeSchema } from '../../../schemas/crud/delete.schemas';
import { deleteEmployee } from '../../../services/crud/delete.service';
import { ApplicationUserRole } from '../../../types/employee.types';

/**
 * Delete Employee Procedure
 * =========================
 * tRPC mutation for deleting an employee
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - Error handling
 * 
 * Access Control:
 * - Only hr and superUser roles can delete employees
 * 
 * @input DeleteEmployeeInput - Employee UUID to delete
 * @output { success: boolean, message: string } - Deletion confirmation
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError NOT_FOUND if employee not found
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const deleteEmployeeProcedure = protectedProcedure
  .input(deleteEmployeeSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Delete employee request received (tRPC)', {
      employeeUuid: input.employeeUuid,
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      operation: 'deleteEmployee_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || ''
    };

    // Call service layer
    const result = await deleteEmployee(input, userContext);

    logger.info('✅ Employee deleted successfully (tRPC)', {
      employeeUuid: input.employeeUuid,
      deletedBy: ctx.user.uuid
    });

    return result;
  });
