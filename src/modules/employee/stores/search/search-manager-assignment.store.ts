/**
 * Search Manager Assignment Store
 * ================================
 * Database queries for searching employees suitable for manager/director assignment
 * 
 * Pattern: Store layer handles all direct database interactions
 * Based on: old vodichron searchEmployeeForReportingManagerAssigmentByKeyword
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger } from '../../../../utils/logger';
import type { SearchManagerAssignmentResult } from '../../schemas/search/search-manager-assignment.schemas';

/**
 * Search Employees for Manager Assignment
 * ========================================
 * Searches employees by name or email for manager/director assignment
 * 
 * Features:
 * - Searches by name (LIKE match)
 * - Searches by official email (LIKE match)
 * - Excludes specified user IDs
 * - Returns top 10 results ordered by name
 * - Returns only essential fields (uuid, name, email)
 * 
 * Database Query Structure:
 * ------------------------
 * SELECT: uuid, name, officialEmailId
 * FROM: employees
 * WHERE: (name LIKE :keyword% OR officialEmailId LIKE :keyword%)
 *        AND uuid NOT IN (:excludedUsers) [if provided]
 * ORDER BY: name ASC
 * LIMIT: 10
 * 
 * @param keyword - Sanitized search keyword
 * @param excludedUsers - Array of user UUIDs to exclude from results
 * @returns Array of matching employees with basic info
 */
export async function searchEmployeesForManagerAssignment(
  keyword: string,
  excludedUsers: string[] = []
): Promise<SearchManagerAssignmentResult[]> {
  try {
    logger.info('🔍 Searching employees for manager assignment', {
      keyword,
      excludedCount: excludedUsers.length,
      operation: 'searchEmployeesForManagerAssignment_store'
    });

    // Build SQL query with parameterized values for security
    let sql = `
      SELECT e.uuid, e.officialEmailId, e.name 
      FROM employees e
      WHERE (e.name LIKE :keyword OR e.officialEmailId LIKE :keyword)
    `;

    // Prepare replacements object for parameterized query
    const replacements: Record<string, unknown> = {
      keyword: `${keyword}%`
    };

    // Add exclusion filter if needed
    if (excludedUsers.length > 0) {
      sql += ' AND e.uuid NOT IN (:excludedUsers)';
      replacements.excludedUsers = excludedUsers;
    }

    // Add ordering and limit
    sql += ' ORDER BY e.name ASC LIMIT 10';

    // Execute query with parameterized values to prevent SQL injection
    const employees = await sequelize.query<SearchManagerAssignmentResult>(sql, {
      replacements,
      type: QueryTypes.SELECT,
      raw: true,
    });

    logger.info('✅ Manager assignment search completed', {
      resultsCount: employees.length,
      keyword,
      operation: 'searchEmployeesForManagerAssignment_store'
    });

    return employees;

  } catch (error) {
    logger.error('💥 Manager assignment search store error', {
      type: 'MANAGER_SEARCH_STORE_ERROR',
      keyword,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
