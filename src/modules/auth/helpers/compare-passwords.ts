/**
 * Compare Passwords Helper for Vodichron HRMS
 * ============================================
 *
 * Securely compares plaintext passwords with bcrypt hashes during authentication.
 * This is a critical security function used in login flows.
 * 
 * Security Features:
 * - Uses bcrypt's constant-time comparison (prevents timing attacks)
 * - Never logs passwords (plaintext or hashed)
 * - Fails safely (returns false on error rather than throwing)
 * - Uses bcrypt's built-in salt verification
 * 
 * Performance:
 * - bcrypt is intentionally slow (~10 rounds = ~100ms)
 * - This is by design to prevent brute force attacks
 * - Do not try to "optimize" this function
 * 
 * Used By:
 * - Employee authentication (login.controller.ts, auth.service.ts)
 * - Customer authentication
 * - Password reset verification
 */

import bcrypt from 'bcrypt';
import { logger, PerformanceTimer } from '../../../utils/logger';

/**
 * Compare Plaintext Password with Bcrypt Hash
 * --------------------------------------------
 * Verifies if a plaintext password matches a bcrypt hash.
 * 
 * @param {string} plain - Plaintext password from login attempt (NEVER LOGGED)
 * @param {string} hash - Bcrypt hash from database (starts with $2b$ or $2a$)
 * @returns {Promise<boolean>} - true if match, false if mismatch or error
 * 
 * Security Notes:
 * - Both match and mismatch return booleans (no exception for wrong password)
 * - Timing should be constant regardless of match/mismatch
 * - Only errors are logged (not success/failure to avoid user enumeration)
 * 
 * Example:
 * ```typescript
 * const isValid = await comparePasswords('UserPassword123', '$2b$10$abc...');
 * if (isValid) {
 *   // Grant access
 * } else {
 *   // Deny access (could be wrong password OR error)
 * }
 * ```
 */
export async function comparePasswords(plain: string, hash: string): Promise<boolean> {
  // Step 1: Start performance timer
  const timer = new PerformanceTimer('Password Comparison');
  
  try {
    // Step 2: Validate inputs (basic checks without logging values)
    if (!plain || !hash) {
      logger.warn('⚠️ Step 2: Password comparison called with empty values', { 
        type: 'AUTH_PASSWORD_COMPARE_INVALID',
        hasPlain: !!plain,
        hasHash: !!hash
      });
      return false;
    }
    
    // Step 3: Verify hash format (bcrypt hashes start with $2a$, $2b$, $2y$)
    if (!hash.startsWith('$2')) {
      logger.error('❌ Step 3: Invalid bcrypt hash format', { 
        type: 'AUTH_PASSWORD_COMPARE_INVALID_HASH',
        hashPrefix: hash.substring(0, 3)
      });
      return false;
    }
    
    // Step 4: Perform bcrypt comparison (constant-time operation)
    logger.debug('🔐 Step 4: Performing bcrypt password comparison');
    const result = await bcrypt.compare(plain, hash);
    
    // Step 5: Log performance metrics
    const duration = timer.end({ operation: 'bcrypt.compare' }, 200);
    
    // Note: We don't log whether it matched or not (security)
    logger.debug('✅ Step 5: Password comparison completed', {
      type: 'AUTH_PASSWORD_COMPARE_COMPLETE',
      duration: `${duration}ms`
    });
    
    return result;
    
  } catch (error: any) {
    // Step 6: Handle errors (bcrypt errors, invalid hash format, etc.)
    const duration = timer.end({ error: error.message }, 200);
    
    logger.error('❌ Step 6: Password comparison failed', { 
      type: 'AUTH_PASSWORD_COMPARE_ERROR', 
      error: error?.message,
      errorCode: error?.code,
      duration: `${duration}ms`,
      stack: error?.stack
    });
    
    // Fail safely - return false rather than throwing
    // This prevents authentication bypass via exception handling
    return false;
  }
}
