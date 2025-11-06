/**
 * Delete User tRPC Router
 * ========================
 * tRPC procedure for deleting user by employeeId.
 * Uses protectedProcedure to ensure user is logged in.
 * 
 */

import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { deleteUserParamsSchema } from '../../schemas/crud/delete-user.schemas';
import { getUserCredsByEmployeeId, deleteAppUserData } from '../../store/crud/user-crud.store';

/**
 * Admin User Roles
 * ================
 */
const ADMIN_USERS = ['super_user', 'hr', 'admin'];

/**
 * Delete User tRPC Procedure
 * ===========================
 * Deletes user application access by employeeId.
 * 
 * Authorization: Admin/HR/SuperUser only
 * 
 * Input: { id: employeeId (UUID) }
 * Output: { success, message, timestamp }
 */
export const deleteUserProcedure = protectedProcedure
  .input(deleteUserParamsSchema)
  .mutation(async ({ input, ctx }) => {
    // ============================================================================
    // STEP 1: Initialize Performance Timer
    // ============================================================================
    const timer = new PerformanceTimer('deleteUser_trpc');
    
    try {
      logger.info('🗑️ Deleting user via tRPC', {
        userUuid: ctx.user.uuid,
        targetEmployeeId: input.id,
        operation: 'deleteUser_trpc'
      });

      // ==========================================================================
      // STEP 2: Authorization Check - Only Admin/HR/SuperUser
      // ==========================================================================
      if (!ADMIN_USERS.includes(ctx.user.role)) {
        logger.warn('🚫 Unauthorized delete attempt via tRPC', {
          requestedBy: ctx.user.uuid,
          userRole: ctx.user.role
        });

        logSecurity('DELETE_USER_UNAUTHORIZED_TRPC', 'high', {
          userRole: ctx.user.role,
          reason: 'Only Admin/HR/SuperUser can delete users'
        }, undefined, ctx.user.uuid);

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied. Only Admin/HR/SuperUser can delete users.'
        });
      }

      // ==========================================================================
      // STEP 3: Check if User Exists
      // ==========================================================================
      logger.debug('🔍 Checking if user exists', { employeeId: input.id });

      try {
        await getUserCredsByEmployeeId(input.id);
      } catch {
        logger.warn('⚠️ User not found for deletion via tRPC', {
          employeeId: input.id,
          requestedBy: ctx.user.uuid
        });

        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Unable to find the user to delete'
        });
      }

      // ==========================================================================
      // STEP 4: Delete User
      // ==========================================================================
      logger.info('🗑️ Deleting user from database', {
        employeeId: input.id,
        requestedBy: ctx.user.uuid
      });

      const deletedCount = await deleteAppUserData(input.id);

      const duration = timer.end();

      logger.info('✅ User deleted successfully via tRPC', {
        employeeId: input.id,
        deletedCount,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('DELETE_USER_SUCCESS_TRPC', 'medium', {
        employeeId: input.id,
        deletedBy: ctx.user.uuid,
        deletedByRole: ctx.user.role,
        duration
      }, undefined, ctx.user.uuid);

      return {
        success: true,
        message: 'User deleted successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // ==========================================================================
      // STEP 5: Error Handling
      // ==========================================================================
      const duration = timer.end();

      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      logger.error('❌ Failed to delete user via tRPC', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      logSecurity('DELETE_USER_ERROR_TRPC', 'critical', {
        error: error.message,
        duration
      }, undefined, ctx.user.uuid);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  });
