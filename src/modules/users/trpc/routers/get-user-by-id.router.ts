/**
 * Get User By ID tRPC Router
 * ===========================
 * tRPC procedure for getting user by employeeId.
 * Uses protectedProcedure to ensure user is logged in.
 * 
 * Based on old vodichron: GET /user/:id
 */

import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getUserByIdParamsSchema } from '../../schemas/crud/get-user-by-id.schemas';
import { getUserCredsByEmployeeId } from '../../store/crud/user-crud.store';
import { ApplicationUserRole } from '../../schemas/crud/update-user.schemas';

/**
 * Get User By ID tRPC Procedure
 * ==============================
 * Fetches user by employeeId with password blanked out.
 * 
 * Authorization: Employees can only view themselves
 * 
 * Input: { id: employeeId (UUID) }
 * Output: { data: { ...user, password: '' } }
 */
export const getUserByIdProcedure = protectedProcedure
  .input(getUserByIdParamsSchema)
  .query(async ({ input, ctx }) => {
    // ============================================================================
    // STEP 1: Initialize Performance Timer
    // ============================================================================
    const timer = new PerformanceTimer('getUserById_trpc');
    
    try {
      logger.info('🔍 Fetching user by ID via tRPC', {
        userUuid: ctx.user.uuid,
        targetEmployeeId: input.id,
        operation: 'getUserById_trpc'
      });

      const loggedInUserRole = ctx.user.role;

      // ==========================================================================
      // STEP 2: Get User by EmployeeId
      // ==========================================================================
      logger.debug('🔍 Fetching user credentials', { employeeId: input.id });

      let userProfile;
      try {
        userProfile = await getUserCredsByEmployeeId(input.id);
      } catch {
        logger.warn('⚠️ User not found via tRPC', {
          employeeId: input.id,
          requestedBy: ctx.user.uuid
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unable to find the details of the employee to update.'
        });
      }

      // ==========================================================================
      // STEP 3: Authorization Check - Employees Can Only View Themselves
      // ==========================================================================
      if (loggedInUserRole === ApplicationUserRole.employee && ctx.user.uuid !== userProfile.uuid) {
        logger.warn('🚫 Unauthorized view attempt via tRPC', {
          requestedBy: ctx.user.uuid,
          targetUser: userProfile.uuid,
          userRole: loggedInUserRole
        });

        logSecurity('GET_USER_BY_ID_UNAUTHORIZED_TRPC', 'medium', {
          userRole: loggedInUserRole,
          reason: 'Employee trying to view another user'
        }, undefined, ctx.user.uuid);

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied for the operation request.'
        });
      }

      const duration = timer.end();

      logger.info('✅ User fetched successfully via tRPC', {
        employeeId: input.id,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('GET_USER_BY_ID_SUCCESS_TRPC', 'low', {
        employeeId: input.id,
        duration
      }, undefined, ctx.user.uuid);

      // ==========================================================================
      // STEP 4: Return User with Password Blanked Out
      // ==========================================================================
      return {
        data: {
          ...userProfile,
          password: ''
        }
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

      logger.error('❌ Failed to fetch user by ID via tRPC', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      logSecurity('GET_USER_BY_ID_ERROR_TRPC', 'medium', {
        error: error.message,
        duration
      }, undefined, ctx.user.uuid);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  });
