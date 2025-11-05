/**
 * Search All Employees Service
 * ============================
 * 
 * Service layer for general employee search.
 * Based on: old vodichron searchEmployeeByKeyword controller (lines 173-186)
 * 
 * Key Features:
 * - Sanitizes search keyword
 * - Auto-excludes logged-in user
 * - No special authorization (all authenticated users can search)
 * - Comprehensive logging
 * 
 * Process Flow:
 * 1. Sanitize keyword (remove special chars)
 * 2. Parse excluded users from query param
 * 3. Add logged-in user to exclusion list
 * 4. Call store layer for database search
 * 5. Return results
 */

import { logger } from '../../../../utils/logger';
import { SearchAllEmployeesInput, SearchAllEmployeesOutput } from '../../schemas/search/search-all-employees.schemas';
import { searchAllEmployeesByKeyword } from '../../stores/search/search-all-employees.store';

/**
 * User Context Interface
 * =====================
 * Information about the authenticated user making the request
 */
interface UserContext {
  uuid: string;
  role: string;
  email: string;
}

/**
 * Sanitize Keyword
 * ================
 * 
 * Removes special characters from search keyword to prevent SQL injection.
 * Matches old vodichron utils/string.sanitizeKeyword
 * 
 * Allowed characters: alphanumeric, spaces, @, ., -, _
 * 
 * @param keyword - Raw search keyword
 * @returns Sanitized keyword
 */
function sanitizeKeyword(keyword: string): string {
  // Remove special characters, keep only: a-z, A-Z, 0-9, space, @, ., -, _
  // This matches the old sanitizeKeyword utility function
  return keyword.replace(/[^a-zA-Z0-9\s@.\-_]/g, '');
}

/**
 * Search All Employees Service
 * ============================
 * 
 * Main service function for general employee search.
 * No special authorization required - all authenticated users can search.
 * 
 * Features:
 * - Keyword sanitization
 * - Auto-excludes logged-in user (matching old controller line 180)
 * - Supports manual exclusion list
 * - Returns max 10 results
 * 
 * @param input - Search parameters (keyword, excludedUsers)
 * @param user - Authenticated user context
 * @returns Array of matching employees
 */
export async function searchAllEmployees(
  input: SearchAllEmployeesInput,
  user: UserContext
): Promise<SearchAllEmployeesOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Search all employees request received', {
    keyword: input.keyword,
    excludedCount: input.excludedUsers?.length || 0,
    requestedBy: user.uuid,
    operation: 'searchAllEmployees'
  });

  try {
    // ==========================================================================
    // STEP 2: Sanitize Keyword
    // ==========================================================================
    // Matches old controller line 175: sanitizeKeyword(params.keyword)
    const sanitizedKeyword = sanitizeKeyword(input.keyword);

    logger.debug('🧹 Keyword sanitized', {
      original: input.keyword,
      sanitized: sanitizedKeyword,
      changed: input.keyword !== sanitizedKeyword
    });

    // ==========================================================================
    // STEP 3: Build Exclusion List
    // ==========================================================================
    // Matches old controller lines 176-180:
    // - Parse exclude query param
    // - Add logged-in user to exclusion list
    const excludedUsers = [...(input.excludedUsers || [])];
    
    // Auto-exclude logged-in user (matching old controller line 180)
    excludedUsers.push(user.uuid);

    logger.debug('📋 Exclusion list built', {
      totalExcluded: excludedUsers.length,
      includesLoggedInUser: true
    });

    // ==========================================================================
    // STEP 4: Call Store Layer
    // ==========================================================================
    logger.debug('🔍 Calling database search', {
      sanitizedKeyword,
      excludedCount: excludedUsers.length
    });

    const results = await searchAllEmployeesByKeyword(sanitizedKeyword, excludedUsers);

    // ==========================================================================
    // STEP 5: Log Success and Return
    // ==========================================================================
    logger.info('✅ Employee search completed successfully', {
      keyword: sanitizedKeyword,
      resultCount: results.length,
      requestedBy: user.uuid
    });

    return results;

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Search all employees service error', {
      type: 'EMPLOYEE_SEARCH_SERVICE_ERROR',
      keyword: input.keyword,
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    // Re-throw error to be handled by controller
    throw error;
  }
}
