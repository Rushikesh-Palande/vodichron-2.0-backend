/**
 * Hash Token Helper
 * =================
 *
 * Generates a SHA-256 hash of a token. Used to store refresh tokens securely
 * (store only the hash, never the raw token) to mitigate token theft risk.
 */

import crypto from 'crypto';

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
