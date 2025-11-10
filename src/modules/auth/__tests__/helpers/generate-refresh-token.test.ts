/**
 * Generate Refresh Token Helper Test Suite
 * ==========================================
 * 
 * Tests the generateRefreshToken function which creates cryptographically secure
 * refresh tokens and their SHA-256 hashes for secure storage.
 * 
 * Test Coverage:
 * ✅ Token and hash generation
 * ✅ Token format validation (96 hex characters)
 * ✅ Hash format validation (64 hex characters)
 * ✅ Token uniqueness (each generation is unique)
 * ✅ Hash consistency (same token → same hash)
 * ✅ Token/hash relationship verification
 * ✅ Cryptographic randomness validation
 * ✅ Performance testing
 * 
 * Security Considerations:
 * - Tokens use crypto.randomBytes (cryptographically secure)
 * - 48 bytes = 96 hex characters (sufficient entropy)
 * - Hash is SHA-256 for secure storage
 * - Raw token sent to client, only hash stored in DB
 * - Each token is unique and unpredictable
 */

import { generateRefreshToken } from '../../helpers/generate-refresh-token';
import { sha256 } from '../../helpers/hash-token';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('generateRefreshToken Helper', () => {
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
  // Basic Generation Tests
  // =============================================================================

  /**
   * Test Case: Basic Token and Hash Generation
   * -------------------------------------------
   * Verifies that both token and hash are generated.
   */
  it('should generate token and hash pair', () => {
    logger.info('🧪 Test: Basic token and hash generation');
    
    const result = generateRefreshToken();
    
    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.hash).toBeDefined();
    logger.info('✅ Token and hash generated');
    logger.info(`  Token: ${result.token.substring(0, 20)}...`);
    logger.info(`  Hash: ${result.hash.substring(0, 20)}...`);
  });

  /**
   * Test Case: Token Format Validation
   * -----------------------------------
   * Verifies that token is 96 hex characters (48 bytes).
   */
  it('should generate 96-character hexadecimal token', () => {
    logger.info('🧪 Test: Token format validation');
    
    const { token } = generateRefreshToken();
    
    // crypto.randomBytes(48).toString('hex') = 96 hex chars
    expect(token.length).toBe(96);
    logger.info('✅ Token length is 96 characters');
    
    expect(token).toMatch(/^[0-9a-f]{96}$/);
    logger.info('✅ Token is valid hexadecimal');
  });

  /**
   * Test Case: Hash Format Validation
   * ----------------------------------
   * Verifies that hash is 64 hex characters (SHA-256).
   */
  it('should generate 64-character hexadecimal hash', () => {
    logger.info('🧪 Test: Hash format validation');
    
    const { hash } = generateRefreshToken();
    
    // SHA-256 hash = 64 hex chars
    expect(hash.length).toBe(64);
    logger.info('✅ Hash length is 64 characters');
    
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    logger.info('✅ Hash is valid hexadecimal');
  });

  // =============================================================================
  // Token/Hash Relationship Tests
  // =============================================================================

  /**
   * Test Case: Hash Matches Token
   * ------------------------------
   * Verifies that hash is correct SHA-256 of token.
   */
  it('should generate hash that matches token', () => {
    logger.info('🧪 Test: Hash matches token');
    
    const { token, hash } = generateRefreshToken();
    
    // Manually hash the token and verify it matches
    const expectedHash = sha256(token);
    
    expect(hash).toBe(expectedHash);
    logger.info('✅ Hash correctly matches token (SHA-256 verified)');
  });

  /**
   * Test Case: Hash Can Verify Token
   * ---------------------------------
   * Verifies that token can be verified using stored hash.
   */
  it('should allow token verification using stored hash', () => {
    logger.info('🧪 Test: Token verification via hash');
    
    const { token, hash } = generateRefreshToken();
    logger.info('✅ Generated token and hash');
    
    // Simulate verification: hash incoming token and compare
    logger.info('🔄 Simulating token verification...');
    const incomingTokenHash = sha256(token);
    const isValid = incomingTokenHash === hash;
    
    expect(isValid).toBe(true);
    logger.info('✅ Token verified successfully using stored hash');
  });

  // =============================================================================
  // Uniqueness Tests
  // =============================================================================

  /**
   * Test Case: Token Uniqueness
   * ----------------------------
   * Verifies that each call generates a unique token.
   */
  it('should generate unique tokens on each call', () => {
    logger.info('🧪 Test: Token uniqueness');
    
    const tokens = new Set<string>();
    const count = 100;
    
    logger.info(`🔄 Generating ${count} refresh tokens...`);
    for (let i = 0; i < count; i++) {
      const { token } = generateRefreshToken();
      tokens.add(token);
    }
    
    expect(tokens.size).toBe(count);
    logger.info(`✅ All ${count} tokens are unique`);
  });

  /**
   * Test Case: Hash Uniqueness
   * ---------------------------
   * Verifies that each generated hash is unique.
   */
  it('should generate unique hashes on each call', () => {
    logger.info('🧪 Test: Hash uniqueness');
    
    const hashes = new Set<string>();
    const count = 100;
    
    logger.info(`🔄 Generating ${count} hashes...`);
    for (let i = 0; i < count; i++) {
      const { hash } = generateRefreshToken();
      hashes.add(hash);
    }
    
    expect(hashes.size).toBe(count);
    logger.info(`✅ All ${count} hashes are unique`);
  });

  /**
   * Test Case: No Predictable Patterns
   * -----------------------------------
   * Verifies that tokens don't follow predictable patterns.
   */
  it('should not produce predictable token patterns', () => {
    logger.info('🧪 Test: No predictable patterns');
    
    const result1 = generateRefreshToken();
    const result2 = generateRefreshToken();
    
    // Tokens should be completely different
    expect(result1.token).not.toBe(result2.token);
    expect(result1.hash).not.toBe(result2.hash);
    
    // Calculate similarity
    let matchCount = 0;
    for (let i = 0; i < result1.token.length; i++) {
      if (result1.token[i] === result2.token[i]) matchCount++;
    }
    const similarity = matchCount / result1.token.length;
    
    // Low similarity expected for random tokens (< 20%)
    expect(similarity).toBeLessThan(0.2);
    logger.info(`✅ Tokens have ${(similarity * 100).toFixed(1)}% similarity (highly random)`);
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: Cryptographic Randomness
   * ------------------------------------
   * Verifies sufficient entropy in generated tokens.
   */
  it('should have sufficient entropy for security', () => {
    logger.info('🧪 Test: Cryptographic entropy');
    
    const tokens: string[] = [];
    for (let i = 0; i < 50; i++) {
      const { token } = generateRefreshToken();
      tokens.push(token);
    }
    
    // Check character distribution
    const charCounts = new Map<string, number>();
    const allChars = tokens.join('');
    
    for (const char of allChars) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    // Should use all hex digits (0-9, a-f = 16 chars)
    expect(charCounts.size).toBe(16);
    logger.info('✅ All 16 hex characters present (good distribution)');
  });

  /**
   * Test Case: Token Cannot Be Derived From Hash
   * ---------------------------------------------
   * Verifies that hash doesn't reveal token (one-way function).
   */
  it('should not allow deriving token from hash', () => {
    logger.info('🧪 Test: One-way hash security');
    
    const { token, hash } = generateRefreshToken();
    
    // Hash should not contain any part of token
    expect(hash).not.toContain(token.substring(0, 10));
    expect(hash).not.toContain(token.substring(token.length - 10));
    logger.info('✅ Hash does not reveal token');
  });

  // =============================================================================
  // Real-World Usage Tests
  // =============================================================================

  /**
   * Test Case: Typical Refresh Token Flow
   * --------------------------------------
   * Simulates the complete refresh token lifecycle.
   */
  it('should support complete refresh token lifecycle', () => {
    logger.info('🧪 Test: Complete token lifecycle');
    
    // Step 1: Generate token
    logger.info('🔄 Step 1: Generating refresh token...');
    const { token, hash } = generateRefreshToken();
    expect(token).toBeDefined();
    expect(hash).toBeDefined();
    logger.info('✅ Step 1: Token generated');
    
    // Step 2: Store hash in database (simulated)
    logger.info('🔄 Step 2: Storing hash in database...');
    const storedHash = hash;
    logger.info('✅ Step 2: Hash stored (simulated)');
    
    // Step 3: Client sends token back (simulated)
    logger.info('🔄 Step 3: Client sends token for verification...');
    const clientToken = token;
    logger.info('✅ Step 3: Token received from client');
    
    // Step 4: Verify token by hashing and comparing
    logger.info('🔄 Step 4: Verifying token...');
    const computedHash = sha256(clientToken);
    const isValid = computedHash === storedHash;
    expect(isValid).toBe(true);
    logger.info('✅ Step 4: Token verified successfully');
    
    logger.info('✅ Complete lifecycle validated');
  });

  /**
   * Test Case: Wrong Token Fails Verification
   * ------------------------------------------
   * Verifies that wrong token doesn't match stored hash.
   */
  it('should fail verification for wrong token', () => {
    logger.info('🧪 Test: Wrong token verification failure');
    
    const { hash: storedHash } = generateRefreshToken();
    const { token: wrongToken } = generateRefreshToken();
    
    logger.info('🔄 Attempting to verify wrong token...');
    const computedHash = sha256(wrongToken);
    const isValid = computedHash === storedHash;
    
    expect(isValid).toBe(false);
    logger.info('✅ Wrong token correctly fails verification');
  });

  // =============================================================================
  // Performance Tests
  // =============================================================================

  /**
   * Test Case: Performance Validation
   * ----------------------------------
   * Verifies that generation is fast enough for production.
   */
  it('should generate tokens quickly', () => {
    logger.info('🧪 Test: Generation performance');
    
    const iterations = 1000;
    logger.info(`🔄 Generating ${iterations} refresh tokens...`);
    
    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
      generateRefreshToken();
    }
    const duration = Date.now() - start;
    const avgTime = duration / iterations;
    
    logger.info(`✅ ${iterations} tokens in ${duration}ms`);
    logger.info(`✅ Average: ${avgTime.toFixed(3)}ms per token`);
    
    // Should be very fast (< 1ms per token)
    expect(avgTime).toBeLessThan(1);
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  /**
   * Test Case: Multiple Tokens Per User
   * ------------------------------------
   * Verifies that multiple tokens can be issued per user.
   */
  it('should support multiple tokens per user', () => {
    logger.info('🧪 Test: Multiple tokens per user');
    
    const userTokens: Array<{ token: string; hash: string }> = [];
    
    // Generate 5 tokens for same user (e.g., different devices)
    logger.info('🔄 Generating 5 tokens for same user...');
    for (let i = 0; i < 5; i++) {
      userTokens.push(generateRefreshToken());
    }
    
    // All tokens should be unique
    const uniqueTokens = new Set(userTokens.map(t => t.token));
    const uniqueHashes = new Set(userTokens.map(t => t.hash));
    
    expect(uniqueTokens.size).toBe(5);
    expect(uniqueHashes.size).toBe(5);
    logger.info('✅ All 5 tokens are unique (multi-device support)');
  });

  /**
   * Test Case: Token Rotation
   * --------------------------
   * Simulates token rotation (old token → new token).
   */
  it('should support token rotation', () => {
    logger.info('🧪 Test: Token rotation');
    
    // Generate initial token
    logger.info('🔄 Generating initial token...');
    const oldToken = generateRefreshToken();
    logger.info('✅ Initial token generated');
    
    // Rotate to new token
    logger.info('🔄 Rotating to new token...');
    const newToken = generateRefreshToken();
    logger.info('✅ New token generated');
    
    // Tokens should be different
    expect(oldToken.token).not.toBe(newToken.token);
    expect(oldToken.hash).not.toBe(newToken.hash);
    logger.info('✅ Token rotation successful (old and new are different)');
  });
});
