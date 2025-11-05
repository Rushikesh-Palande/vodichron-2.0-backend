/**
 * Search Leave Approver Service
 * =============================
 * 
 * Service layer for searching employees for leave approver assignment.
 * Based on: old vodichron searchEmployeeForLeaveApproverAssigment controller (lines 217-230)
 * 
 * Key Features:
 * - Sanitizes search keyword
 * - Auto-excludes logged-in user (unlike role assignment search)
 * - Only returns employees with designation='Director'
 * - No special authorization (all authenticated users can search)
 * - Comprehensive logging
 * 
 * Process Flow:
 * 1. Sanitize keyword (remove special chars)
 * 2. Parse excluded users from query param
 * 3. Add logged-in user to exclusion list (line 225 in old code)
 * 4. Call store layer for database search (with designation='Director' filter)
 * 5. Return results
 */

import { logger } from '../../../../utils/logger';
import { SearchLeaveApproverInput, SearchLeaveApproverOutput } from '../../schemas/search/search-leave-approver.schemas';
import { searchEmployeeForLeaveApprover } from '../../stores/search/search-leave-approver.store';

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
 * Search Leave Approver Service
 * =============================
 * 
 * Main service function for leave approver search.
 * No special authorization required - all authenticated users can search.
 * 
 * Features:
 * - Keyword sanitization
 * - Auto-excludes logged-in user (matching old controller line 225)
 * - Supports manual exclusion list
 * - Returns only Directors (designation='Director' filter in store layer)
 * - Returns max 10 results, ordered by name
 * 
 * IMPORTANT Difference from role assignment search:
 * - This DOES auto-exclude logged-in user (line 225: excludedUsers.push(req.user.uuid))
 * - Only returns Directors (not all employees)
 * 
 * @param input - Search parameters (keyword, excludedUsers)
 * @param user - Authenticated user context
 * @returns Array of matching Director employees
 */
export async function searchForLeaveApprover(
  input: SearchLeaveApproverInput,
  user: UserContext
): Promise<SearchLeaveApproverOutput> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  logger.info('📥 Search leave approver request received', {
    keyword: input.keyword,
    excludedCount: input.excludedUsers?.length || 0,
    requestedBy: user.uuid,
    operation: 'searchForLeaveApprover'
  });

  try {
    // ==========================================================================
    // STEP 2: Sanitize Keyword
    // ==========================================================================
    // Matches old controller line 219: sanitizeKeyword(params.keyword)
    const sanitizedKeyword = sanitizeKeyword(input.keyword);

    logger.debug('🧹 Keyword sanitized', {
      original: input.keyword,
      sanitized: sanitizedKeyword,
      changed: input.keyword !== sanitizedKeyword
    });

    // ==========================================================================
    // STEP 3: Build Exclusion List
    // ==========================================================================
    // Matches old controller lines 220-225:
    // - Parse exclude query param
    // - Add logged-in user to exclusion list (line 225)
    const excludedUsers = [...(input.excludedUsers || []), user.uuid];

    logger.debug('📋 Exclusion list built', {
      totalExcluded: excludedUsers.length,
      includesLoggedInUser: true,  // IMPORTANT: Auto-exclude logged-in user
      loggedInUser: user.uuid
    });

    // ==========================================================================
    // STEP 4: Call Store Layer
    // ==========================================================================
    logger.debug('🔍 Calling database search for leave approver', {
      sanitizedKeyword,
      excludedCount: excludedUsers.length,
      description: 'Directors only (designation filter)'
    });

    const results = await searchEmployeeForLeaveApprover(sanitizedKeyword, excludedUsers);

    // ==========================================================================
    // STEP 5: Log Success and Return
    // ==========================================================================
    logger.info('✅ Leave approver search completed successfully', {
      keyword: sanitizedKeyword,
      resultCount: results.length,
      description: 'Directors only',
      requestedBy: user.uuid
    });

    return results;

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Search leave approver service error', {
      type: 'LEAVE_APPROVER_SEARCH_SERVICE_ERROR',
      keyword: input.keyword,
      userId: user.uuid,
      error: error?.message,
      stack: error?.stack
    });

    // Re-throw error to be handled by controller
    throw error;
  }
}
