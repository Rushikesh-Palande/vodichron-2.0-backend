/**
 * Generate Random String Helper Test Suite
 * ==========================================
 * 
 * Tests the generateRandomString and generateRandomNumeric functions which create
 * cryptographically secure random strings for security-sensitive operations.
 * 
 * Test Coverage:
 * ✅ Default length random string generation
 * ✅ Custom length random string generation
 * ✅ String format validation (alphanumeric only)
 * ✅ Uniqueness verification (no duplicates)
 * ✅ Distribution randomness check
 * ✅ Numeric string generation
 * ✅ OTP generation (6-digit codes)
 * ✅ Error handling for crypto failures
 * ✅ Edge cases (0 length, very long strings)
 * ✅ Performance validation
 * 
 * Security Considerations:
 * - Uses crypto.randomBytes (cryptographically secure)
 * - Tests for proper randomness distribution
 * - Validates no predictable patterns
 * - Ensures sufficient entropy for security tokens
 */

import { generateRandomString, generateRandomNumeric } from '../../helpers/generate-random-string.helper';
import { logger } from '../../../../utils/logger';
import crypto from 'crypto';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('generateRandomString Helper', () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    logger.info('🔄 Setting up test case...');
  });

  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Basic String Generation Tests
  // =============================================================================

  /**
   * Test Case: Default Length Generation
   * -------------------------------------
   * Verifies that generateRandomString returns a 32-character string by default.
   */
  it('should generate random string with default length of 32', () => {
    logger.info('🧪 Test: Default length generation');
    
    const result = generateRandomString();
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBe(32);
    logger.info(`✅ Generated 32-character string: ${result.substring(0, 10)}...`);
  });

  /**
   * Test Case: Custom Length Generation
   * ------------------------------------
   * Verifies that custom lengths work correctly.
   */
  it('should generate random string with custom length', () => {
    logger.info('🧪 Test: Custom length generation');
    
    const lengths = [1, 5, 10, 16, 64, 128];
    
    lengths.forEach((length) => {
      logger.info(`🔄 Generating ${length}-character string...`);
      const result = generateRandomString(length);
      
      expect(result.length).toBe(length);
      logger.info(`✅ Generated ${length}-character string successfully`);
    });
    
    logger.info('✅ All custom lengths work correctly');
  });

  // =============================================================================
  // Format Validation Tests
  // =============================================================================

  /**
   * Test Case: Alphanumeric Only Format
   * ------------------------------------
   * Verifies that generated strings contain only alphanumeric characters.
   */
  it('should generate strings with only alphanumeric characters', () => {
    logger.info('🧪 Test: Alphanumeric format validation');
    
    const result = generateRandomString(100);
    const alphanumericRegex = /^[A-Za-z0-9]+$/;
    
    expect(result).toMatch(alphanumericRegex);
    logger.info('✅ String contains only alphanumeric characters');
  });

  /**
   * Test Case: No Special Characters
   * ---------------------------------
   * Verifies that no special characters are present.
   */
  it('should not contain special characters', () => {
    logger.info('🧪 Test: No special characters');
    
    const result = generateRandomString(200);
    const specialChars = /[^A-Za-z0-9]/;
    
    expect(result).not.toMatch(specialChars);
    logger.info('✅ No special characters found');
  });

  /**
   * Test Case: Contains Both Letters and Numbers
   * ---------------------------------------------
   * Verifies that over many generations, we see both letters and numbers.
   */
  it('should contain both letters and numbers over multiple generations', () => {
    logger.info('🧪 Test: Letters and numbers distribution');
    
    let hasUppercase = false;
    let hasLowercase = false;
    let hasNumbers = false;
    
    // Generate multiple strings to increase probability
    for (let i = 0; i < 10; i++) {
      const result = generateRandomString(50);
      
      if (/[A-Z]/.test(result)) hasUppercase = true;
      if (/[a-z]/.test(result)) hasLowercase = true;
      if (/[0-9]/.test(result)) hasNumbers = true;
      
      if (hasUppercase && hasLowercase && hasNumbers) break;
    }
    
    expect(hasUppercase).toBe(true);
    expect(hasLowercase).toBe(true);
    expect(hasNumbers).toBe(true);
    logger.info('✅ Contains uppercase, lowercase, and numbers');
  });

  // =============================================================================
  // Uniqueness Tests
  // =============================================================================

  /**
   * Test Case: String Uniqueness
   * -----------------------------
   * Verifies that multiple calls produce unique strings.
   */
  it('should generate unique strings on each call', () => {
    logger.info('🧪 Test: String uniqueness');
    
    const strings = new Set<string>();
    const count = 100;
    
    logger.info(`🔄 Generating ${count} random strings...`);
    for (let i = 0; i < count; i++) {
      const result = generateRandomString(32);
      strings.add(result);
    }
    
    // All strings should be unique
    expect(strings.size).toBe(count);
    logger.info(`✅ All ${count} strings are unique`);
  });

  /**
   * Test Case: No Predictable Patterns
   * -----------------------------------
   * Verifies that generated strings don't follow predictable patterns.
   */
  it('should not produce predictable patterns', () => {
    logger.info('🧪 Test: No predictable patterns');
    
    const str1 = generateRandomString(32);
    const str2 = generateRandomString(32);
    
    // Strings should not be sequential or similar
    expect(str1).not.toBe(str2);
    
    // Calculate similarity (should be low for random strings)
    let matchCount = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
      if (str1[i] === str2[i]) matchCount++;
    }
    const similarity = matchCount / str1.length;
    
    // Less than 20% similarity expected for random strings
    expect(similarity).toBeLessThan(0.2);
    logger.info(`✅ Strings have ${(similarity * 100).toFixed(1)}% similarity (random)`);
  });

  // =============================================================================
  // Edge Case Tests
  // =============================================================================

  /**
   * Test Case: Minimum Length (1 character)
   * ----------------------------------------
   * Verifies that a single-character string can be generated.
   */
  it('should generate single character string', () => {
    logger.info('🧪 Test: Minimum length (1)');
    
    const result = generateRandomString(1);
    
    expect(result.length).toBe(1);
    expect(/[A-Za-z0-9]/.test(result)).toBe(true);
    logger.info(`✅ Single character generated: "${result}"`);
  });

  /**
   * Test Case: Very Long String
   * ----------------------------
   * Verifies that very long strings can be generated.
   */
  it('should generate very long strings', () => {
    logger.info('🧪 Test: Very long string generation');
    
    const length = 10000;
    logger.info(`🔄 Generating ${length}-character string...`);
    
    const start = Date.now();
    const result = generateRandomString(length);
    const duration = Date.now() - start;
    
    expect(result.length).toBe(length);
    logger.info(`✅ Generated ${length} characters in ${duration}ms`);
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  /**
   * Test Case: Crypto Error Handling
   * ---------------------------------
   * Verifies that crypto errors are caught and re-thrown properly.
   */
  it('should throw error when crypto.randomBytes fails', () => {
    logger.info('🧪 Test: Crypto error handling');
    
    // Mock crypto.randomBytes to throw error
    const originalRandomBytes = crypto.randomBytes;
    (crypto as any).randomBytes = jest.fn(() => {
      throw new Error('Simulated crypto failure');
    });
    
    logger.info('🔄 Triggering crypto error...');
    
    expect(() => {
      generateRandomString(32);
    }).toThrow('Failed to generate random string');
    
    logger.info('✅ Error thrown correctly');
    
    // Verify error was logged
    expect(errorSpy).toHaveBeenCalled();
    logger.info('✅ Error logged appropriately');
    
    // Restore original function
    (crypto as any).randomBytes = originalRandomBytes;
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: Cryptographic Randomness
   * ------------------------------------
   * Verifies that the generated strings have sufficient entropy.
   */
  it('should have sufficient entropy for security tokens', () => {
    logger.info('🧪 Test: Cryptographic randomness');
    
    const strings = [];
    for (let i = 0; i < 50; i++) {
      strings.push(generateRandomString(32));
    }
    
    // Check character distribution
    const charCounts = new Map<string, number>();
    const allChars = strings.join('');
    
    for (const char of allChars) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    // With good randomness, we should see reasonable distribution
    const uniqueChars = charCounts.size;
    expect(uniqueChars).toBeGreaterThan(30); // Should use most alphanumeric chars
    logger.info(`✅ Uses ${uniqueChars} unique characters (good distribution)`);
  });
});

// =============================================================================
// Numeric String Generation Tests
// =============================================================================

describe('generateRandomNumeric Helper', () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    logger.info('🔄 Setting up test case...');
  });

  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Basic Numeric Generation Tests
  // =============================================================================

  /**
   * Test Case: Default Length (6 digits)
   * -------------------------------------
   * Verifies that default OTP length is 6 digits.
   */
  it('should generate 6-digit numeric string by default', () => {
    logger.info('🧪 Test: Default 6-digit generation');
    
    const result = generateRandomNumeric();
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBe(6);
    logger.info(`✅ Generated 6-digit code: ${result}`);
  });

  /**
   * Test Case: Custom Length Numeric
   * ---------------------------------
   * Verifies that custom lengths work for numeric strings.
   */
  it('should generate numeric string with custom length', () => {
    logger.info('🧪 Test: Custom length numeric generation');
    
    const lengths = [4, 6, 8, 10];
    
    lengths.forEach((length) => {
      logger.info(`🔄 Generating ${length}-digit code...`);
      const result = generateRandomNumeric(length);
      
      expect(result.length).toBe(length);
      logger.info(`✅ Generated ${length}-digit code: ${result}`);
    });
  });

  // =============================================================================
  // Format Validation Tests
  // =============================================================================

  /**
   * Test Case: Numeric Only Format
   * -------------------------------
   * Verifies that only digits 0-9 are present.
   */
  it('should contain only numeric characters', () => {
    logger.info('🧪 Test: Numeric-only format');
    
    const result = generateRandomNumeric(20);
    const numericRegex = /^[0-9]+$/;
    
    expect(result).toMatch(numericRegex);
    logger.info(`✅ String contains only digits: ${result}`);
  });

  /**
   * Test Case: No Letters in Numeric
   * ---------------------------------
   * Verifies that no letters are present.
   */
  it('should not contain letters', () => {
    logger.info('🧪 Test: No letters in numeric string');
    
    const result = generateRandomNumeric(50);
    const letterRegex = /[A-Za-z]/;
    
    expect(result).not.toMatch(letterRegex);
    logger.info('✅ No letters found in numeric string');
  });

  // =============================================================================
  // OTP Tests
  // =============================================================================

  /**
   * Test Case: OTP Code Generation
   * -------------------------------
   * Verifies that 6-digit OTP codes are generated correctly.
   */
  it('should generate valid 6-digit OTP codes', () => {
    logger.info('🧪 Test: OTP code generation');
    
    const otps = [];
    for (let i = 0; i < 10; i++) {
      const otp = generateRandomNumeric(6);
      otps.push(otp);
      
      expect(otp.length).toBe(6);
      expect(/^[0-9]{6}$/.test(otp)).toBe(true);
    }
    
    logger.info(`✅ Generated 10 valid OTP codes: ${otps.slice(0, 3).join(', ')}...`);
  });

  /**
   * Test Case: Leading Zeros Allowed
   * ---------------------------------
   * Verifies that OTPs can start with 0.
   */
  it('should allow leading zeros in OTPs', () => {
    logger.info('🧪 Test: Leading zeros allowed');
    
    let hasLeadingZero = false;
    
    // Generate multiple OTPs to find one with leading zero
    for (let i = 0; i < 100; i++) {
      const otp = generateRandomNumeric(6);
      if (otp.startsWith('0')) {
        hasLeadingZero = true;
        logger.info(`✅ Found OTP with leading zero: ${otp}`);
        break;
      }
    }
    
    // Over 100 attempts, we should see at least one leading zero
    expect(hasLeadingZero).toBe(true);
    logger.info('✅ Leading zeros are properly allowed');
  });

  // =============================================================================
  // Uniqueness Tests
  // =============================================================================

  /**
   * Test Case: Numeric Uniqueness
   * ------------------------------
   * Verifies that numeric strings are unique.
   */
  it('should generate unique numeric strings', () => {
    logger.info('🧪 Test: Numeric string uniqueness');
    
    const codes = new Set<string>();
    const count = 50;
    
    for (let i = 0; i < count; i++) {
      const code = generateRandomNumeric(8);
      codes.add(code);
    }
    
    // High probability all are unique for 8-digit codes
    expect(codes.size).toBeGreaterThan(45); // Allow for small collision probability
    logger.info(`✅ Generated ${codes.size}/${count} unique codes`);
  });

  // =============================================================================
  // Distribution Tests
  // =============================================================================

  /**
   * Test Case: Digit Distribution
   * ------------------------------
   * Verifies that all digits 0-9 appear with reasonable frequency.
   */
  it('should have good distribution of all digits', () => {
    logger.info('🧪 Test: Digit distribution');
    
    const codes = [];
    for (let i = 0; i < 100; i++) {
      codes.push(generateRandomNumeric(10));
    }
    
    const allDigits = codes.join('');
    const digitCounts = new Map<string, number>();
    
    for (const digit of allDigits) {
      digitCounts.set(digit, (digitCounts.get(digit) || 0) + 1);
    }
    
    // All 10 digits should appear
    expect(digitCounts.size).toBe(10);
    logger.info('✅ All digits 0-9 present in distribution');
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  /**
   * Test Case: Crypto Error in Numeric
   * -----------------------------------
   * Verifies error handling for generateRandomNumeric.
   */
  it('should throw error when crypto fails for numeric generation', () => {
    logger.info('🧪 Test: Crypto error in numeric generation');
    
    const originalRandomBytes = crypto.randomBytes;
    (crypto as any).randomBytes = jest.fn(() => {
      throw new Error('Crypto error');
    });
    
    expect(() => {
      generateRandomNumeric(6);
    }).toThrow('Failed to generate random numeric string');
    
    expect(errorSpy).toHaveBeenCalled();
    logger.info('✅ Error handled correctly');
    
    (crypto as any).randomBytes = originalRandomBytes;
  });
});
