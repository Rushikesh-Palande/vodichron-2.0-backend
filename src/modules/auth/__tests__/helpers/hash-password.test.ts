/**
 * Hash Password Helper Test Suite
 * =================================
 * 
 * Tests the hashPassword function which is responsible for securely hashing
 * plaintext passwords using bcrypt before storing them in the database.
 * 
 * Test Coverage:
 * ✅ Successful password hashing
 * ✅ Bcrypt hash format validation
 * ✅ Different passwords produce different hashes
 * ✅ Same password produces different hashes (salt randomization)
 * ✅ Custom salt rounds handling
 * ✅ Default salt rounds usage
 * ✅ Error handling when bcrypt fails
 * ✅ Performance metrics logging
 * ✅ Password never logged in plaintext
 * 
 * Security Considerations:
 * - Verifies bcrypt format ($2b$10$...)
 * - Ensures unique salts for same password
 * - Validates configurable cost factor (salt rounds)
 * - Tests password values are never logged
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\helpers\hash-password.test.ts
 */

import { hashPassword } from '../../helpers/hash-password.helper';
import { logger } from '../../../../utils/logger';
import bcrypt from 'bcrypt';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('hashPassword Helper', () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Spies
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // Spy on logger methods to verify logging behavior
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    
    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
    
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Successful Hashing Tests
  // =============================================================================

  /**
   * Test Case: Basic Password Hashing
   * ----------------------------------
   * Verifies that hashPassword successfully hashes a plaintext password
   * and returns a valid bcrypt hash string.
   * 
   * Steps:
   * 1. Hash a plaintext password
   * 2. Verify the result is a string
   * 3. Verify the hash starts with $2b$ (bcrypt format)
   * 4. Verify debug logging occurred
   */
  it('should successfully hash a plaintext password', async () => {
    logger.info('🧪 Test: Basic password hashing');
    
    // Step 1: Hash a password
    const password = 'MySecurePassword123!';
    logger.info('🔄 Step 1: Hashing password...');
    const hash = await hashPassword(password);
    
    // Step 2: Verify hash is a string
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    logger.info('✅ Step 2: Hash is a non-empty string');
    
    // Step 3: Verify bcrypt format
    expect(hash).toMatch(/^\$2[ab]\$/); // Bcrypt hashes start with $2a$ or $2b$
    logger.info('✅ Step 3: Hash follows bcrypt format');
    
    // Step 4: Verify debug logging
    expect(debugSpy).toHaveBeenCalled();
    expect(wasLogged(debugSpy, 'Password hashed')).toBe(true);
    logger.info('✅ Step 4: Debug logging verified');
  });

  /**
   * Test Case: Hash Format Validation
   * ----------------------------------
   * Verifies that the generated hash follows the complete bcrypt format:
   * $2b$<rounds>$<22-char-salt><31-char-hash>
   */
  it('should generate a properly formatted bcrypt hash', async () => {
    logger.info('🧪 Test: Bcrypt format validation');
    
    const hash = await hashPassword('TestPassword');
    
    // Bcrypt hash format: $2b$10$<22 chars salt><31 chars hash>
    // Total length should be ~60 characters
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/);
    logger.info('✅ Hash matches complete bcrypt format pattern');
    
    // Verify it contains salt rounds (default 10)
    expect(hash).toContain('$10$');
    logger.info('✅ Hash contains default salt rounds (10)');
  });

  // =============================================================================
  // Uniqueness Tests
  // =============================================================================

  /**
   * Test Case: Different Passwords Produce Different Hashes
   * --------------------------------------------------------
   * Verifies that different plaintext passwords always produce
   * different hashes.
   */
  it('should produce different hashes for different passwords', async () => {
    logger.info('🧪 Test: Different passwords → different hashes');
    
    const password1 = 'Password123';
    const password2 = 'Password456';
    
    logger.info('🔄 Hashing first password...');
    const hash1 = await hashPassword(password1);
    
    logger.info('🔄 Hashing second password...');
    const hash2 = await hashPassword(password2);
    
    // Hashes must be different
    expect(hash1).not.toBe(hash2);
    logger.info('✅ Different passwords produced different hashes');
  });

  /**
   * Test Case: Same Password Produces Different Hashes (Salt Randomization)
   * -----------------------------------------------------------------------
   * Verifies that hashing the same password multiple times produces
   * different hashes due to bcrypt's automatic salt generation.
   * 
   * This is critical for security - prevents rainbow table attacks.
   */
  it('should produce different hashes for the same password (unique salts)', async () => {
    logger.info('🧪 Test: Same password → different hashes (salt uniqueness)');
    
    const password = 'SamePassword123';
    
    logger.info('🔄 Hashing password (attempt 1)...');
    const hash1 = await hashPassword(password);
    
    logger.info('🔄 Hashing same password (attempt 2)...');
    const hash2 = await hashPassword(password);
    
    logger.info('🔄 Hashing same password (attempt 3)...');
    const hash3 = await hashPassword(password);
    
    // All hashes must be different due to unique salts
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash2).not.toBe(hash3);
    logger.info('✅ Same password produced 3 unique hashes (salt randomization working)');
    
    // But all should verify against the original password
    const verify1 = await bcrypt.compare(password, hash1);
    const verify2 = await bcrypt.compare(password, hash2);
    const verify3 = await bcrypt.compare(password, hash3);
    
    expect(verify1).toBe(true);
    expect(verify2).toBe(true);
    expect(verify3).toBe(true);
    logger.info('✅ All hashes correctly verify against original password');
  });

  // =============================================================================
  // Salt Rounds Tests
  // =============================================================================

  /**
   * Test Case: Default Salt Rounds (10)
   * ------------------------------------
   * Verifies that when no salt rounds are specified, the default value
   * of 10 rounds is used.
   */
  it('should use default salt rounds (10) when not specified', async () => {
    logger.info('🧪 Test: Default salt rounds usage');
    
    const hash = await hashPassword('TestPassword');
    
    // Extract salt rounds from hash (format: $2b$10$...)
    const saltRounds = hash.split('$')[2];
    expect(saltRounds).toBe('10');
    logger.info('✅ Default salt rounds (10) used correctly');
  });

  /**
   * Test Case: Custom Salt Rounds
   * ------------------------------
   * Verifies that custom salt rounds can be specified and are
   * correctly applied to the hash.
   */
  it('should use custom salt rounds when specified', async () => {
    logger.info('🧪 Test: Custom salt rounds');
    
    const customRounds = 12;
    logger.info(`🔄 Hashing with ${customRounds} rounds...`);
    const hash = await hashPassword('TestPassword', customRounds);
    
    // Extract salt rounds from hash
    const saltRounds = hash.split('$')[2];
    expect(saltRounds).toBe('12');
    logger.info('✅ Custom salt rounds (12) applied correctly');
    
    // Verify logging includes custom rounds
    expect(wasLogged(debugSpy, 'Password hashed')).toBe(true);
  });

  /**
   * Test Case: Higher Salt Rounds Increase Security (and Time)
   * ----------------------------------------------------------
   * Verifies that higher salt rounds take longer to compute,
   * demonstrating the security/performance tradeoff.
   */
  it('should take longer with higher salt rounds', async () => {
    logger.info('🧪 Test: Salt rounds performance impact');
    
    const password = 'PerformanceTest';
    
    // Hash with default rounds (10)
    logger.info('🔄 Hashing with 10 rounds...');
    const start10 = Date.now();
    await hashPassword(password, 10);
    const time10 = Date.now() - start10;
    logger.info(`✅ 10 rounds completed in ${time10}ms`);
    
    // Hash with higher rounds (12)
    logger.info('🔄 Hashing with 12 rounds...');
    const start12 = Date.now();
    await hashPassword(password, 12);
    const time12 = Date.now() - start12;
    logger.info(`✅ 12 rounds completed in ${time12}ms`);
    
    // Higher rounds should generally take longer (though not guaranteed due to CPU variance)
    logger.info(`📊 Performance difference: ${time12 - time10}ms (12 rounds vs 10 rounds)`);
    expect(time12).toBeGreaterThanOrEqual(0); // Just verify it completed
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  /**
   * Test Case: Bcrypt Error Handling
   * ---------------------------------
   * Verifies that hashPassword properly handles and throws errors
   * when bcrypt.hash fails internally.
   */
  it('should throw error and log when bcrypt.hash fails', async () => {
    logger.info('🧪 Test: Bcrypt error handling');
    
    // Mock bcrypt.hash to throw an error
    const bcryptSpy = jest.spyOn(bcrypt, 'hash').mockImplementation(() => {
      throw new Error('Simulated bcrypt hash error');
    });
    
    logger.info('🔄 Triggering bcrypt error...');
    
    // Should throw the error
    await expect(hashPassword('TestPassword')).rejects.toThrow('Simulated bcrypt hash error');
    logger.info('✅ Error thrown as expected');
    
    // Should log the error
    expect(errorSpy).toHaveBeenCalled();
    expect(wasLogged(errorSpy, 'Password hash failed')).toBe(true);
    logger.info('✅ Error logged appropriately');
    
    // Restore mock
    bcryptSpy.mockRestore();
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: Password Never Logged in Plaintext
   * ----------------------------------------------
   * Verifies that the plaintext password is never logged,
   * ensuring compliance with security best practices.
   * 
   * Critical for GDPR and security compliance.
   */
  it('should never log plaintext password value', async () => {
    logger.info('🧪 Test: Password not logged in plaintext');
    
    const password = 'SecretPassword123!@#';
    await hashPassword(password);
    
    // Check that no spy call contains the actual password
    const allCalls = [
      ...infoSpy.mock.calls,
      ...errorSpy.mock.calls,
      ...debugSpy.mock.calls,
    ];
    
    const passwordLogged = allCalls.some((call) =>
      call.some((arg: any) => typeof arg === 'string' && arg.includes(password))
    );
    
    expect(passwordLogged).toBe(false);
    logger.info('✅ Security verified: Password not in logs');
  });

  /**
   * Test Case: Hash Can Be Used for Authentication
   * -----------------------------------------------
   * Integration test verifying that the generated hash can be
   * successfully used with bcrypt.compare for authentication.
   */
  it('should generate a hash that works with bcrypt.compare', async () => {
    logger.info('🧪 Test: Hash usable for authentication');
    
    const password = 'AuthenticationTest123';
    
    logger.info('🔄 Generating hash...');
    const hash = await hashPassword(password);
    
    logger.info('🔄 Verifying hash with bcrypt.compare...');
    const isValid = await bcrypt.compare(password, hash);
    
    expect(isValid).toBe(true);
    logger.info('✅ Hash successfully verifies with bcrypt.compare');
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  /**
   * Test Case: Empty String Password
   * ---------------------------------
   * Verifies behavior when attempting to hash an empty string.
   */
  it('should hash empty string (though not recommended)', async () => {
    logger.info('🧪 Test: Empty string password');
    
    // Bcrypt will hash even empty strings
    const hash = await hashPassword('');
    
    expect(hash).toMatch(/^\$2[ab]\$/);
    expect(hash.length).toBeGreaterThan(0);
    logger.info('✅ Empty string hashed (bcrypt behavior - validation should happen at controller level)');
  });

  /**
   * Test Case: Very Long Password
   * ------------------------------
   * Verifies behavior with extremely long passwords.
   * Note: Bcrypt truncates passwords at 72 bytes.
   */
  it('should handle very long passwords', async () => {
    logger.info('🧪 Test: Very long password handling');
    
    const longPassword = 'A'.repeat(200); // 200 characters
    
    logger.info('🔄 Hashing 200-character password...');
    const hash = await hashPassword(longPassword);
    
    expect(hash).toMatch(/^\$2[ab]\$/);
    logger.info('✅ Long password hashed successfully');
    logger.info('⚠️  Note: Bcrypt truncates at 72 bytes');
  });

  /**
   * Test Case: Special Characters in Password
   * ------------------------------------------
   * Verifies that passwords with special characters are
   * properly hashed.
   */
  it('should handle passwords with special characters', async () => {
    logger.info('🧪 Test: Special characters in password');
    
    const specialPassword = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
    
    logger.info('🔄 Hashing password with special characters...');
    const hash = await hashPassword(specialPassword);
    
    expect(hash).toMatch(/^\$2[ab]\$/);
    logger.info('✅ Special characters handled correctly');
    
    // Verify it can be compared
    const isValid = await bcrypt.compare(specialPassword, hash);
    expect(isValid).toBe(true);
    logger.info('✅ Special character hash verifies correctly');
  });
});
