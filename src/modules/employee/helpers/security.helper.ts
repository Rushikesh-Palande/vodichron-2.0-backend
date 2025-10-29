/**
 * Security Helper Module
 * ======================
 * 
 * This module provides cryptographic functions for securing sensitive employee data.
 * 
 * Features:
 * - AES-256-CBC encryption for sensitive fields (PAN, Aadhaar, Bank Account)
 * - Automatic handling of NULL/undefined/empty values
 * - Backward compatibility with plain text (legacy) data
 * - Proper initialization vector (IV) management
 * - Error handling with fallback to original data
 * 
 * Security Notes:
 * - Uses scrypt for key derivation (more secure than simple password hash)
 * - Each encrypted value has its own IV (prevents pattern analysis)
 * - Encrypted format: "iv:encrypted_data" (hex encoded)
 * - Supports both encrypted and plain text values (for gradual migration)
 */

import crypto from 'crypto';
import { getEnvVariable } from '../../../helpers/env.helper';
import { logger, logSecurity } from '../../../utils/logger';

/**
 * Encryption Configuration
 * -----------------------
 * Algorithm: AES-256-CBC (Advanced Encryption Standard with Cipher Block Chaining)
 * Key Derivation: scrypt (memory-hard key derivation function)
 */
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY_PASSWORD = getEnvVariable('ENCRYPTION_KEY', false, 'vodichron-secure-key-change-in-production');
const KEY_SALT = 'vodichron-salt-v1'; // Salt for key derivation

/**
 * Encrypt Function
 * ---------------
 * Encrypts sensitive data using AES-256-CBC encryption.
 * 
 * Process:
 * 1. Validates input (returns null for null/undefined/empty)
 * 2. Derives encryption key from password using scrypt
 * 3. Generates random IV (initialization vector)
 * 4. Encrypts data using AES-256-CBC
 * 5. Returns format: "iv:encrypted_data" (both hex encoded)
 * 
 * @param data - Plain text data to encrypt
 * @returns Encrypted string in format "iv:encrypted_data" or null for invalid input
 * 
 * @example
 * const encrypted = await encrypt("ABCPA1234X"); // PAN card
 * // Returns: "a1b2c3d4...f0:9f8e7d6c...1a"
 */
export async function encrypt(data: string | null | undefined): Promise<string | null> {
  // Step 1: Validate input - return null for null/undefined/empty values
  if (!data || data.trim() === '') {
    return null;
  }

  try {
    // Step 2: Derive encryption key from password using scrypt
    // scrypt is more secure than simple SHA-256 as it's memory-hard
    const key = crypto.scryptSync(ENCRYPTION_KEY_PASSWORD, KEY_SALT, 32);
    
    // Step 3: Generate random initialization vector (IV)
    // IV ensures same plaintext encrypts to different ciphertext
    const iv = crypto.randomBytes(16);
    
    // Step 4: Create cipher and encrypt data
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Step 5: Return IV and encrypted data (both in hex format)
    // Format: "iv:encrypted_data" - we need IV to decrypt
    return `${iv.toString('hex')}:${encrypted}`;
    
  } catch (error: any) {
    // Log encryption failure but don't expose sensitive data
    logSecurity('ENCRYPTION_FAILED', 'high', {
      error: error.message,
      dataLength: data.length
    });
    
    logger.error('Failed to encrypt data', {
      error: error.message,
      algorithm: ALGORITHM
    });
    
    // Return null on encryption failure
    return null;
  }
}

