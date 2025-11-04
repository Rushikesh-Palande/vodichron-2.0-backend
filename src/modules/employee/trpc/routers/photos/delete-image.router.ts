/**
 * Delete Employee Image tRPC Procedure
 * =====================================
 * 
 * tRPC procedure for deleting employee photos.
 * Based on: old vodichron deleteEmployeeImage controller (lines 473-488)
 * 
 * Pattern:
 * tRPC Procedure → Service (business logic) → Store (database)
 * 
 * Usage:
 * ```typescript
 * const result = await trpc.employee.deleteEmployeeImage.mutate({
 *   id: "employee-uuid"
 * });
 * ```
 * 
 * Authorization:
 * - User must be authenticated (protectedProcedure)
 * - Should be restricted to self OR HR/SuperUser
 * - Note: Old code had no explicit authorization (improvement needed)
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { deleteEmployeeImage } from '../../../services/photos/delete-image.service';
import config from '../../../../../config';
import { 
  deleteImageInputSchema, 
  deleteImageOutputSchema 
} from '../../../schemas/photos/delete-image.schemas';

/**
 * Delete Employee Image Procedure
 * ================================
 * 
 * Type-safe tRPC procedure for deleting employee photos.
 * 
 * Features:
 * - Automatic input validation (Zod schema)
 * - Type-safe response (auto-generated TypeScript types)
 * - Built-in authentication (protectedProcedure)
 * - Updates database (sets recentPhotograph to empty string)
 * - Deletes physical file from filesystem
 * 
 * Input:
 * - id: string (UUID) - Employee UUID
 * 
 * Output:
 * - success: boolean
 * - message: string
 */
export const deleteEmployeeImageProcedure = protectedProcedure
  .input(deleteImageInputSchema)
  .output(deleteImageOutputSchema)
  .mutation(async ({ input, ctx }) => {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Delete employee image request received (tRPC)', {
      employeeId: input.id,
      requestedBy: ctx.user.uuid,
      procedure: 'employee.deleteEmployeeImage'
    });

    try {
      // ==========================================================================
      // STEP 2: Get Service Configuration
      // ==========================================================================
      const assetPath = config.asset.path;

      const serviceConfig = {
        assetPath,
      };

      // ==========================================================================
      // STEP 3: Call Service Layer
      // ==========================================================================
      // Service layer handles business logic and file operations
      const result = await deleteEmployeeImage(
        input,
        {
          uuid: ctx.user.uuid,
          role: ctx.user.role,
          email: ctx.user.email || ''
        },
        serviceConfig
      );

      // ==========================================================================
      // STEP 4: Log Success and Return
      // ==========================================================================
      logger.info('✅ Employee image deleted successfully (tRPC)', {
        employeeId: input.id,
        deletedBy: ctx.user.uuid
      });

      return result;

    } catch (error: any) {
      // ==========================================================================
      // STEP 5: Error Handling
      // ==========================================================================
      logger.error('💥 Delete employee image tRPC error', {
        type: 'DELETE_EMPLOYEE_IMAGE_TRPC_ERROR',
        employeeId: input.id,
        userId: ctx.user.uuid,
        error: error?.message,
        stack: error?.stack
      });

      // tRPC will automatically wrap this in a TRPCError
      throw error;
    }
  });
