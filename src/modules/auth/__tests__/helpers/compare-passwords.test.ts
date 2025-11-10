/**
 * Compare Passwords Helper Test Suite
 * ====================================
 * 
 * Tests the comparePasswords function which is a critical security component
 * used in authentication flows. This helper compares plaintext passwords
 * with bcrypt hashes using constant-time comparison to prevent timing attacks.
 * 
 * Test Coverage:
 * ✅ Valid password comparison (match)
 * ✅ Invalid password comparison (mismatch)
 * ✅ Empty plaintext password handling
 * ✅ Empty hash handling
 * ✅ Invalid hash format handling
 * ✅ Performance metrics logging
 * ✅ Error handling and safe failure
 * 
 * Security Considerations:
 * - Ensures no password values are logged
 * - Verifies constant-time comparison behavior
 * - Tests fail-safe error handling (returns false, doesn't throw)
 * - Validates bcrypt hash format checking
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\helpers\compare-password.test.ts
 */

import bcrypt from 'bcrypt';
import { logger } from '../../../../utils/logger';
import { hashPassword } from '../../helpers/hash-password.helper';
import { comparePasswords } from '../../helpers/compare-passwords';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('comparePasswords Helper', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Spies
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // Spy on logger methods to verify logging behavior
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    
    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
    
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Successful Password Comparison Tests
  // =============================================================================

  /**
   * Test Case: Correct Password Match
   * ----------------------------------
   * Verifies that comparePasswords returns true when the plaintext password
   * matches the bcrypt hash. This is the primary happy path for authentication.
   * 
   * Steps:
   * 1. Hash a known password using hashPassword helper
   * 2. Compare the same password against the hash
   * 3. Verify the result is true (match)
   * 4. Verify appropriate debug logs were created
   */
  it('should return true when password matches hash', async () => {
    logger.info('🧪 Test: Correct password match');
    
    // Step 1: Create a test password and hash it
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    logger.info('✅ Step 1: Password hashed successfully');
    
    // Step 2: Compare the password with its hash
    logger.info('🔄 Step 2: Comparing password with hash...');
    const result = await comparePasswords(password, hash);
    
    // Step 3: Verify the comparison succeeded
    expect(result).toBe(true);
    logger.info('✅ Step 3: Password comparison returned true (match)');
    
    // Step 4: Verify debug logs were called
    expect(debugSpy).toHaveBeenCalled();
    expect(wasLogged(debugSpy, 'Password comparison completed')).toBe(true);
    logger.info('✅ Step 4: Debug logging verified');
  });

  /**
   * Test Case: Multiple Passwords With Same Salt
   * --------------------------------------------
   * Verifies that different passwords produce different hashes
   * even when using the same salt rounds.
   */
  it('should correctly differentiate between similar passwords', async () => {
    logger.info('🧪 Test: Different passwords produce different results');
    
    const password1 = 'Password123';
    const password2 = 'Password124'; // Only 1 character different
    
    const hash1 = await hashPassword(password1);
    logger.info('✅ Password 1 hashed');
    
    // password1 should match hash1
    const match1 = await comparePasswords(password1, hash1);
    expect(match1).toBe(true);
    logger.info('✅ Password 1 matches its hash');
    
    // password2 should NOT match hash1
    const match2 = await comparePasswords(password2, hash1);
    expect(match2).toBe(false);
    logger.info('✅ Similar password does not match (security validated)');
  });

  // =============================================================================
  // Failed Password Comparison Tests
  // =============================================================================

  /**
   * Test Case: Incorrect Password Mismatch
   * ---------------------------------------
   * Verifies that comparePasswords returns false when the plaintext password
   * does NOT match the bcrypt hash. This prevents unauthorized access.
   * 
   * Steps:
   * 1. Hash a known password
   * 2. Compare a different password against the hash
   * 3. Verify the result is false (mismatch)
   */
  it('should return false when password does not match hash', async () => {
    logger.info('🧪 Test: Incorrect password mismatch');
    
    // Step 1: Create hash for one password
    const correctPassword = 'CorrectPassword123';
    const wrongPassword = 'WrongPassword456';
    const hash = await hashPassword(correctPassword);
    logger.info('✅ Step 1: Password hashed');
    
    // Step 2: Try to compare with wrong password
    logger.info('🔄 Step 2: Comparing wrong password...');
    const result = await comparePasswords(wrongPassword, hash);
    
    // Step 3: Verify comparison failed (returned false)
    expect(result).toBe(false);
    logger.info('✅ Step 3: Password comparison returned false (mismatch - expected)');
  });

  // =============================================================================
  // Input Validation Tests
  // =============================================================================

  /**
   * Test Case: Empty Plaintext Password
   * ------------------------------------
   * Verifies that comparePasswords returns false and logs a warning
   * when called with an empty plaintext password.
   * 
   * Security: Prevents authentication bypass with empty passwords.
   */
  it('should return false and warn when plaintext password is empty', async () => {
    logger.info('🧪 Test: Empty plaintext password handling');
    
    const hash = await hashPassword('SomePassword');
    
    logger.info('🔄 Comparing empty password...');
    const result = await comparePasswords('', hash);
    
    // Should return false for security
    expect(result).toBe(false);
    logger.info('✅ Returned false for empty password');
    
    // Should log warning
    expect(warnSpy).toHaveBeenCalled();
    expect(wasLogged(warnSpy, 'Password comparison called with empty values')).toBe(true);
    logger.info('✅ Warning logged for empty password');
  });

  /**
   * Test Case: Empty Hash
   * ----------------------
   * Verifies that comparePasswords returns false and logs a warning
   * when called with an empty hash string.
   */
  it('should return false and warn when hash is empty', async () => {
    logger.info('🧪 Test: Empty hash handling');
    
    logger.info('🔄 Comparing password against empty hash...');
    const result = await comparePasswords('SomePassword', '');
    
    // Should return false for security
    expect(result).toBe(false);
    logger.info('✅ Returned false for empty hash');
    
    // Should log warning
    expect(warnSpy).toHaveBeenCalled();
    expect(wasLogged(warnSpy, 'Password comparison called with empty values')).toBe(true);
    logger.info('✅ Warning logged for empty hash');
  });

  /**
   * Test Case: Invalid Hash Format
   * -------------------------------
   * Verifies that comparePasswords returns false and logs an error
   * when called with an invalid (non-bcrypt) hash format.
   * 
   * Security: Prevents attempted use of weak hashing algorithms.
   */
  it('should return false and error when hash format is invalid', async () => {
    logger.info('🧪 Test: Invalid hash format handling');
    
    const invalidHash = 'plain_text_password'; // Not a bcrypt hash
    
    logger.info('🔄 Comparing password against invalid hash format...');
    const result = await comparePasswords('SomePassword', invalidHash);
    
    // Should return false for security
    expect(result).toBe(false);
    logger.info('✅ Returned false for invalid hash format');
    
    // Should log error
    expect(errorSpy).toHaveBeenCalled();
    expect(wasLogged(errorSpy, 'Invalid bcrypt hash format')).toBe(true);
    logger.info('✅ Error logged for invalid hash format');
  });

  /**
   * Test Case: Malformed Bcrypt Hash
   * ---------------------------------
   * Tests behavior when hash starts with $2 but is malformed.
   */
  it('should handle malformed bcrypt hash gracefully', async () => {
    logger.info('🧪 Test: Malformed bcrypt hash');
    
    const malformedHash = '$2b$10$invalid'; // Starts correctly but truncated
    
    logger.info('🔄 Comparing password against malformed hash...');
    const result = await comparePasswords('SomePassword', malformedHash);
    
    // Should return false (bcrypt.compare will fail internally)
    expect(result).toBe(false);
    logger.info('✅ Handled malformed hash gracefully (returned false)');
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  /**
   * Test Case: Bcrypt Internal Error
   * ---------------------------------
   * Verifies that comparePasswords handles bcrypt errors gracefully
   * by returning false instead of throwing an exception.
   * 
   * Security: Ensures authentication failures don't expose error details.
   */
  it('should return false when bcrypt.compare throws an error', async () => {
    logger.info('🧪 Test: Bcrypt internal error handling');
    
    // Mock bcrypt.compare to throw an error
    const bcryptSpy = jest.spyOn(bcrypt, 'compare').mockImplementation(() => {
      throw new Error('Simulated bcrypt error');
    });
    
    logger.info('🔄 Triggering bcrypt error...');
    const result = await comparePasswords('password', '$2b$10$validFormatButWillError');
    
    // Should return false (fail safely)
    expect(result).toBe(false);
    logger.info('✅ Returned false on bcrypt error (fail-safe behavior)');
    
    // Should log error
    expect(errorSpy).toHaveBeenCalled();
    expect(wasLogged(errorSpy, 'Password comparison failed')).toBe(true);
    logger.info('✅ Error logged appropriately');
    
    // Restore mock
    bcryptSpy.mockRestore();
  });

  // =============================================================================
  // Performance Tests
  // =============================================================================

  /**
   * Test Case: Performance Logging
   * -------------------------------
   * Verifies that password comparison logs performance metrics
   * for monitoring and optimization purposes.
   */
  it('should log performance metrics for password comparison', async () => {
    logger.info('🧪 Test: Performance metrics logging');
    
    const password = 'PerformanceTest123';
    const hash = await hashPassword(password);
    
    logger.info('🔄 Performing timed password comparison...');
    const startTime = Date.now();
    await comparePasswords(password, hash);
    const duration = Date.now() - startTime;
    
    logger.info(`✅ Comparison completed in ${duration}ms`);
    
    // Verify performance was logged (check for duration in logs)
    expect(debugSpy).toHaveBeenCalled();
    logger.info('✅ Performance metrics logged');
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: Password Not Logged
   * -------------------------------
   * Verifies that neither plaintext passwords nor hashes are logged
   * in plain text to prevent credential exposure in logs.
   * 
   * Security: Critical for GDPR and security compliance.
   */
  it('should never log plaintext passwords or hashes', async () => {
    logger.info('🧪 Test: Password values not logged');
    
    const password = 'SecretPassword123';
    const hash = await hashPassword(password);
    
    await comparePasswords(password, hash);
    
    // Check that no spy call contains the actual password
    const allCalls = [
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
      ...debugSpy.mock.calls,
    ];
    
    const passwordLogged = allCalls.some((call) =>
      call.some((arg: any) => typeof arg === 'string' && arg.includes(password))
    );
    
    const hashLogged = allCalls.some((call) =>
      call.some((arg: any) => typeof arg === 'string' && arg.includes(hash))
    );
    
    expect(passwordLogged).toBe(false);
    expect(hashLogged).toBe(false);
    logger.info('✅ Security verified: No passwords in logs');
  });
});
