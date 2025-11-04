/**
 * Unified Registration tRPC Router
 * =================================
 * 
 * tRPC procedure for unified employee & user registration
 * Uses protectedProcedure to ensure user is logged in
 * Authorization checks (Admin/HR/SuperUser only) are done in service layer
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { unifiedRegisterSchema } from '../../../schemas/unified/unified-register.schemas';
import { handleUnifiedRegisterTRPC } from '../../../services/unified/unified-register.service';

/**
 * Unified Register tRPC Procedure
 * ================================
 * 
 * Registers both employee and user in one atomic operation
 * Requires authentication (protectedProcedure)
 * 
 * Input: UnifiedRegisterInput (employee fields + user registration fields)
 * Output: { success, message, data: { employeeUuid, userUuid }, timestamp }
 */
export const unifiedRegisterProcedure = protectedProcedure
  .input(unifiedRegisterSchema)
  .mutation(async ({ ctx, input }) => {
    logger.info('📥 Unified registration request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      employeeId: input.employeeId,
      operation: 'unifiedRegister_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role,
      email: ctx.user.email || ''
    };

    // Call service layer
    const result = await handleUnifiedRegisterTRPC(input, userContext);

    logger.info('✅ Unified registration completed successfully (tRPC)', {
      employeeUuid: result.data.employeeUuid,
      userUuid: result.data.userUuid,
      userId: ctx.user.uuid
    });

    return result;
  });
