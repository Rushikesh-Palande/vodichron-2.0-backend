/**
 * Database Encryption Service
 * ============================
 * 
 * Provides military-grade encryption for database backups using AES-256-GCM.
 * 
 * Features:
 * - AES-256-GCM encryption (Authenticated encryption with associated data)
 * - Random IV (Initialization Vector) for each encryption
 * - Authentication tags to detect tampering
 * - Key derivation from password using PBKDF2
 * - Salt generation for key derivation
 * 
 * Security:
 * - AES-256: Industry standard, unbreakable with current technology
 * - GCM mode: Provides both confidentiality and authenticity
 * - PBKDF2: 100,000 iterations to prevent brute force
 * - Random IV: Ensures same data encrypts differently each time
 * 
 * Usage:
 * ```typescript
 * const encrypted = await encryptBackup(backupData, password);
 * const decrypted = await decryptBackup(encrypted, password);
 * ```
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Encryption Configuration
 * ========================
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits (GCM standard)
  saltLength: 32, // 256 bits
  tagLength: 16, // 128 bits (GCM authentication tag)
  pbkdf2Iterations: 100000, // OWASP recommendation
  pbkdf2Digest: 'sha512' as const,
};

/**
 * Encrypted Data Interface
 * ========================
 */
export interface EncryptedData {
  encrypted: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
  tag: string; // Base64 encoded authentication tag
  algorithm: string; // Encryption algorithm used
  version: string; // Encryption version for future compatibility
}

/**
 * Derive Encryption Key from Password
 * ====================================
 * 
 * Uses PBKDF2 to derive a cryptographic key from a password.
 * This makes brute force attacks significantly harder.
 * 
 * @param password - User password/passphrase
 * @param salt - Random salt (should be unique per encryption)
 * @returns Derived encryption key (32 bytes for AES-256)
 */
function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      ENCRYPTION_CONFIG.pbkdf2Iterations,
      ENCRYPTION_CONFIG.keyLength,
      ENCRYPTION_CONFIG.pbkdf2Digest,
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      }
    );
  });
}

/**
 * Encrypt Backup Data
 * ===================
 * 
 * Encrypts data using AES-256-GCM with password-based key derivation.
 * 
 * Steps:
 * 1. Generate random salt
 * 2. Derive encryption key from password + salt
 * 3. Generate random IV (initialization vector)
 * 4. Encrypt data using AES-256-GCM
 * 5. Extract authentication tag
 * 6. Return encrypted data with metadata
 * 
 * @param data - Data to encrypt (string or buffer)
 * @param password - Encryption password/passphrase
 * @returns Encrypted data with all necessary metadata
 */
export async function encryptBackup(
  data: string | Buffer,
  password: string
): Promise<EncryptedData> {
  try {
    logger.debug('🔐 Starting backup encryption', {
      dataSize: Buffer.byteLength(data),
      algorithm: ENCRYPTION_CONFIG.algorithm
    });

    // Step 1: Generate random salt
    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);

    // Step 2: Derive encryption key from password
    const key = await deriveKey(password, salt);

    // Step 3: Generate random IV
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    // Step 4: Create cipher and encrypt
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key,
      iv
    );

    const dataString = typeof data === 'string' ? data : data.toString('utf8');
    let encrypted = cipher.update(dataString, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Step 5: Get authentication tag (GCM mode)
    const tag = cipher.getAuthTag();

    logger.info('✅ Backup encrypted successfully', {
      originalSize: Buffer.byteLength(data),
      encryptedSize: Buffer.byteLength(encrypted, 'base64'),
      algorithm: ENCRYPTION_CONFIG.algorithm
    });

    return {
      encrypted,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: ENCRYPTION_CONFIG.algorithm,
      version: '1.0'
    };

  } catch (error: any) {
    logger.error('❌ Encryption failed', {
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Backup encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt Backup Data
 * ===================
 * 
 * Decrypts data that was encrypted with encryptBackup().
 * 
 * Steps:
 * 1. Derive decryption key from password + stored salt
 * 2. Create decipher with stored IV
 * 3. Set authentication tag for verification
 * 4. Decrypt data
 * 5. Verify authentication (automatic with GCM)
 * 
 * Security:
 * - Authentication tag is verified automatically
 * - If data was tampered with, decryption will fail
 * - Wrong password will also fail authentication
 * 
 * @param encryptedData - Encrypted data object
 * @param password - Decryption password (must match encryption password)
 * @returns Decrypted data as string
 */
export async function decryptBackup(
  encryptedData: EncryptedData,
  password: string
): Promise<string> {
  try {
    logger.debug('🔓 Starting backup decryption', {
      algorithm: encryptedData.algorithm,
      version: encryptedData.version
    });

    // Validate version compatibility
    if (encryptedData.version !== '1.0') {
      throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
    }

    // Step 1: Convert base64 strings back to buffers
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');

    // Step 2: Derive decryption key
    const key = await deriveKey(password, salt);

    // Step 3: Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key,
      iv
    );

    // Step 4: Set authentication tag (must be done before decryption in GCM)
    decipher.setAuthTag(tag);

    // Step 5: Decrypt
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    logger.info('✅ Backup decrypted successfully', {
      decryptedSize: Buffer.byteLength(decrypted)
    });

    return decrypted;

  } catch (error: any) {
    logger.error('❌ Decryption failed', {
      error: error.message,
      reason: error.message.includes('Unsupported state or unable to authenticate data') 
        ? 'Wrong password or data was tampered with'
        : 'Decryption error'
    });
    throw new Error(`Backup decryption failed: ${error.message}`);
  }
}

/**
 * Generate Strong Password
 * ========================
 * 
 * Generates a cryptographically secure random password.
 * Useful for automated backup encryption.
 * 
 * @param length - Password length (default: 32)
 * @returns Random password string (base64 encoded)
 */
export function generateBackupPassword(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Validate Encryption Password Strength
 * =====================================
 * 
 * Validates that a password meets minimum security requirements.
 * 
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message: string;
} {
  if (password.length < 12) {
    return {
      valid: false,
      message: 'Password must be at least 12 characters long'
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return {
      valid: false,
      message: 'Password must contain uppercase, lowercase, number, and special character'
    };
  }

  return {
    valid: true,
    message: 'Password meets security requirements'
  };
}
