/**
 * Application User List Data Store Module
 * ========================================
 * 
 * This module handles database operations for fetching application users.
 * Application users are employees who have been granted access to the system.
 * 
 * Key Features:
 * - Raw SQL queries for performance optimization
 * - Role-based filtering with security checks
 * - Database performance monitoring with timers
 * - Comprehensive error logging
 * - Type-safe return values
 * 
 * Database Operations:
 * - Get paginated application users with filters
 * - Role-based access control
 * - Exclude logged-in user from results
 * 
 * Performance Considerations:
 * - Uses INNER JOIN between employees and application_users
 * - Indexed lookups on role and status
 * - Parameterized queries for security
 * 
 * Based on old vodichron: src/store/userStore.ts -> getPaginatedUserList
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../database';
import { logger, logDatabase, logPerformance, PerformanceTimer } from '../../../utils/logger';

/**
 * Application User Interface
 * ==========================
 * Represents an application user in the system
 */
export interface ApplicationUser {
  uuid: string;
  name: string;
  designation: string | null;
  department: string | null;
  officialEmailId: string;
  role: 'super_user' | 'hr' | 'employee' | 'manager' | 'director' | 'customer';
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin: Date | null;
}

/**
 * User Filters Interface
 * ======================
 * Filter options for user list
 */
export interface UserFilters {
  role?: 'super_user' | 'hr' | 'employee' | 'manager' | 'director' | 'customer';
}

/**
 * Get Paginated Application Users List
 * ====================================
 * 
 * Fetches a paginated list of application users with optional role filtering.
 * Only returns users who have been granted application access.
 * 
 * Security Features:
 * - Excludes logged-in user from results
 * - Role-based filtering (allowedFetchRoles)
 * - Prevents unauthorized role access
 * 
 * Query Structure:
 * ---------------
 * SELECT: employee.uuid, name, designation, department, officialEmailId, role, status, lastLogin
 * FROM: employees (main table)
 * INNER JOIN: application_users (only employees with app access)
 * WHERE: 
 *   - employees.uuid != loggedInUserUuid (exclude self)
 *   - role filtering (specific role OR allowed roles)
 * ORDER BY: application_users.createdAt DESC (newest first)
 * LIMIT/OFFSET: Pagination
 * 
 * @param loggedInUserUuid - UUID of logged-in user (excluded from results)
 * @param filters - Filter criteria (role)
 * @param allowedFetchRoles - Roles that logged-in user is allowed to see
 * @param page - Page number (1-indexed)
 * @param pageLimit - Number of records per page
 * @returns Array of application users
 * @throws Error if database query fails
 */
export async function getPaginatedUserList(
  loggedInUserUuid: string,
  filters: UserFilters,
  allowedFetchRoles: string[],
  page?: number,
  pageLimit?: number
): Promise<ApplicationUser[]> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  // Track query execution time for performance monitoring and optimization
  const timer = new PerformanceTimer('getPaginatedUserList');
  
  try {
    logger.debug('👥 Fetching paginated application users', {
      loggedInUserUuid,
      filters,
      allowedFetchRoles,
      page,
      pageLimit,
      operation: 'getPaginatedUserList'
    });

    // ==========================================================================
    // STEP 2: Build Query Parameters Array
    // ==========================================================================
    // Initialize array for parameterized query values
    const queryParams: any[] = [];
    const filterClauses: string[] = [];

    // ==========================================================================
    // STEP 3: Build Role Filter Clause
    // ==========================================================================
    // Check if specific role filter is provided
    if (filters && filters.role) {
      // Filter by specific role
      filterClauses.push(`application_users.role = ?`);
      queryParams.push(filters.role);
      
      logger.debug('🔍 Applying role filter', {
        role: filters.role
      });
    } else {
      // No specific role filter - use allowed roles based on user permissions
      // Convert allowed roles to SQL IN clause format
      const allowedRoles = allowedFetchRoles.map((role) => `'${role}'`).join(',');
      filterClauses.push(`application_users.role IN (${allowedRoles})`);
      
      logger.debug('🔍 Applying allowed roles filter', {
        allowedRolesCount: allowedFetchRoles.length,
        allowedRoles: allowedFetchRoles
      });
    }

    // ==========================================================================
    // STEP 4: Build WHERE Clause
    // ==========================================================================
    // Combine base filter (exclude self) with additional filter clauses
    const whereClause = `WHERE employees.uuid != ? ${
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : ''
    }`;

    // ==========================================================================
    // STEP 5: Build Pagination Clause
    // ==========================================================================
    // Add LIMIT and OFFSET if pagination parameters provided
    let limitClause = '';
    if (page && pageLimit) {
      const offset = (page - 1) * pageLimit;
      limitClause = 'LIMIT ? OFFSET ?';
      queryParams.push(pageLimit, offset);
      
      logger.debug('📄 Applying pagination', {
        page,
        pageLimit,
        offset
      });
    }

    // ==========================================================================
    // STEP 6: Construct Complete SQL Query
    // ==========================================================================
    // Build comprehensive SQL query with INNER JOIN to get only users with app access
    // Uses INNER JOIN (not LEFT JOIN) because we only want employees with user accounts
    const sql = `
      SELECT 
        employees.uuid, 
        employees.name,
        employees.designation,
        employees.department,
        employees.officialEmailId,
        application_users.role,
        application_users.status,
        application_users.lastLogin
      FROM employees 
      INNER JOIN application_users ON employees.uuid = application_users.employeeId 
      ${whereClause} 
      ORDER BY application_users.createdAt DESC 
      ${limitClause}
    `;

    logger.debug('🔧 Executing SQL query', {
      hasRoleFilter: !!filters?.role,
      hasPagination: !!(page && pageLimit),
      paramCount: queryParams.length + 1  // +1 for loggedInUserUuid
    });

    // ==========================================================================
    // STEP 7: Execute Database Query
    // ==========================================================================
    // Execute query with parameterized values to prevent SQL injection
    // Add loggedInUserUuid as first parameter (for WHERE employees.uuid != ?)
    const result = await sequelize.query<ApplicationUser>(sql, {
      replacements: [loggedInUserUuid, ...queryParams],  // Parameterized query for security
      type: QueryTypes.SELECT,                           // Specify query type for proper result parsing
      raw: true,                                         // Return raw data (no model instances)
    });

    // ==========================================================================
    // STEP 8: Stop Timer and Log Performance
    // ==========================================================================
    const duration = timer.end();
    
    // Log database operation with performance metrics
    logDatabase('SELECT_APPLICATION_USERS', loggedInUserUuid, duration);
    
    // Log performance warning if query is slow (>200ms threshold)
    if (duration > 200) {
      logPerformance('SLOW_USER_LIST_QUERY', duration, {
        resultCount: result.length,
        page,
        pageLimit,
        hasFilters: !!filters?.role
      }, 200);
    }

    // ==========================================================================
    // STEP 9: Log Success and Return Results
    // ==========================================================================
    logger.debug('✅ Application users fetched successfully', {
      count: result.length,
      page,
      pageLimit,
      hasRoleFilter: !!filters?.role,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    // ==========================================================================
    // STEP 10: Error Handling
    // ==========================================================================
    const duration = timer.end();
    
    // Log database error with full details
    logDatabase('SELECT_USERS_ERROR', loggedInUserUuid, duration, error);
    
    logger.error('❌ Failed to fetch application users from database', {
      loggedInUserUuid,
      filters,
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      duration: `${duration}ms`
    });

    // Re-throw error with context for upper layers to handle
    throw new Error(`Database error while fetching application users: ${error.message}`);
  }
}
