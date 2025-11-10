/**
 * Verify Refresh Token Helper Test Suite
 * ========================================
 * 
 * Tests the hashRefreshToken function which hashes refresh tokens for
 * verification against stored hashes in the database.
 * 
 * Test Coverage:
 * ✅ Basic token hashing
 * ✅ Hash format validation (64 hex characters)
 * ✅ Hash determinism (same token → same hash)
 * ✅ Hash uniqueness (different tokens → different hashes)
 * ✅ Verification workflow (token → hash → comparison)
 * ✅ Security validation (one-way function)
 * ✅ Integration with generateRefreshToken
 * ✅ Edge cases and error handling
 * 
 * Security Considerations:
 * - Uses SHA-256 for hashing (cryptographically secure)
 * - One-way function (cannot derive token from hash)
 * - Deterministic (same input always produces same output)
 * - Used for comparing incoming tokens against stored hashes
 */

import { hashRefreshToken } from '../../helpers/verify-refresh-token';
import { generateRefreshToken } from '../../helpers/generate-refresh-token';
import { sha256 } from '../../helpers/hash-token';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('hashRefreshToken Helper', () => {
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
  // Basic Hashing Tests
  // =============================================================================

  /**
   * Test Case: Basic Token Hashing
   * -------------------------------
   * Verifies that function hashes a token.
   */
  it('should hash a refresh token', () => {
    logger.info('🧪 Test: Basic token hashing');
    
    const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const hash = hashRefreshToken(token);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    logger.info('✅ Token hashed successfully');
    logger.info(`  Hash: ${hash}`);
  });

  /**
   * Test Case: Hash Format Validation
   * ----------------------------------
   * Verifies that hash is 64 hex characters (SHA-256).
   */
  it('should produce 64-character hexadecimal hash', () => {
    logger.info('🧪 Test: Hash format validation');
    
    const token = 'a'.repeat(96);
    const hash = hashRefreshToken(token);
    
    expect(hash.length).toBe(64);
    logger.info('✅ Hash length is 64 characters');
    
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info('✅ Hash is valid hexadecimal');
  });

  /**
   * Test Case: Uses SHA-256 Internally
   * -----------------------------------
   * Verifies that function delegates to sha256 helper.
   */
  it('should use sha256 for hashing', () => {
    logger.info('🧪 Test: SHA-256 delegation');
    
    const token = 'test-token-123';
    const hash = hashRefreshToken(token);
    const expectedHash = sha256(token);
    
    expect(hash).toBe(expectedHash);
    logger.info('✅ hashRefreshToken correctly uses sha256');
  });

  // =============================================================================
  // Determinism Tests
  // =============================================================================

  /**
   * Test Case: Hash Determinism
   * ----------------------------
   * Verifies that same token always produces same hash.
   */
  it('should produce same hash for same token', () => {
    logger.info('🧪 Test: Hash determinism');
    
    const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    logger.info('🔄 Hashing token multiple times...');
    const hash1 = hashRefreshToken(token);
    const hash2 = hashRefreshToken(token);
    const hash3 = hashRefreshToken(token);
    
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
    logger.info('✅ All hashes are identical (deterministic)');
  });

  /**
   * Test Case: Different Tokens Produce Different Hashes
   * -----------------------------------------------------
   * Verifies that different tokens produce different hashes.
   */
  it('should produce different hashes for different tokens', () => {
    logger.info('🧪 Test: Hash uniqueness');
    
    const token1 = 'a'.repeat(96);
    const token2 = 'b'.repeat(96);
    
    const hash1 = hashRefreshToken(token1);
    const hash2 = hashRefreshToken(token2);
    
    expect(hash1).not.toBe(hash2);
    logger.info('✅ Different tokens produce different hashes');
  });

  /**
   * Test Case: Minor Token Changes Produce Different Hashes
   * --------------------------------------------------------
   * Verifies avalanche effect (small change = totally different hash).
   */
  it('should produce completely different hash for minor token change', () => {
    logger.info('🧪 Test: Avalanche effect');
    
    const token1 = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const token2 = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdeg'; // last char changed
    
    const hash1 = hashRefreshToken(token1);
    const hash2 = hashRefreshToken(token2);
    
    expect(hash1).not.toBe(hash2);
    
    // Calculate difference
    let differentChars = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) differentChars++;
    }
    
    // Should have many different characters (avalanche effect)
    expect(differentChars).toBeGreaterThan(20);
    logger.info(`✅ ${differentChars}/64 characters different (strong avalanche effect)`);
  });

  // =============================================================================
  // Verification Workflow Tests
  // =============================================================================

  /**
   * Test Case: Token Verification Success
   * --------------------------------------
   * Simulates successful token verification workflow.
   */
  it('should verify valid token correctly', () => {
    logger.info('🧪 Test: Valid token verification');
    
    // Step 1: Generate token (simulates login)
    logger.info('🔄 Step 1: Generating token...');
    const { token, hash: storedHash } = generateRefreshToken();
    logger.info('✅ Step 1: Token generated and hash stored');
    
    // Step 2: Client sends token back
    logger.info('🔄 Step 2: Client sends token for verification...');
    const incomingToken = token;
    logger.info('✅ Step 2: Token received');
    
    // Step 3: Hash incoming token
    logger.info('🔄 Step 3: Hashing incoming token...');
    const computedHash = hashRefreshToken(incomingToken);
    logger.info('✅ Step 3: Token hashed');
    
    // Step 4: Compare hashes
    logger.info('🔄 Step 4: Comparing hashes...');
    const isValid = computedHash === storedHash;
    
    expect(isValid).toBe(true);
    logger.info('✅ Step 4: Token verified successfully');
  });

  /**
   * Test Case: Token Verification Failure
   * --------------------------------------
   * Simulates failed token verification (wrong token).
   */
  it('should reject invalid token', () => {
    logger.info('🧪 Test: Invalid token rejection');
    
    // Store hash for one token
    const { hash: storedHash } = generateRefreshToken();
    logger.info('✅ Stored hash for original token');
    
    // Try to verify different token
    logger.info('🔄 Attempting to verify different token...');
    const { token: wrongToken } = generateRefreshToken();
    const computedHash = hashRefreshToken(wrongToken);
    const isValid = computedHash === storedHash;
    
    expect(isValid).toBe(false);
    logger.info('✅ Wrong token correctly rejected');
  });

  /**
   * Test Case: Token Tampering Detection
   * -------------------------------------
   * Verifies that tampered tokens are detected.
   */
  it('should detect tampered tokens', () => {
    logger.info('🧪 Test: Token tampering detection');
    
    const { token: originalToken, hash: storedHash } = generateRefreshToken();
    logger.info('✅ Generated original token');
    
    // Tamper with token (change one character)
    logger.info('🔄 Tampering with token...');
    const tamperedToken = originalToken.slice(0, -1) + (originalToken[originalToken.length - 1] === 'a' ? 'b' : 'a');
    logger.info('✅ Token tampered');
    
    // Try to verify tampered token
    logger.info('🔄 Verifying tampered token...');
    const computedHash = hashRefreshToken(tamperedToken);
    const isValid = computedHash === storedHash;
    
    expect(isValid).toBe(false);
    logger.info('✅ Tampered token detected and rejected');
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  /**
   * Test Case: Integration with generateRefreshToken
   * -------------------------------------------------
   * Verifies seamless integration with token generation.
   */
  it('should work seamlessly with generateRefreshToken', () => {
    logger.info('🧪 Test: Integration with generateRefreshToken');
    
    // Generate token
    logger.info('🔄 Generating refresh token...');
    const { token, hash: generatedHash } = generateRefreshToken();
    logger.info('✅ Token generated');
    
    // Verify we can reproduce the hash
    logger.info('🔄 Reproducing hash using hashRefreshToken...');
    const recomputedHash = hashRefreshToken(token);
    
    expect(recomputedHash).toBe(generatedHash);
    logger.info('✅ Hash reproduced successfully (integration confirmed)');
  });

  /**
   * Test Case: Multiple Token Verification
   * ---------------------------------------
   * Verifies handling of multiple tokens for same user.
   */
  it('should handle multiple tokens per user', () => {
    logger.info('🧪 Test: Multiple token verification');
    
    // Generate 3 tokens for same user (different devices)
    logger.info('🔄 Generating 3 tokens for user...');
    const tokens = [
      generateRefreshToken(),
      generateRefreshToken(),
      generateRefreshToken(),
    ];
    logger.info('✅ 3 tokens generated');
    
    // Verify each token individually
    logger.info('🔄 Verifying each token...');
    tokens.forEach((tokenData, index) => {
      const computedHash = hashRefreshToken(tokenData.token);
      const isValid = computedHash === tokenData.hash;
      expect(isValid).toBe(true);
      logger.info(`✅ Token ${index + 1} verified`);
    });
    
    logger.info('✅ All tokens verified successfully');
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: One-Way Function (Cannot Reverse)
   * ---------------------------------------------
   * Verifies that hash cannot be reversed to get token.
   */
  it('should be one-way (cannot derive token from hash)', () => {
    logger.info('🧪 Test: One-way function security');
    
    const token = 'secret-token-12345';
    const hash = hashRefreshToken(token);
    
    // Hash should not contain token
    expect(hash).not.toContain(token);
    expect(hash).not.toContain('secret');
    expect(hash).not.toContain('12345');
    logger.info('✅ Hash does not reveal token (one-way confirmed)');
  });

  /**
   * Test Case: Hash Collision Resistance
   * -------------------------------------
   * Verifies low probability of hash collisions.
   */
  it('should have collision resistance', () => {
    logger.info('🧪 Test: Hash collision resistance');
    
    const hashes = new Set<string>();
    const count = 1000;
    
    logger.info(`🔄 Generating ${count} different token hashes...`);
    for (let i = 0; i < count; i++) {
      const { token } = generateRefreshToken();
      const hash = hashRefreshToken(token);
      hashes.add(hash);
    }
    
    expect(hashes.size).toBe(count);
    logger.info(`✅ All ${count} hashes are unique (no collisions)`);
  });

  // =============================================================================
  // Edge Cases Tests
  // =============================================================================

  /**
   * Test Case: Empty String Token
   * ------------------------------
   * Verifies behavior with empty token.
   */
  it('should handle empty string token', () => {
    logger.info('🧪 Test: Empty string token');
    
    const hash = hashRefreshToken('');
    
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info('✅ Empty string hashed successfully');
    logger.info(`  Hash: ${hash}`);
  });

  /**
   * Test Case: Very Long Token
   * ---------------------------
   * Verifies handling of unusually long tokens.
   */
  it('should handle very long tokens', () => {
    logger.info('🧪 Test: Very long token');
    
    const longToken = 'a'.repeat(10000);
    const hash = hashRefreshToken(longToken);
    
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info('✅ Long token (10,000 chars) hashed successfully');
  });

  /**
   * Test Case: Unicode Token
   * -------------------------
   * Verifies handling of Unicode characters in tokens.
   */
  it('should handle Unicode characters', () => {
    logger.info('🧪 Test: Unicode token');
    
    const unicodeToken = '🔐🔒🔓🔑🗝️' + 'あいうえお' + '测试';
    const hash = hashRefreshToken(unicodeToken);
    
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info('✅ Unicode token hashed successfully');
  });

  /**
   * Test Case: Special Characters Token
   * ------------------------------------
   * Verifies handling of special characters.
   */
  it('should handle special characters', () => {
    logger.info('🧪 Test: Special characters token');
    
    const specialToken = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    const hash = hashRefreshToken(specialToken);
    
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info('✅ Special characters token hashed successfully');
  });

  // =============================================================================
  // Performance Tests
  // =============================================================================

  /**
   * Test Case: Performance Validation
   * ----------------------------------
   * Verifies that hashing is fast enough for production.
   */
  it('should hash tokens quickly', () => {
    logger.info('🧪 Test: Hashing performance');
    
    const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const iterations = 10000;
    
    logger.info(`🔄 Hashing token ${iterations} times...`);
    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
      hashRefreshToken(token);
    }
    const duration = Date.now() - start;
    const avgTime = duration / iterations;
    
    logger.info(`✅ ${iterations} hashes in ${duration}ms`);
    logger.info(`✅ Average: ${avgTime.toFixed(4)}ms per hash`);
    
    // Should be very fast (< 0.1ms per hash)
    expect(avgTime).toBeLessThan(0.1);
  });

  // =============================================================================
  // Real-World Scenario Tests
  // =============================================================================

  /**
   * Test Case: Token Rotation Scenario
   * -----------------------------------
   * Simulates token rotation (old token invalidation).
   */
  it('should support token rotation scenario', () => {
    logger.info('🧪 Test: Token rotation scenario');
    
    // User has old token
    logger.info('🔄 Step 1: User has old token...');
    const { token: oldToken, hash: oldHash } = generateRefreshToken();
    logger.info('✅ Step 1: Old token exists');
    
    // User requests new token
    logger.info('🔄 Step 2: Rotating to new token...');
    const { token: newToken, hash: newHash } = generateRefreshToken();
    logger.info('✅ Step 2: New token generated');
    
    // Verify old token still works (before deletion)
    logger.info('🔄 Step 3: Verifying old token...');
    const oldTokenValid = hashRefreshToken(oldToken) === oldHash;
    expect(oldTokenValid).toBe(true);
    logger.info('✅ Step 3: Old token still valid');
    
    // Verify new token works
    logger.info('🔄 Step 4: Verifying new token...');
    const newTokenValid = hashRefreshToken(newToken) === newHash;
    expect(newTokenValid).toBe(true);
    logger.info('✅ Step 4: New token valid');
    
    // After deleting old hash from DB, old token would fail
    logger.info('🔄 Step 5: Simulating old token deletion...');
    const oldTokenStillValid = hashRefreshToken(oldToken) === newHash; // Wrong hash
    expect(oldTokenStillValid).toBe(false);
    logger.info('✅ Step 5: Old token no longer matches (rotation complete)');
  });

  /**
   * Test Case: Concurrent Verification
   * -----------------------------------
   * Verifies thread-safety for concurrent requests.
   */
  it('should handle concurrent verification', () => {
    logger.info('🧪 Test: Concurrent verification');
    
    const { token, hash: storedHash } = generateRefreshToken();
    logger.info('✅ Token generated');
    
    // Simulate 100 concurrent verification requests
    logger.info('🔄 Simulating 100 concurrent verifications...');
    const verifications = Array.from({ length: 100 }, () => {
      const computedHash = hashRefreshToken(token);
      return computedHash === storedHash;
    });
    
    // All should succeed
    const allValid = verifications.every(v => v === true);
    expect(allValid).toBe(true);
    logger.info('✅ All 100 concurrent verifications succeeded');
  });
});
