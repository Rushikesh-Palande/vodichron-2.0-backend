/**
 * Update Password tRPC Router
 * ============================
 * tRPC procedure for updating user password.
 * Uses protectedProcedure to ensure user is logged in.
 * 
 * Based on old vodichron: POST /user/update-password
 */

import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { updatePasswordInputSchema } from '../../schemas/crud/update-password.schemas';
import { getUserCredsByEmployeeId, updateUserPassword } from '../../store/crud/user-crud.store';
import { hashPassword } from '../../../auth/helpers/hash-password.helper';
import { comparePasswords } from '../../../auth/helpers/compare-passwords';

/**
 * Update Password tRPC Procedure
 * ===============================
 * Updates user password after validating old password.
 * 
 * Authorization: User can only update their own password
 * 
 * Input: { id: employeeId, oldPassword, newPassword }
 * Output: { success, message, timestamp }
 */
export const updatePasswordProcedure = protectedProcedure
  .input(updatePasswordInputSchema)
  .mutation(async ({ input, ctx }) => {
    // ============================================================================
    // STEP 1: Initialize Performance Timer
    // ============================================================================
    const timer = new PerformanceTimer('updatePassword_trpc');
    
    try {
      logger.info('🔒 Updating user password via tRPC', {
        userUuid: ctx.user.uuid,
        targetEmployeeId: input.id,
        operation: 'updatePassword_trpc'
      });

      // ==========================================================================
      // STEP 2: Get User Credentials
      // ==========================================================================
      logger.debug('🔍 Fetching user credentials', { employeeId: input.id });

      let userCreds;
      try {
        userCreds = await getUserCredsByEmployeeId(input.id);
      } catch {
        logger.warn('⚠️ User not found for password update via tRPC', {
          employeeId: input.id,
          requestedBy: ctx.user.uuid
        });

        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Unable to find the user'
        });
      }

      // ==========================================================================
      // STEP 3: Validate Old Password
      // ==========================================================================
      logger.debug('🔐 Validating old password', { employeeId: input.id });

      const isOldPasswordValid = await comparePasswords(input.oldPassword, userCreds.password);

      if (!isOldPasswordValid) {
        logger.warn('⚠️ Invalid old password provided via tRPC', {
          employeeId: input.id,
          requestedBy: ctx.user.uuid
        });

        logSecurity('UPDATE_PASSWORD_INVALID_OLD_PASSWORD_TRPC', 'medium', {
          employeeId: input.id,
          reason: 'Incorrect current password'
        }, undefined, ctx.user.uuid);

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unable to verify the user details. Check current password.'
        });
      }

      // ==========================================================================
      // STEP 4: Hash New Password
      // ==========================================================================
      logger.debug('🔒 Hashing new password', { employeeId: input.id });

      const hashedPassword = await hashPassword(input.newPassword);

      // ==========================================================================
      // STEP 5: Update Password in Database
      // ==========================================================================
      logger.info('✏️ Updating password in database', {
        employeeId: input.id,
        requestedBy: ctx.user.uuid
      });

      await updateUserPassword(input.id, hashedPassword);

      const duration = timer.end();

      logger.info('✅ Password updated successfully via tRPC', {
        employeeId: input.id,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('UPDATE_PASSWORD_SUCCESS_TRPC', 'medium', {
        employeeId: input.id,
        updatedBy: ctx.user.uuid,
        duration
      }, undefined, ctx.user.uuid);

      return {
        success: true,
        message: 'Password updated successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // ==========================================================================
      // STEP 6: Error Handling
      // ==========================================================================
      const duration = timer.end();

      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      logger.error('❌ Failed to update password via tRPC', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      logSecurity('UPDATE_PASSWORD_ERROR_TRPC', 'critical', {
        error: error.message,
        duration
      }, undefined, ctx.user.uuid);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  });
