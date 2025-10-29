/**
 * Generate Refresh Token Helper
 * =============================
 *
 * Creates a cryptographically secure random refresh token and its SHA-256 hash.
 * The raw token is sent to client (httpOnly cookie), while only the hash is
 * stored server-side for verification.
 */

import crypto from 'crypto';
import { sha256 } from './hash-token';

export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString('hex');
  const hash = sha256(token);
  return { token, hash };
}
