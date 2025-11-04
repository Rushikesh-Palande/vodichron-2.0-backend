/**
 * Get Application Users List Service
 * ===================================
 * 
 * Business logic for fetching paginated application user list for Express REST API.
 * This service handles Express Request/Response objects directly.
 * 
 * Application users are employees who have been granted system access.
 * Different from employee list - this only shows users with app accounts.
 * 
 * Authorization:
 * - All authenticated users can view application users
 * - Super users can see other super users
 * - Non-super users cannot see super users (security restriction)
 * 
 * Based on old vodichron: userController.getAppUsers (lines 35-54)
 * 
 * Note: tRPC implementation will be in trpc/routers/user-list.router.ts
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { getPaginatedUserList } from '../store/user-list.store';

/**
 * Application User Role Enum
 * ==========================
 * Matches database ENUM values
 */
export enum ApplicationUserRole {
  superUser = 'super_user',
  hr = 'hr',
  employee = 'employee',
  manager = 'manager',
  director = 'director',
  customer = 'customer'
}

/**
 * Handle Get Application Users List
 * ==================================
 * 
 * Fetches paginated list of application users with role-based filtering.
 * 
 * Request body:
 * {
 *   pagination: { page: 1, pageLimit: 20 },
 *   filters: { role?: 'super_user' | 'hr' | 'employee' | 'manager' | 'director' | 'customer' }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: 'Application users fetched successfully',
 *   data: ApplicationUser[],
 *   pagination: { page, pageLimit, totalRecords },
 *   timestamp: ISO string
 * }
 * 
 * Authorization Logic:
 * - If filtering for super_user role: Only super users can do this
 * - If logged-in user is NOT super_user: Cannot see super users in results
 * - All other users can see: hr, employee, manager, director, customer
 */
export async function handleGetApplicationUsersList(req: Request, res: Response) {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('getApplicationUsersList_service');
  const user = (req as any).user;

  try {
    logger.info('👥 Fetching application users list', {
      requestedBy: user?.uuid,
      requestedByRole: user?.role,
      operation: 'getApplicationUsersList'
    });

    // ==========================================================================
    // STEP 2: Validate Authentication
    // ==========================================================================
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================================================
    // STEP 3: Extract and Validate Request Parameters
    // ==========================================================================
    const { pagination, filters } = req.body;
    const loggedInUserRole = user.role;
    
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
    // STEP 4: Authorization Check - Role Filter Validation
    // ==========================================================================
    // Check if user is trying to filter by super_user role
    if (filters?.role && filters.role === ApplicationUserRole.superUser) {
      // Only super users can filter on other super users
      if (loggedInUserRole !== ApplicationUserRole.superUser) {
        logger.warn('🚫 Access denied - Non-super user trying to filter super users', {
          requestedBy: user.uuid,
          requestedByRole: loggedInUserRole,
          attemptedFilter: filters.role
        });

        logSecurity('USER_LIST_SUPER_USER_FILTER_DENIED', 'high', {
          userRole: loggedInUserRole,
          attemptedFilter: filters.role,
          reason: 'Only Super users can filter on other Super users'
        }, undefined, user.uuid);

        return res.status(403).json({
          success: false,
          message: 'Only Super users can filter on other Super users.',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // ==========================================================================
    // STEP 5: Determine Allowed Roles Based on User's Role
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
    // STEP 6: Process Pagination Parameters
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
    // STEP 7: Fetch Application Users from Database
    // ==========================================================================
    const users = await getPaginatedUserList(
      user.uuid,
      filters || {},
      allowedFetchRoles,
      page,
      pageLimit
    );

    logger.debug('📊 Database query complete', {
      usersCount: users.length
    });

    // ==========================================================================
    // STEP 8: Success Response
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Application users list fetched successfully', {
      count: users.length,
      page,
      pageLimit,
      hasRoleFilter: !!filters?.role,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('GET_APPLICATION_USERS_SUCCESS', 'low', {
      count: users.length,
      userRole: loggedInUserRole,
      hasRoleFilter: !!filters?.role,
      duration
    }, undefined, user.uuid);

    return res.status(200).json({
      success: true,
      message: 'Application users fetched successfully',
      data: users,
      pagination: {
        page,
        pageLimit,
        totalRecords: users.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 9: Error Handling
    // ==========================================================================
    const duration = timer.end();

    logger.error('❌ Failed to fetch application users list', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_APPLICATION_USERS_ERROR', 'critical', {
      error: error.message,
      duration
    }, undefined, user?.uuid);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch application users list. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
}
