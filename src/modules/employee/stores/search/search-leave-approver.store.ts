/**
 * Search Leave Approver Store
 * ===========================
 * Database queries for searching employees suitable for leave approver assignment
 * 
 * Pattern: Store layer handles all direct database interactions
 * Based on: old vodichron searchEmployeeForLeaveApproverAssigmentByKeyword (lines 312-330)
 * 
 * Special Logic:
 * - Only returns employees with designation='Director'
 * - Directors are the only ones who can approve leaves in the system
 * - This matches the exact SQL from old vodichron backend
 * 
 * SQL Logic (EXACT from old code):
 * ```sql
 * SELECT e.uuid, e.officialEmailId, e.name 
 * FROM employees e
 * WHERE e.designation='Director' 
 *   AND (e.name LIKE 'keyword%' OR e.officialEmailId LIKE 'keyword%')
 *   AND e.uuid NOT IN ('excluded1', 'excluded2', ...)
 * ORDER BY e.name ASC
 * LIMIT 10
 * ```
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { SearchLeaveApproverResult } from '../../schemas/search/search-leave-approver.schemas';

/**
 * Search Employees for Leave Approver Assignment
 * ==============================================
 * 
 * Searches for Director-level employees who can be assigned as leave approvers.
 * 
 * EXACT SQL from old vodichron (lines 314-326):
 * - Filters by designation='Director' (only Directors can approve leaves)
 * - Uses LIKE with keyword% (prefix matching) on name and email
 * - Excludes specified users
 * - Orders results alphabetically by name
 * - Limited to 10 results
 * 
 * Use Case:
 * - When assigning leave approver to an employee
 * - Only shows Directors who can approve leaves
 * - Prevents showing non-Director employees
 * 
 * @param keyword - Search term (min 2 chars, sanitized by caller)
 * @param excludedUsers - Array of user UUIDs to exclude
 * @returns Array of matching Director employees (max 10)
 */
export async function searchEmployeeForLeaveApprover(
  keyword: string,
  excludedUsers: string[] = []
): Promise<SearchLeaveApproverResult[]> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('searchEmployeeForLeaveApprover');

  try {
    logger.debug('🔍 Searching Directors for leave approver assignment', {
      keyword,
      excludedCount: excludedUsers.length,
      operation: 'searchEmployeeForLeaveApprover'
    });

    // ==========================================================================
    // STEP 2: Build SQL Query (EXACT match to old code)
    // ==========================================================================
    // Base query with designation filter and LIKE pattern matching
    // IMPORTANT: Only Directors can be leave approvers (designation='Director')
    
    let sql = `
      SELECT e.uuid, e.officialEmailId, e.name 
      FROM employees e
      WHERE e.designation = 'Director' 
        AND (e.name LIKE :keywordPattern OR e.officialEmailId LIKE :keywordPattern)
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
    // STEP 4: Add ORDER BY and LIMIT
    // ==========================================================================
    // Match old code: ORDER BY e.name ASC LIMIT 10 (line 326)
    sql += ` ORDER BY e.name ASC LIMIT 10`;

    logger.debug('📝 SQL Query built with Director designation filter', {
      keyword,
      excludedCount: excludedUsers.length,
      hasExclusions: excludedUsers.length > 0
    });

    // ==========================================================================
    // STEP 5: Execute Database Query
    // ==========================================================================
    const result = await sequelize.query<SearchLeaveApproverResult>(sql, {
      replacements,
      type: QueryTypes.SELECT,
      raw: true,
    });

    // ==========================================================================
    // STEP 6: Log Performance and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('SEARCH_LEAVE_APPROVER', keyword, duration);

    // Log performance warning if query is slow
    if (duration > 100) {
      logger.warn('⚠️  Slow leave approver search query', {
        keyword,
        duration: `${duration}ms`,
        resultCount: result.length
      });
    }

    logger.debug('✅ Leave approver search completed', {
      keyword,
      resultCount: result.length,
      description: 'Directors only',
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('SEARCH_LEAVE_APPROVER_ERROR', keyword, duration, error);

    logger.error('❌ Failed to search employees for leave approver', {
      keyword,
      excludedCount: excludedUsers.length,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while searching for leave approver: ${error.message}`);
  }
}
