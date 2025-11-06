/**
 * Create Customer tRPC Router
 * ===========================
 * Type-safe tRPC procedure for creating new customers
 * Provides end-to-end type safety from frontend to backend
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { CreateCustomerSchema } from '../../../schemas/crud/create-customer.schemas';
import { createCustomer } from '../../../services/crud/create-customer.service';
import { ApplicationUserRole } from '../../../types/customer.types';

/**
 * Create Customer Procedure
 * =========================
 * tRPC mutation for creating a new customer
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - Error handling
 * 
 * Access Control:
 * - Only super_user and admin roles can create customers
 * 
 * @input CreateCustomerInput - Validated customer data
 * @output { customerUuid: string } - UUID of created customer
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails or email exists
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const createCustomerProcedure = protectedProcedure
  .input(CreateCustomerSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Create customer request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      email: input.email,
      operation: 'createCustomer_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || ''
    };

    // Call service layer
    const result = await createCustomer(input, userContext);

    logger.info('✅ Customer created successfully (tRPC)', {
      customerUuid: result.customerUuid,
      userId: ctx.user.uuid
    });

    return result;
  });
