/**
 * Check User Exists tRPC Router
 * ==============================
 * tRPC procedure for checking if user exists by email.
 * Uses protectedProcedure to ensure user is logged in.
 * 
 * Based on old vodichron: POST /user/check-exists
 */

import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { checkUserExistsInputSchema } from '../../schemas/crud/check-user-exists.schemas';
import { getUserByEmail } from '../../store/crud/user-crud.store';

/**
 * Check User Exists tRPC Procedure
 * =================================
 * Checks if a user exists by email address.
 * 
 * Input: { email: string }
 * Output: boolean (true if exists, false otherwise)
 */
export const checkUserExistsProcedure = protectedProcedure
  .input(checkUserExistsInputSchema)
  .query(async ({ input, ctx }) => {
    // ============================================================================
    // STEP 1: Initialize Performance Timer
    // ============================================================================
    const timer = new PerformanceTimer('checkUserExists_trpc');
    
    try {
      logger.info('🔍 Checking if user exists via tRPC', {
        userUuid: ctx.user.uuid,
        email: input.email,
        operation: 'checkUserExists_trpc'
      });

      // ==========================================================================
      // STEP 2: Check if User Exists by Email
      // ==========================================================================
      logger.debug('🔍 Querying user by email', { email: input.email });

      const userProfile = await getUserByEmail(input.email);

      // ==========================================================================
      // STEP 3: Determine Result
      // ==========================================================================
      const exists = !!userProfile;

      const duration = timer.end();

      logger.info('✅ User existence check completed via tRPC', {
        email: input.email,
        exists,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('CHECK_USER_EXISTS_SUCCESS_TRPC', 'low', {
        email: input.email,
        exists,
        duration
      }, undefined, ctx.user.uuid);

      // Return plain boolean (matches old backend behavior)
      return exists;

    } catch (error: any) {
      // ==========================================================================
      // STEP 4: Error Handling
      // ==========================================================================
      const duration = timer.end();

      logger.error('❌ Failed to check user existence via tRPC', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      logSecurity('CHECK_USER_EXISTS_ERROR_TRPC', 'medium', {
        error: error.message,
        duration
      }, undefined, ctx.user.uuid);

      throw error;
    }
  });
