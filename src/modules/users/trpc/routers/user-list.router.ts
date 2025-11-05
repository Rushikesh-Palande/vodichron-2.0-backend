/**
 * Application User List tRPC Router
 * ==================================
 * 
 * tRPC procedure for fetching paginated application users list.
 * Uses protectedProcedure to ensure user is logged in.
 * 
 * Based on old vodichron: POST /user/list
 */

import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { userListInputSchema } from '../../schemas/user-list.schemas';
import { getPaginatedUserList } from '../../store/user-list.store';
import { ApplicationUserRole } from '../../services/user-list.service';

/**
 * Get Application Users List tRPC Procedure
 * ==========================================
 * 
 * Returns paginated list of application users with optional role filtering.
 * Requires authentication (protectedProcedure).
 * 
 * Authorization:
 * - All authenticated users can view application users
 * - Super users can see other super users
 * - Non-super users cannot see super users
 * 
 * Input:
 * {
 *   pagination: { page: 1, pageLimit: 20 },
 *   filters: { role?: 'super_user' | ... }
 * }
 * 
 * Output:
 * {
 *   success: true,
 *   message: 'Application users fetched successfully',
 *   data: ApplicationUser[],
 *   pagination: { page, pageLimit, totalRecords },
 *   timestamp: ISO string
 * }
 */
export const getApplicationUsersListProcedure = protectedProcedure
  .input(userListInputSchema)
  .query(async ({ input, ctx }) => {
    // ============================================================================
    // STEP 1: Initialize Performance Timer
    // ============================================================================
    const timer = new PerformanceTimer('getApplicationUsersList_trpc');
    
    try {
      logger.info('👥 Fetching application users list via tRPC', {
        userUuid: ctx.user.uuid,
        userRole: ctx.user.role,
        operation: 'getApplicationUsersList_trpc'
      });

      // ==========================================================================
      // STEP 2: Extract Request Parameters
      // ==========================================================================
      const loggedInUserRole = ctx.user.role;
      const { pagination, filters } = input;
      
      // Get all possible roles
      const allRoles = Object.values(ApplicationUserRole);
      
      // Default to all roles user is allowed to see
      let allowedFetchRoles = allRoles;
      
      logger.debug('📋 Request parameters', {
        pagination,
        filters,
        loggedInUserRole
      });

      // ==========================================================================
      // STEP 3: Authorization Check - Role Filter Validation
      // ==========================================================================
      // Check if user is trying to filter by super_user role
      if (filters?.role && filters.role === ApplicationUserRole.superUser) {
        // Only super users can filter on other super users
        if (loggedInUserRole !== ApplicationUserRole.superUser) {
          logger.warn('🚫 Access denied - Non-super user trying to filter super users', {
            requestedBy: ctx.user.uuid,
            requestedByRole: loggedInUserRole,
            attemptedFilter: filters.role
          });

          logSecurity('USER_LIST_SUPER_USER_FILTER_DENIED', 'high', {
            userRole: loggedInUserRole,
            attemptedFilter: filters.role,
            reason: 'Only Super users can filter on other Super users'
          }, undefined, ctx.user.uuid);

          throw new Error('Only Super users can filter on other Super users.');
        }
      }
      
      // ==========================================================================
      // STEP 4: Determine Allowed Roles Based on User's Role
      // ==========================================================================
      // If logged-in user is NOT super_user, exclude super_user from results
      if (loggedInUserRole !== ApplicationUserRole.superUser) {
        allowedFetchRoles = allRoles.filter(
          (role) => role !== ApplicationUserRole.superUser
        );
        
        logger.debug('🔒 Non-super user - excluding super_user from results', {
          allowedRolesCount: allowedFetchRoles.length,
          excludedRole: ApplicationUserRole.superUser
        });
      }

      // ==========================================================================
      // STEP 5: Process Pagination Parameters
      // ==========================================================================
      let page = pagination?.page || 1;
      const pageLimit = pagination?.pageLimit || 20;

      // Ensure page is at least 1
      if (!page || page < 1) {
        page = 1;
      }

      logger.debug('📄 Pagination parameters', {
        page,
        pageLimit
      });

      // ==========================================================================
      // STEP 6: Fetch Application Users from Database
      // ==========================================================================
      const users = await getPaginatedUserList(
        ctx.user.uuid,
        filters || {},
        allowedFetchRoles,
        page,
        pageLimit
      );

      logger.debug('📊 Database query complete', {
        usersCount: users.length
      });

      // ==========================================================================
      // STEP 7: Success Response
      // ==========================================================================
      const duration = timer.end();

      logger.info('✅ Application users list fetched successfully via tRPC', {
        count: users.length,
        page,
        pageLimit,
        hasRoleFilter: !!filters?.role,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('GET_APPLICATION_USERS_SUCCESS_TRPC', 'low', {
        count: users.length,
        userRole: loggedInUserRole,
        hasRoleFilter: !!filters?.role,
        duration
      }, undefined, ctx.user.uuid);

      return {
        success: true,
        message: 'Application users fetched successfully',
        data: users,
        pagination: {
          page,
          pageLimit,
          totalRecords: users.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // ==========================================================================
      // STEP 8: Error Handling
      // ==========================================================================
      const duration = timer.end();

      logger.error('❌ Failed to fetch application users list via tRPC', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      logSecurity('GET_APPLICATION_USERS_ERROR_TRPC', 'critical', {
        error: error.message,
        duration
      }, undefined, ctx.user.uuid);

      throw error;
    }
  });
