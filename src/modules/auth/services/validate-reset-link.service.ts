/**
 * Validate Reset Link Service
 * ===========================
 * Business logic for validating password reset links.
 * 
 * Flow:
 * 1. Find reset request by encrypted token
 * 2. Check if token exists and is not expired (15 min)
 * 3. Return email if valid, null if invalid/expired
 * 
 * Security:
 * - Checks token expiration (15 minutes)
 * - Logs all validation attempts
 * - Does not reveal whether email exists
 */

import { logger, logSecurity } from '../../../utils/logger';
import { findPasswordResetByToken } from '../store/password-reset.store';

/**
 * Validate Password Reset Link
 * ---------------------------
 * Validates that a reset token is valid and not expired.
 * 
 * @param token - Encrypted token from reset URL
 * @param clientIp - IP address of the requester (for logging)
 * @returns Promise<{email: string} | null> - Email if valid, null otherwise
 */
export async function validateResetLinkService(token: string, clientIp?: string) {
  logger.info('🔍 Step 1: Validating password reset link', {
    tokenPreview: token.substring(0, 10) + '...',
    ip: clientIp,
    type: 'PASSWORD_RESET_VALIDATE'
  });

  try {
    // Step 1: Find reset request by token
    logger.debug('💾 Step 2: Looking up reset request in database');
    const resetRequest = await findPasswordResetByToken(token);

    // Step 2: Check if token exists and is not expired
    if (!resetRequest) {
      logger.warn('⚠️ Step 2.1: Invalid or expired reset token', {
        type: 'PASSWORD_RESET_INVALID_TOKEN'
      });
      logSecurity('PASSWORD_RESET_INVALID_TOKEN', 'medium', { 
        reason: 'Token not found or expired' 
      }, clientIp);
      
      return null;
    }

    logger.info('✅ Step 2.2: Reset link validated successfully', {
      email: resetRequest.email,
      type: 'PASSWORD_RESET_LINK_VALID'
    });

    logSecurity('PASSWORD_RESET_LINK_VALIDATED', 'low', { 
      email: resetRequest.email 
    }, clientIp);

    return { email: resetRequest.email };

  } catch (error: any) {
    logger.error('❌ Password reset link validation failed', {
      error: error.message,
      type: 'PASSWORD_RESET_VALIDATE_ERROR',
      stack: error.stack
    });

    logSecurity('PASSWORD_RESET_VALIDATION_ERROR', 'medium', { 
      error: error.message 
    }, clientIp);

    return null;
  }
}
