/**
 * Search Role Assignment Store
 * ============================
 * 
 * Database operations for searching employees for role assignment.
 * EXACT match to old vodichron searchEmployeeForRoleAssigmentByKeyword (lines 266-291)
 * 
 * Key Features:
 * - Search by name OR email (LIKE keyword%)
 * - Only returns employees WITHOUT application_users record (NOT EXISTS)
 * - Exclude specific users
 * - Returns max 10 results (LIMIT 10)
 * - Performance monitoring
 * - Comprehensive logging
 * 
 * SQL Logic (EXACT from old code):
 * ```sql
 * SELECT e.uuid, e.officialEmailId, e.name 
 * FROM employees e
 * WHERE (e.name LIKE 'keyword%' OR e.officialEmailId LIKE 'keyword%')
 *   AND NOT EXISTS (
 *     SELECT 1 FROM application_users au WHERE e.uuid = au.employeeId
 *   )
 *   AND e.uuid NOT IN ('excluded1', 'excluded2', ...)
 * LIMIT 10
 * ```
 * 
 * TODO in old code (line 196):
 * "use function searchAllEmployeesByKeyword, by passing excluded ids"
 * We keep the current implementation to match exactly
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { SearchRoleAssignmentResult } from '../../schemas/search/search-role-assignment.schemas';

/**
 * Search Employee For Role Assignment By Keyword
 * ==============================================
 * 
 * Searches for employees who DON'T have a role assigned yet.
 * Returns employees WITHOUT a record in application_users table.
 * 
 * EXACT SQL from old vodichron (lines 268-287):
 * - Uses LIKE with keyword% (prefix matching)
 * - NOT EXISTS subquery to filter out employees with roles
 * - Excludes specified users
 * - Limited to 10 results
 * 
 * Use Case:
 * - When creating new application user, show only employees without roles
 * - Prevents assigning roles to employees who already have one
 * 
 * @param keyword - Search term (min 2 chars, sanitized by caller)
 * @param excludedUsers - Array of user UUIDs to exclude
 * @returns Array of matching employees without roles (max 10)
 */
export async function searchEmployeeForRoleAssignment(
  keyword: string,
  excludedUsers: string[] = []
): Promise<SearchRoleAssignmentResult[]> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('searchEmployeeForRoleAssignment');

  try {
    logger.debug('🔍 Searching employees for role assignment', {
      keyword,
      excludedCount: excludedUsers.length,
      operation: 'searchEmployeeForRoleAssignment'
    });

    // ==========================================================================
    // STEP 2: Build SQL Query (EXACT match to old code)
    // ==========================================================================
    // Base query with LIKE pattern matching on name and email
    // IMPORTANT: NOT EXISTS clause filters out employees who already have roles
    
    let sql = `
      SELECT e.uuid, e.officialEmailId, e.name 
      FROM employees e
      WHERE (e.name LIKE :keywordPattern OR e.officialEmailId LIKE :keywordPattern)
        AND NOT EXISTS (
          SELECT 1
          FROM application_users au
          WHERE e.uuid = au.employeeId
        )
    `;

    // Build replacement values
    const replacements: any = {
      keywordPattern: `${keyword}%`  // Prefix matching
    };

    // ==========================================================================
    // STEP 3: Add Exclusion Filter (if provided)
    // ==========================================================================
    // Exclude specific users from results
    // Old code: AND e.uuid NOT IN ('uuid1', 'uuid2', ...)
    if (excludedUsers.length > 0) {
      sql += ` AND e.uuid NOT IN (:excludedUsers)`;
      replacements.excludedUsers = excludedUsers;
    }

    // ==========================================================================
    // STEP 4: Add LIMIT (max 10 results)
    // ==========================================================================
    // Match old code: LIMIT 10 (line 287)
    sql += ` LIMIT 10`;

    logger.debug('📝 SQL Query built with NOT EXISTS filter', {
      keyword,
      excludedCount: excludedUsers.length,
      hasExclusions: excludedUsers.length > 0
    });

    // ==========================================================================
    // STEP 5: Execute Database Query
    // ==========================================================================
    const result = await sequelize.query<SearchRoleAssignmentResult>(sql, {
      replacements,
      type: QueryTypes.SELECT,
      raw: true,
    });

    // ==========================================================================
    // STEP 6: Log Performance and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('SEARCH_ROLE_ASSIGNMENT', keyword, duration);

    // Log performance warning if query is slow
    if (duration > 100) {
      logger.warn('⚠️  Slow role assignment search query', {
        keyword,
        duration: `${duration}ms`,
        resultCount: result.length
      });
    }

    logger.debug('✅ Role assignment search completed', {
      keyword,
      resultCount: result.length,
      description: 'Employees without roles',
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('SEARCH_ROLE_ASSIGNMENT_ERROR', keyword, duration, error);

    logger.error('❌ Failed to search employees for role assignment', {
      keyword,
      excludedCount: excludedUsers.length,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while searching for role assignment: ${error.message}`);
  }
}
