/**
 * Search All Employees Store
 * ==========================
 * 
 * Database operations for general employee search.
 * 
 * Key Features:
 * - Search by name OR email (LIKE keyword%)
 * - Exclude specific users
 * - Returns max 10 results (LIMIT 10)
 * - HMI-style step-by-step comments
 * - Performance monitoring
 * - Comprehensive logging
 * 
 * SQL Logic (EXACT from old code):
 * ```sql
 * SELECT e.uuid, e.officialEmailId, e.name 
 * FROM employees e
 * WHERE (e.name LIKE 'keyword%' OR e.officialEmailId LIKE 'keyword%')
 *   AND e.uuid NOT IN ('excluded1', 'excluded2', ...)
 * LIMIT 10
 * ```
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { SearchEmployeeResult } from '../../schemas/search/search-all-employees.schemas';

/**
 * Search All Employees By Keyword
 * ===============================
 * 
 * Searches for employees by name or email using LIKE pattern matching.
 * Returns basic employee info (uuid, name, email) for autocomplete/selection.
 * 
 * EXACT SQL from old vodichron (lines 249-260):
 * - Uses LIKE with keyword% (prefix matching)
 * - Excludes specified users
 * - Limited to 10 results
 * 
 * @param keyword - Search term (min 2 chars, sanitized by caller)
 * @param excludedUsers - Array of user UUIDs to exclude
 * @returns Array of matching employees (max 10)
 */
export async function searchAllEmployeesByKeyword(
  keyword: string,
  excludedUsers: string[] = []
): Promise<SearchEmployeeResult[]> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('searchAllEmployeesByKeyword');

  try {
    logger.debug('🔍 Searching employees by keyword', {
      keyword,
      excludedCount: excludedUsers.length,
      operation: 'searchAllEmployeesByKeyword'
    });

    // ==========================================================================
    // STEP 2: Build SQL Query (EXACT match to old code)
    // ==========================================================================
    // Base query with LIKE pattern matching on name and email
    // Uses % wildcard for prefix matching (e.g., 'john%')
    
    let sql = `
      SELECT e.uuid, e.officialEmailId, e.name 
      FROM employees e
      WHERE (e.name LIKE :keywordPattern OR e.officialEmailId LIKE :keywordPattern)
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
    // Match old code: LIMIT 10 (line 260)
    sql += ` LIMIT 10`;

    logger.debug('📝 SQL Query built', {
      keyword,
      excludedCount: excludedUsers.length,
      hasExclusions: excludedUsers.length > 0
    });

    // ==========================================================================
    // STEP 5: Execute Database Query
    // ==========================================================================
    const result = await sequelize.query<SearchEmployeeResult>(sql, {
      replacements,
      type: QueryTypes.SELECT,
      raw: true,
    });

    // ==========================================================================
    // STEP 6: Log Performance and Return
    // ==========================================================================
    const duration = timer.end();
    logDatabase('SEARCH_ALL_EMPLOYEES', keyword, duration);

    // Log performance warning if query is slow
    if (duration > 100) {
      logger.warn('⚠️  Slow search query detected', {
        keyword,
        duration: `${duration}ms`,
        resultCount: result.length
      });
    }

    logger.debug('✅ Employee search completed', {
      keyword,
      resultCount: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('SEARCH_EMPLOYEES_ERROR', keyword, duration, error);

    logger.error('❌ Failed to search employees', {
      keyword,
      excludedCount: excludedUsers.length,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while searching employees: ${error.message}`);
  }
}
