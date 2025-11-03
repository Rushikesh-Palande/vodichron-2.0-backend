/**
 * Generate Random String Helper
 * =============================
 * Utility function for generating cryptographically secure random alphanumeric strings.
 * Used for password reset tokens and other security-sensitive operations.
 * 
 * Features:
 * - Cryptographically secure using crypto.randomBytes
 * - Alphanumeric only (0-9, A-Z, a-z)
 * - Configurable length
 * - No special characters for better URL compatibility
 */

import crypto from 'crypto';
import { logger } from '../../../utils/logger';

/**
 * Generate Random Alphanumeric String
 * ----------------------------------
 * Creates a cryptographically secure random string containing only alphanumeric characters.
 * Used for generating tokens, keys, and other random identifiers.
 * 
 * @param length - Desired length of the random string (default: 32)
 * @returns Random alphanumeric string
 * 
 * @example
 * const token = generateRandomString(10); // "aB3xY9mN2k"
 * const key = generateRandomString(32);   // 32-character random string
 */
export function generateRandomString(length: number = 32): string {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(length);
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    
    return result;
  } catch (error: any) {
    logger.error('❌ Failed to generate random string', {
      error: error.message,
      length,
    });
    throw new Error('Failed to generate random string');
  }
}

/**
 * Generate Random Numeric String
 * -----------------------------
 * Creates a random string containing only numeric characters (0-9).
 * Useful for OTPs and verification codes.
 * 
 * @param length - Desired length of the numeric string (default: 6)
 * @returns Random numeric string
 * 
 * @example
 * const otp = generateRandomNumeric(6); // "482917"
 */
export function generateRandomNumeric(length: number = 6): string {
  try {
    const chars = '0123456789';
    const randomBytes = crypto.randomBytes(length);
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    
    return result;
  } catch (error: any) {
    logger.error('❌ Failed to generate random numeric string', {
      error: error.message,
      length,
    });
    throw new Error('Failed to generate random numeric string');
  }
}