/**
 * Decrypt Function
 * ---------------
 * Decrypts data encrypted with the encrypt() function.
 * 
 * Features:
 * - Handles null/undefined/empty values gracefully
 * - Supports plain text (legacy/non-encrypted) values
 * - Validates encryption format before attempting decryption
 * - Falls back to original data if decryption fails
 * 
 * Process:
 * 1. Validates input (returns null for null/undefined/empty)
 * 2. Checks if data is encrypted (contains ':' separator)
 * 3. If not encrypted, returns plain text as-is (backward compatibility)
 * 4. Extracts IV and encrypted data from format "iv:encrypted_data"
 * 5. Derives same encryption key using scrypt
 * 6. Decrypts data using AES-256-CBC
 * 7. Returns decrypted plain text
 * 
 * @param data - Encrypted string in format "iv:encrypted_data" or plain text
 * @returns Decrypted plain text or original data if decryption fails
 * 
 * @example
 * const decrypted = await decrypt("a1b2c3d4...f0:9f8e7d6c...1a");
 * // Returns: "ABCPA1234X"
 * 
 * const plainText = await decrypt("ABCPA1234X"); // Legacy plain text
 * // Returns: "ABCPA1234X" (no decryption needed)
 */
export async function decrypt(data: string | null | undefined): Promise<string | null> {
  // Step 1: Validate input - return null for null/undefined/empty values
  if (!data || data.trim() === '') {
    return null;
  }

  // Step 2: Check if data is actually encrypted (has the format "iv:encrypted_data")
  if (!data.includes(':')) {
    // Data is not encrypted - return as-is (legacy/plain text value)
    // This provides backward compatibility with old data
    logger.debug('Decryption skipped - plain text detected', {
      dataLength: data.length
    });
    return data;
  }

  try {
    // Step 3: Derive the same encryption key used for encryption
    const key = crypto.scryptSync(ENCRYPTION_KEY_PASSWORD, KEY_SALT, 32);
    
    // Step 4: Extract IV and encrypted data from format "iv:encrypted_data"
    const parts = data.split(':');
    
    // Validate format - should have exactly 2 parts (IV and encrypted data)
    if (parts.length !== 2) {
      logger.warn('Invalid encrypted data format', {
        parts: parts.length,
        expected: 2
      });
      return data; // Return original if format is invalid
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = Buffer.from(parts[1], 'hex');
    
    // Step 5: Create decipher and decrypt data
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData).toString('utf8');
    decrypted += decipher.final('utf8');
    
    // Step 6: Return decrypted plain text
    return decrypted;
    
  } catch (error: any) {
    // Log decryption failure without exposing sensitive data
    logSecurity('DECRYPTION_FAILED', 'medium', {
      error: error.message,
      errorCode: error.code,
      dataFormat: data.substring(0, 20) + '...' // Only log first 20 chars
    });
    
    logger.error('Failed to decrypt data', {
      error: error.message,
      errorCode: error.code,
      algorithm: ALGORITHM
    });
    
    // Fallback: return original data if decryption fails
    // This handles cases where data might be corrupted or format changed
    return data;
  }
}

/**
 * Decrypt Sensitive Employee Fields
 * ---------------------------------
 * Convenience function to decrypt multiple sensitive fields from employee object.
 * Used in employee service to decrypt all sensitive data before sending to client.
 * 
 * Decrypts:
 * - PAN Card Number
 * - Bank Account Number
 * - Aadhaar Card Number
 * - PF Account Number
 * 
 * @param employee - Employee object with encrypted sensitive fields
 * @returns Employee object with decrypted sensitive fields
 */
export async function decryptEmployeeSensitiveFields<T extends {
  panCardNumber?: string | null;
  bankAccountNumber?: string | null;
  aadhaarCardNumber?: string | null;
  pfAccountNumber?: string | null;
}>(employee: T): Promise<T> {
  return {
    ...employee,
    panCardNumber: employee.panCardNumber ? await decrypt(employee.panCardNumber) : null,
    bankAccountNumber: employee.bankAccountNumber ? await decrypt(employee.bankAccountNumber) : null,
    aadhaarCardNumber: employee.aadhaarCardNumber ? await decrypt(employee.aadhaarCardNumber) : null,
    pfAccountNumber: employee.pfAccountNumber ? await decrypt(employee.pfAccountNumber) : null,
  };
}
