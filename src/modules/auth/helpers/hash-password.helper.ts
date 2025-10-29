/**
 * Hash Password Helper
 * ====================
 *
 * Securely hashes plaintext passwords using bcrypt with configurable salt rounds.
 */

import bcrypt from 'bcrypt';
import { logger } from '../../../utils/logger';

const DEFAULT_SALT_ROUNDS = 10;

/**
 * Hash a plaintext password
 */
export async function hashPassword(plain: string, saltRounds: number = DEFAULT_SALT_ROUNDS): Promise<string> {
  try {
    const hash = await bcrypt.hash(plain, saltRounds);
    logger.debug('🔒 Password hashed', { type: 'AUTH_PASSWORD_HASH', rounds: saltRounds });
    return hash;
  } catch (error: any) {
    logger.error('❌ Password hash failed', { type: 'AUTH_PASSWORD_HASH_ERROR', error: error?.message });
    throw error;
  }
}
