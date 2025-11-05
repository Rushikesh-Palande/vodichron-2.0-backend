/**
 * Search Manager Assignment Service
 * ==================================
 * Business logic for searching employees for manager/director assignment
 * 
 * Pattern: Service layer contains business logic and orchestrates store calls
 * Based on: old vodichron searchEmployeeForReportingManagerAssigment controller
 */

import { TRPCError } from '@trpc/server';
import { logger } from '../../../../utils/logger';
import { searchEmployeesForManagerAssignment } from '../../stores/search/search-manager-assignment.store';
import type { 
  SearchManagerAssignmentInput,
  SearchManagerAssignmentResult 
} from '../../schemas/search/search-manager-assignment.schemas';

/**
 * Sanitize Search Keyword
 * ------------------------
 * Removes special characters to prevent SQL injection
 * Based on: old vodichron sanitizeKeyword utility
 * 
 * @param keyword - Raw search keyword from user
 * @returns Sanitized keyword with only alphanumeric characters
 */
function sanitizeKeyword(keyword: string): string {
  // Remove all non-alphanumeric characters except @ . _ - (for emails)
  // The regex in schema already validates input, but we still sanitize for safety
  return keyword.replace(/[^a-zA-Z0-9@._-]/g, '');
}

/**
 * Search Employees for Manager Assignment
 * ========================================
 * Main service function for searching employees suitable for manager/director roles
 * 
 * Process:
 * 1. Sanitize the search keyword
 * 2. Call store to fetch matching employees
 * 3. Return results formatted for frontend
 * 
 * Features:
 * - Keyword sanitization for security
 * - Excluded users support
 * - Returns top 10 matches
 * - Ordered by name
 * 
 * @param input - Search parameters (keyword, excludedUsers)
 * @returns Array of matching employees
 * @throws TRPCError if search fails
 */
export async function searchForManagerAssignment(
  input: SearchManagerAssignmentInput
): Promise<SearchManagerAssignmentResult[]> {
  try {
    logger.info('📋 Search manager assignment service started', {
      keyword: input.keyword,
      excludedUsersCount: input.excludedUsers?.length || 0,
      operation: 'searchForManagerAssignment_service'
    });

    // Sanitize keyword to prevent SQL injection
    const sanitizedKeyword = sanitizeKeyword(input.keyword);

    logger.info('🔒 Keyword sanitized', {
      original: input.keyword,
      sanitized: sanitizedKeyword,
      operation: 'searchForManagerAssignment_service'
    });

    // Validate sanitized keyword still has content
    if (sanitizedKeyword.length < 2) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Search keyword must contain at least 2 valid characters after sanitization'
      });
    }

    // Call store to search employees
    const employees = await searchEmployeesForManagerAssignment(
      sanitizedKeyword,
      input.excludedUsers || []
    );

    logger.info('✅ Search manager assignment service completed', {
      resultsCount: employees.length,
      keyword: sanitizedKeyword,
      operation: 'searchForManagerAssignment_service'
    });

    return employees;

  } catch (error) {
    logger.error('💥 Search manager assignment service error', {
      type: 'MANAGER_SEARCH_SERVICE_ERROR',
      keyword: input.keyword,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Re-throw TRPCError as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Wrap other errors in TRPCError
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to search employees for manager assignment',
      cause: error
    });
  }
}
