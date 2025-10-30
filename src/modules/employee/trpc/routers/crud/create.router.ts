/**
 * Create Employee tRPC Router
 * ===========================
 * Type-safe tRPC procedure for creating new employees
 * Provides end-to-end type safety from frontend to backend
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { createEmployeeSchema } from '../../../schemas/crud/create.schemas';
import { createEmployee } from '../../../services/crud/create.service';
import { ApplicationUserRole } from '../../../types/employee.types';

/**
 * Create Employee Procedure
 * =========================
 * tRPC mutation for creating a new employee
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - Error handling
 * 
 * Access Control:
 * - Only super_user, admin, and hr roles can create employees
 * 
 * @input CreateEmployeeInput - Validated employee data
 * @output { employeeUuid: string } - UUID of created employee
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails or email exists
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const createEmployeeProcedure = protectedProcedure
  .input(createEmployeeSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Create employee request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      employeeId: input.employeeId,
      operation: 'createEmployee_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || ''
    };

    // Call service layer
    const result = await createEmployee(input, userContext);

    logger.info('✅ Employee created successfully (tRPC)', {
      employeeUuid: result.employeeUuid,
      userId: ctx.user.uuid
    });

    return result;
  });
