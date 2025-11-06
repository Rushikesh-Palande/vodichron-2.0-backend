/**
 * Update User tRPC Router
 * ========================
 * tRPC procedure for updating user (PATCH).
 * Uses protectedProcedure to ensure user is logged in.
 * 
 * Based on old vodichron: PATCH /user
 */

import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { updateUserInputSchema, ApplicationUserRole } from '../../schemas/crud/update-user.schemas';
import { getUserCredsByEmployeeId, updateApplicationUserData } from '../../store/crud/user-crud.store';
import { hashPassword } from '../../../auth/helpers/hash-password.helper';

/**
 * Update User tRPC Procedure
 * ===========================
 * Updates user role, password, and status.
 * 
 * Authorization:
 * - Employees can only update themselves
 * - Only SuperUsers can assign SuperUser role
 * 
 * Input: { uuid?, employeeId, password?, role, status? }
 * Output: { success, message, timestamp }
 */
export const updateUserProcedure = protectedProcedure
  .input(updateUserInputSchema)
  .mutation(async ({ input, ctx }) => {
    // ============================================================================
    // STEP 1: Initialize Performance Timer
    // ============================================================================
    const timer = new PerformanceTimer('updateUser_trpc');
    
    try {
      logger.info('✏️ Updating user via tRPC', {
        userUuid: ctx.user.uuid,
        targetEmployeeId: input.employeeId,
        operation: 'updateUser_trpc'
      });

      const loggedInUserRole = ctx.user.role;

      // ==========================================================================
      // STEP 2: Get Existing User
      // ==========================================================================
      logger.debug('🔍 Fetching existing user', { employeeId: input.employeeId });

      let existingUser;
      try {
        existingUser = await getUserCredsByEmployeeId(input.employeeId);
      } catch {
        logger.warn('⚠️ User not found for update via tRPC', {
          employeeId: input.employeeId,
          requestedBy: ctx.user.uuid
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unable to find the details of the employee to update.'
        });
      }

      // ==========================================================================
      // STEP 3: Authorization Check - Employees Can Only Update Themselves
      // ==========================================================================
      if (loggedInUserRole === ApplicationUserRole.employee && ctx.user.uuid !== existingUser.employeeId) {
        logger.warn('🚫 Unauthorized update attempt via tRPC', {
          requestedBy: ctx.user.uuid,
          targetUser: existingUser.employeeId,
          userRole: loggedInUserRole
        });

        logSecurity('UPDATE_USER_UNAUTHORIZED_TRPC', 'high', {
          userRole: loggedInUserRole,
          reason: 'Employee trying to update another user'
        }, undefined, ctx.user.uuid);

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied for the operation request.'
        });
      }

      // ==========================================================================
      // STEP 4: Handle Password - Keep Existing if Not Provided
      // ==========================================================================
      let encryptedPassword = existingUser.password;
      if (input.password) {
        logger.debug('🔒 Hashing new password', { employeeId: input.employeeId });
        encryptedPassword = await hashPassword(input.password);
      }

      // ==========================================================================
      // STEP 5: SuperUser Authorization Check
      // ==========================================================================
      if (input.role === ApplicationUserRole.superUser && loggedInUserRole !== ApplicationUserRole.superUser) {
        logger.warn('🚫 Unauthorized attempt to assign SuperUser role via tRPC', {
          requestedBy: ctx.user.uuid,
          requestedByRole: loggedInUserRole,
          targetUser: input.employeeId
        });

        logSecurity('UPDATE_USER_SUPER_USER_UNAUTHORIZED_TRPC', 'critical', {
          userRole: loggedInUserRole,
          reason: 'Only Super users can add other Super users'
        }, undefined, ctx.user.uuid);

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Super users can add other Super users.'
        });
      }

      // ==========================================================================
      // STEP 6: Update User in Database
      // ==========================================================================
      logger.info('✏️ Updating user in database', {
        employeeId: input.employeeId,
        role: input.role,
        hasNewPassword: !!input.password,
        hasStatus: !!input.status,
        requestedBy: ctx.user.uuid
      });

      const updateData = {
        employeeId: input.employeeId,
        password: encryptedPassword,
        role: input.role,
        status: input.status
      };

      await updateApplicationUserData(updateData, ctx.user.uuid);

      const duration = timer.end();

      logger.info('✅ User updated successfully via tRPC', {
        employeeId: input.employeeId,
        role: input.role,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('UPDATE_USER_SUCCESS_TRPC', 'medium', {
        employeeId: input.employeeId,
        role: input.role,
        updatedBy: ctx.user.uuid,
        updatedByRole: ctx.user.role,
        duration
      }, undefined, ctx.user.uuid);

      return {
        success: true,
        message: 'User details saved successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // ==========================================================================
      // STEP 7: Error Handling
      // ==========================================================================
      const duration = timer.end();

      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      logger.error('❌ Failed to update user via tRPC', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      logSecurity('UPDATE_USER_ERROR_TRPC', 'critical', {
        error: error.message,
        duration
      }, undefined, ctx.user.uuid);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  });
