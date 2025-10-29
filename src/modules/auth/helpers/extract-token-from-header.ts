/**
 * Extract Token From Header Helper
 * ================================
 *
 * Safely extracts the Bearer token from the Authorization header.
 */

import { logger } from '../../../utils/logger';

export function extractTokenFromAuthHeader(authorization?: string | null): string | null {
  if (!authorization) return null;
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    logger.debug('Authorization header present but not Bearer', { type: 'AUTH_HEADER_NON_BEARER' });
    return null;
  }
  return authorization.slice(7).trim() || null;
}
