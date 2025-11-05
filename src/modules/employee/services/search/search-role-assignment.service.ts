/**
 * Search Role Assignment Service
 * ==============================
 * 
 * Service layer for searching employees for role assignment.
 * Based on: old vodichron searchEmployeeForRoleAssignment controller (lines 188-202)
 * 
 * Key Features:
 * - Sanitizes search keyword
 * - Does NOT auto-exclude logged-in user (unlike searchAll)
 * - Only returns employees WITHOUT roles
 * - No special authorization (all authenticated users can search)
 * - Comprehensive logging
 * 
 * Process Flow:
 * 1. Sanitize keyword (remove special chars)
 * 2. Parse excluded users from query param
 * 3. Call store layer for database search (with NOT EXISTS check)
 * 4. Return results
 */

import { logger } from '../../../../utils/logger';
import { SearchRoleAssignmentInput, SearchRoleAssignmentOutput } from '../../schemas/search/search-role-assignment.schemas';
import { searchEmployeeForRoleAssignment } from '../../stores/search/search-role-assignment.store';

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
  return keyword.replace(/[^a-zA-Z0-9\s@.\-_]/g, '');
}

/**
 * Search Role Assignment Service
 * ==============================
 * 
 * Main service function for role assignment search.
 * No special authorization required - all authenticated users can search.
 * 
 * Features:
 * - Keyword sanitization
 * - Does NOT auto-exclude logged-in user (matching old controller lines 191-194)
 * - Supports manual exclusion list
 * - Returns only employees WITHOUT roles (NOT EXISTS in store layer)
 * - Returns max 10 results
 * 
 * Note: Old code has TODO (line 196) to use searchAllEmployeesByKeyword instead,
 * but we keep current implementation to match exactly.
 * 
 * @param input - Search parameters (keyword, excludedUsers)
 * @param user - Authenticated user context
 * @returns Array of matching employees without roles
 */
export async function searchForRoleAssignment(
  input: SearchRoleAssignmentInput,
  user: UserContext
): Promise<SearchRoleAssignmentOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Search role assignment request received', {
    keyword: input.keyword,
    excludedCount: input.excludedUsers?.length || 0,
    requestedBy: user.uuid,
    operation: 'searchForRoleAssignment'
  });

  try {
    // ==========================================================================
    // STEP 2: Sanitize Keyword
    // ==========================================================================
    // Matches old controller line 190: sanitizeKeyword(params.keyword)
    const sanitizedKeyword = sanitizeKeyword(input.keyword);

    logger.debug('🧹 Keyword sanitized', {
      original: input.keyword,
      sanitized: sanitizedKeyword,
      changed: input.keyword !== sanitizedKeyword
    });

    // ==========================================================================
    // STEP 3: Build Exclusion List
    // ==========================================================================
    // Matches old controller lines 191-194:
    // - Parse exclude query param
    // - Does NOT add logged-in user to exclusion list (unlike searchAll)
    const excludedUsers = [...(input.excludedUsers || [])];

    logger.debug('📋 Exclusion list built', {
      totalExcluded: excludedUsers.length,
      includesLoggedInUser: false  // Different from searchAll
    });

    // ==========================================================================
    // STEP 4: Call Store Layer
    // ==========================================================================
    logger.debug('🔍 Calling database search for role assignment', {
      sanitizedKeyword,
      excludedCount: excludedUsers.length,
      description: 'Employees without roles (NOT EXISTS check)'
    });

    const results = await searchEmployeeForRoleAssignment(sanitizedKeyword, excludedUsers);

    // ==========================================================================
    // STEP 5: Log Success and Return
    // ==========================================================================
    logger.info('✅ Role assignment search completed successfully', {
      keyword: sanitizedKeyword,
      resultCount: results.length,
      description: 'Employees without roles',
      requestedBy: user.uuid
    });

    return results;

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Search role assignment service error', {
      type: 'ROLE_ASSIGNMENT_SEARCH_SERVICE_ERROR',
      keyword: input.keyword,
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    // Re-throw error to be handled by controller
    throw error;
  }
}
