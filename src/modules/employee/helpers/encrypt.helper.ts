/**
 * Encrypt Helper
 * ==============
 * Encryption function for securing sensitive employee data
 */

import crypto from 'crypto';
import { getEnvVariable } from '../../../helpers/env.helper';
import { logger, logSecurity } from '../../../utils/logger';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY_PASSWORD = getEnvVariable('ENCRYPTION_KEY', false, 'vodichron-secure-key-change-in-production');
const KEY_SALT = 'salt'; // Matches old vodichron

/**
 * Encrypt Function
 * ---------------
 * Encrypts sensitive data using AES-256-CBC encryption.
 * 
 * @param data - Plain text data to encrypt
 * @returns Encrypted string in format "iv:encrypted_data" or null for invalid input
 */
export async function encrypt(data: string | null | undefined): Promise<string | null> {
  if (!data || data.trim() === '') {
    return null;
  }

  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY_PASSWORD, KEY_SALT, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error: any) {
    logSecurity('ENCRYPTION_FAILED', 'high', {
      error: error.message,
      dataLength: data.length
    });
    logger.error('Failed to encrypt data', {
      error: error.message,
      algorithm: ALGORITHM
    });
    return null;
  }
}