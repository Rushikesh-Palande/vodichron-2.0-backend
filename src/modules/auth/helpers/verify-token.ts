/**
 * Verify Token Helper
 * ===================
 *
 * Safely verifies JWT access tokens and returns the embedded subject payload.
 * Returns null for invalid/expired tokens to simplify controller logic.
 */

import { verify, type Secret } from 'jsonwebtoken';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';
import type { JwtUserPayload } from './generate-token';

/**
 * Verify Access Token
 * -------------------
 * Validates a JWT access token and extracts the subject payload.
 */
export function verifyToken(token: string): JwtUserPayload | null {
  try {
    const secret: Secret = config.security.sessionSecret as unknown as Secret;
    const decoded = verify(token, secret) as { user: JwtUserPayload };
    logger.debug('✅ Access token verified', {
      type: 'AUTH_TOKEN_VERIFY',
      role: decoded.user.role,
      subjectType: decoded.user.type,
    });
    return decoded.user;
  } catch (error: any) {
    logger.warn('⚠️ Invalid or expired access token', {
      type: 'AUTH_TOKEN_INVALID',
      error: error?.message,
    });
    return null;
  }
}
