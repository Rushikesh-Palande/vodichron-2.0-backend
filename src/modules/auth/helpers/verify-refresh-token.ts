/**
 * Verify Refresh Token Helper
 * ===========================
 *
 * Refresh tokens are opaque random strings. We verify by hashing the provided
 * token and comparing to the stored hash in DB.
 */

import { sha256 } from './hash-token';

export function hashRefreshToken(token: string): string {
  return sha256(token);
}
