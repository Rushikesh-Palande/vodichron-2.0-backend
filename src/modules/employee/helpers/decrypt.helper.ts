/**
 * Decrypt Helper
 * ==============
 * Decryption function for sensitive employee data
 */

import crypto from 'crypto';
import { getEnvVariable } from '../../../helpers/env.helper';
import { logger, logSecurity } from '../../../utils/logger';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY_PASSWORD = getEnvVariable('ENCRYPTION_KEY', false, 'vodichron-secure-key-change-in-production');
const KEY_SALT = 'salt'; // Matches old vodichron

/**
 * Decrypt Function
 * ---------------
 * Decrypts data encrypted with the encrypt() function.
 * 
 * @param data - Encrypted string in format "iv:encrypted_data" or plain text
 * @returns Decrypted plain text or original data if decryption fails
 */
export async function decrypt(data: string | null | undefined): Promise<string | null> {
  if (!data || data.trim() === '') {
    return null;
  }

  if (!data.includes(':')) {
    logger.debug('Decryption skipped - plain text detected', {
      dataLength: data.length
    });
    return data;
  }

  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY_PASSWORD, KEY_SALT, 32);
    const parts = data.split(':');
    
    if (parts.length !== 2) {
      logger.warn('Invalid encrypted data format', {
        parts: parts.length,
        expected: 2
      });
      return data;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData).toString('utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    logSecurity('DECRYPTION_FAILED', 'medium', {
      error: error.message,
      errorCode: error.code,
      dataFormat: data.substring(0, 20) + '...'
    });
    logger.error('Failed to decrypt data', {
      error: error.message,
      errorCode: error.code,
      algorithm: ALGORITHM
    });
    return data;
  }
}