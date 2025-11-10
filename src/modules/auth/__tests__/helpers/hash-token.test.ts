/**
 * Hash Token Helper Test Suite
 * =============================
 * 
 * Tests the sha256 function which generates SHA-256 hashes for secure token storage.
 * This is critical for storing refresh tokens securely (store hash, not raw token).
 * 
 * Test Coverage:
 * ✅ SHA-256 hash generation
 * ✅ Hash format validation (64 hex characters)
 * ✅ Hash determinism (same input → same hash)
 * ✅ Hash uniqueness (different input → different hash)
 * ✅ Hash irreversibility (one-way function)
 * ✅ Empty string handling
 * ✅ Special characters in input
 * ✅ Very long input handling
 * ✅ Collision resistance validation
 * 
 * Security Considerations:
 * - SHA-256 is cryptographically secure
 * - One-way function (irreversible)
 * - Deterministic (same input always produces same output)
 * - Collision resistant (different inputs produce different outputs)
 * - Used for secure token storage in database
 */

import { sha256 } from '../../helpers/hash-token';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('sha256 Hash Token Helper', () => {
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    logger.info('🔄 Setting up test case...');
  });

  afterEach(() => {
    infoSpy.mockRestore();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Basic Hash Generation Tests
  // =============================================================================

  /**
   * Test Case: Basic SHA-256 Hash Generation
   * -----------------------------------------
   * Verifies that sha256 generates a valid hash.
   */
  it('should generate SHA-256 hash for input string', () => {
    logger.info('🧪 Test: Basic SHA-256 hash generation');
    
    const input = 'test-token-123';
    logger.info(`🔄 Hashing input: "${input}"`);
    
    const hash = sha256(input);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    logger.info(`✅ Generated hash: ${hash.substring(0, 16)}...`);
  });

  /**
   * Test Case: Hash Format Validation
   * ----------------------------------
   * Verifies that SHA-256 hash is 64 hex characters.
   */
  it('should produce 64-character hexadecimal hash', () => {
    logger.info('🧪 Test: Hash format validation');
    
    const input = 'refresh-token-abc123';
    const hash = sha256(input);
    
    // SHA-256 produces 256 bits = 32 bytes = 64 hex characters
    expect(hash.length).toBe(64);
    logger.info('✅ Hash length is 64 characters');
    
    // Should be hexadecimal (0-9, a-f)
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info('✅ Hash is valid hexadecimal format');
  });

  // =============================================================================
  // Determinism Tests
  // =============================================================================

  /**
   * Test Case: Hash Determinism
   * ----------------------------
   * Verifies that same input always produces same hash (deterministic).
   */
  it('should produce same hash for same input (deterministic)', () => {
    logger.info('🧪 Test: Hash determinism');
    
    const input = 'same-token-value';
    
    logger.info('🔄 Hashing input multiple times...');
    const hash1 = sha256(input);
    const hash2 = sha256(input);
    const hash3 = sha256(input);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
    expect(hash2).toBe(hash3);
    logger.info('✅ All hashes are identical (deterministic behavior confirmed)');
  });

  /**
   * Test Case: Known Hash Values
   * -----------------------------
   * Verifies against known SHA-256 test vectors.
   */
  it('should match known SHA-256 test vectors', () => {
    logger.info('🧪 Test: Known SHA-256 test vectors');
    
    // Known SHA-256 test vectors
    const testVectors = [
      {
        input: '',
        expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      },
      {
        input: 'abc',
        expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
      },
      {
        input: 'hello',
        expected: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
      }
    ];
    
    testVectors.forEach(({ input, expected }) => {
      logger.info(`🔄 Testing: "${input || '(empty)'}"`);
      const hash = sha256(input);
      expect(hash).toBe(expected);
      logger.info(`✅ Hash matches: ${hash.substring(0, 16)}...`);
    });
    
    logger.info('✅ All test vectors match');
  });

  // =============================================================================
  // Uniqueness Tests
  // =============================================================================

  /**
   * Test Case: Hash Uniqueness
   * ---------------------------
   * Verifies that different inputs produce different hashes.
   */
  it('should produce different hashes for different inputs', () => {
    logger.info('🧪 Test: Hash uniqueness');
    
    const input1 = 'token-1';
    const input2 = 'token-2';
    
    const hash1 = sha256(input1);
    const hash2 = sha256(input2);
    
    expect(hash1).not.toBe(hash2);
    logger.info('✅ Different inputs produce different hashes');
  });

  /**
   * Test Case: Similar Inputs Produce Different Hashes
   * ---------------------------------------------------
   * Verifies that even very similar inputs produce completely different hashes.
   */
  it('should produce completely different hashes for similar inputs', () => {
    logger.info('🧪 Test: Similar inputs collision resistance');
    
    const input1 = 'token123';
    const input2 = 'token124'; // Only 1 character different
    
    const hash1 = sha256(input1);
    const hash2 = sha256(input2);
    
    expect(hash1).not.toBe(hash2);
    
    // Count how many characters differ
    let diffCount = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) diffCount++;
    }
    
    // SHA-256 should have avalanche effect (many characters different)
    expect(diffCount).toBeGreaterThan(30); // Significant difference
    logger.info(`✅ Hashes differ in ${diffCount}/64 positions (avalanche effect)`);
  });

  /**
   * Test Case: Case Sensitivity
   * ----------------------------
   * Verifies that SHA-256 is case-sensitive.
   */
  it('should be case-sensitive', () => {
    logger.info('🧪 Test: Case sensitivity');
    
    const hash1 = sha256('Token');
    const hash2 = sha256('token');
    const hash3 = sha256('TOKEN');
    
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash2).not.toBe(hash3);
    logger.info('✅ Case-sensitive hashing confirmed');
  });

  // =============================================================================
  // Edge Case Tests
  // =============================================================================

  /**
   * Test Case: Empty String
   * ------------------------
   * Verifies that empty string produces valid hash.
   */
  it('should handle empty string', () => {
    logger.info('🧪 Test: Empty string hashing');
    
    const hash = sha256('');
    
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    logger.info('✅ Empty string produces valid hash');
  });

  /**
   * Test Case: Special Characters
   * ------------------------------
   * Verifies that special characters are handled correctly.
   */
  it('should handle special characters', () => {
    logger.info('🧪 Test: Special characters');
    
    const inputs = [
      '!@#$%^&*()',
      'token-with-dashes',
      'token_with_underscores',
      'token.with.dots',
      'token/with/slashes',
      'token=with=equals',
    ];
    
    inputs.forEach((input) => {
      logger.info(`🔄 Hashing: "${input}"`);
      const hash = sha256(input);
      
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      logger.info(`✅ Hash: ${hash.substring(0, 16)}...`);
    });
    
    logger.info('✅ All special characters handled correctly');
  });

  /**
   * Test Case: Unicode Characters
   * ------------------------------
   * Verifies that Unicode/emoji are handled correctly.
   */
  it('should handle Unicode characters', () => {
    logger.info('🧪 Test: Unicode handling');
    
    const inputs = [
      'token-中文',
      'token-español',
      'token-العربية',
      'token-🔐🚀',
    ];
    
    inputs.forEach((input) => {
      logger.info(`🔄 Hashing Unicode: "${input}"`);
      const hash = sha256(input);
      
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      logger.info('✅ Unicode hashed successfully');
    });
    
    logger.info('✅ Unicode characters handled correctly');
  });

  /**
   * Test Case: Very Long Input
   * ---------------------------
   * Verifies that very long strings are hashed correctly.
   */
  it('should handle very long input strings', () => {
    logger.info('🧪 Test: Very long input');
    
    const longInput = 'a'.repeat(10000); // 10KB string
    logger.info(`🔄 Hashing ${longInput.length}-character string...`);
    
    const hash = sha256(longInput);
    
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info('✅ Long input hashed successfully');
  });

  /**
   * Test Case: Whitespace Sensitivity
   * ----------------------------------
   * Verifies that whitespace affects the hash.
   */
  it('should be sensitive to whitespace', () => {
    logger.info('🧪 Test: Whitespace sensitivity');
    
    const hash1 = sha256('token');
    const hash2 = sha256('token '); // Trailing space
    const hash3 = sha256(' token'); // Leading space
    const hash4 = sha256('to ken'); // Middle space
    
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).not.toBe(hash4);
    logger.info('✅ Whitespace changes hash (as expected)');
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: One-Way Function (Irreversibility)
   * ----------------------------------------------
   * Verifies that hash cannot be reversed to get original input.
   */
  it('should be one-way (irreversible)', () => {
    logger.info('🧪 Test: One-way function verification');
    
    const token = 'super-secret-token-12345';
    const hash = sha256(token);
    
    // Hash should not contain the original token
    expect(hash).not.toContain(token);
    expect(hash).not.toContain('secret');
    expect(hash).not.toContain('12345');
    logger.info('✅ Hash does not reveal original input');
  });

  /**
   * Test Case: Collision Resistance
   * --------------------------------
   * Verifies that it's extremely unlikely to find two inputs with same hash.
   */
  it('should have collision resistance', () => {
    logger.info('🧪 Test: Collision resistance');
    
    const hashes = new Set<string>();
    const count = 1000;
    
    logger.info(`🔄 Generating ${count} hashes...`);
    for (let i = 0; i < count; i++) {
      const hash = sha256(`token-${i}`);
      hashes.add(hash);
    }
    
    // All hashes should be unique
    expect(hashes.size).toBe(count);
    logger.info(`✅ All ${count} hashes are unique (no collisions)`);
  });

  // =============================================================================
  // Real-World Usage Tests
  // =============================================================================

  /**
   * Test Case: Refresh Token Hashing
   * ---------------------------------
   * Verifies typical refresh token hashing scenario.
   */
  it('should hash refresh tokens securely', () => {
    logger.info('🧪 Test: Refresh token hashing');
    
    // Simulate a refresh token (96 hex characters from crypto.randomBytes(48))
    const refreshToken = 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    
    logger.info('🔄 Hashing refresh token...');
    const hash = sha256(refreshToken);
    
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info(`✅ Refresh token hashed: ${hash.substring(0, 16)}...`);
    
    // Verify determinism for storage/verification
    const hash2 = sha256(refreshToken);
    expect(hash).toBe(hash2);
    logger.info('✅ Hash is deterministic (can verify stored hash)');
  });

  /**
   * Test Case: Performance Validation
   * ----------------------------------
   * Verifies that hashing is fast enough for production use.
   */
  it('should hash tokens quickly', () => {
    logger.info('🧪 Test: Hashing performance');
    
    const token = 'performance-test-token-123456789';
    const iterations = 1000;
    
    logger.info(`🔄 Hashing ${iterations} times...`);
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      sha256(token + i);
    }
    
    const duration = Date.now() - start;
    const avgTime = duration / iterations;
    
    logger.info(`✅ ${iterations} hashes in ${duration}ms`);
    logger.info(`✅ Average: ${avgTime.toFixed(3)}ms per hash`);
    
    // Should be very fast (< 1ms per hash on modern hardware)
    expect(avgTime).toBeLessThan(1);
  });
});
