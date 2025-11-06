/**
 * Update Customer tRPC Router
 * ===========================
 * Type-safe tRPC procedures for updating and deleting customers
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { z } from 'zod';
import { updateCustomerData, deleteCustomer } from '../../../services/crud/update-customer.service';
import { UpdateCustomerSchema } from '../../../schemas/crud/create-customer.schemas';
import { ApplicationUserRole } from '../../../types/customer.types';

/**
 * Update Customer Procedure
 */
export const updateCustomerProcedure = protectedProcedure
  .input(UpdateCustomerSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Update customer request received (tRPC)', {
      customerId: input.uuid,
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      operation: 'updateCustomer_trpc'
    });

    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || ''
    };

    const result = await updateCustomerData(input, userContext);

    logger.info('✅ Customer updated successfully (tRPC)', {
      customerId: input.uuid,
      userId: ctx.user.uuid
    });

    return result;
  });

/**
 * Delete Customer Procedure
 */
export const deleteCustomerProcedure = protectedProcedure
  .input(z.object({ customerId: z.string().uuid() }))
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Delete customer request received (tRPC)', {
      customerId: input.customerId,
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      operation: 'deleteCustomer_trpc'
    });

    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || ''
    };

    await deleteCustomer(input.customerId, userContext);

    logger.info('✅ Customer deleted successfully (tRPC)', {
      customerId: input.customerId,
      userId: ctx.user.uuid
    });

    return { success: true };
  });
