/**
 * Update Master Data tRPC Router
 * ===============================
 * Type-safe tRPC procedure for updating master data configuration
 * Provides end-to-end type safety from frontend to backend
 * 
 * Based on: old vodichron PATCH /common-data/master/save
 */

import { protectedProcedure } from '../../../../trpc/trpc';
import { logger } from '../../../../utils/logger';
import { updateMasterData } from '../../services/update-master-data.service';
import { updateMasterDataInputSchema } from '../../schemas/update-master-data.schemas';

/**
 * Update Master Data Procedure
 * =============================
 * 
 * tRPC procedure for updating master data configuration
 * 
 * Access Control:
 * - Uses protectedProcedure (requires authentication)
 * - Service layer enforces HR/Admin/SuperUser authorization
 * 
 * Input:
 * {
 *   masterFields: Array<{
 *     name: string;        // e.g., 'designation', 'department'
 *     value: string[];     // e.g., ['Software Engineer', 'Manager', ...]
 *   }>
 * }
 * 
 * Output:
 * {
 *   message: string;
 *   count: number;
 *   updatedFields: string[];
 * }
 * 
 * Errors:
 * - UNAUTHORIZED: User not authenticated
 * - FORBIDDEN: User not HR/Admin/SuperUser
 * - BAD_REQUEST: Invalid input data
 * - INTERNAL_SERVER_ERROR: Database or system error
 * 
 * Access Control:
 * - ADMIN_USERS only (super_user, admin, hr)
 * - Service layer enforces authorization
 * - Managers/Directors can READ but NOT UPDATE
 * 
 * @input UpdateMasterDataInput - Master fields to update
 * @output UpdateMasterDataOutput - Success message and updated fields
 * @throws TRPCError UNAUTHORIZED if user not authenticated
 * @throws TRPCError FORBIDDEN if user not HR/Admin/SuperUser
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const updateMasterDataProcedure = protectedProcedure
  .input(updateMasterDataInputSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Update master data request received (tRPC)', {
      fieldsCount: input.masterFields.length,
      fieldNames: input.masterFields.map((f) => f.name),
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      operation: 'updateMasterData_trpc'
    });

    // Call service layer with user context from tRPC
    const result = await updateMasterData(input, {
      uuid: ctx.user.uuid,
      role: ctx.user.role as any,
      email: ctx.user.email || ''
    });

    logger.info('✅ Master data updated successfully (tRPC)', {
      count: result.count,
      updatedFields: result.updatedFields,
      userId: ctx.user.uuid,
      operation: 'updateMasterData_trpc'
    });

    return result;
  });
