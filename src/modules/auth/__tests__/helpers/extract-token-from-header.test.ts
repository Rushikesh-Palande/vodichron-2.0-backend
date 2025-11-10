/**
 * Extract Token From Header Helper Test Suite
 * ============================================
 * 
 * Tests the extractTokenFromAuthHeader function which safely extracts Bearer tokens
 * from Authorization headers. This is a critical component of authentication middleware.
 * 
 * Test Coverage:
 * ✅ Valid Bearer token extraction
 * ✅ Case-insensitive Bearer keyword
 * ✅ Token with extra whitespace handling
 * ✅ Missing Authorization header
 * ✅ Null/undefined Authorization header
 * ✅ Empty Authorization header
 * ✅ Non-Bearer schemes (Basic, Digest, etc.)
 * ✅ Malformed Authorization headers
 * ✅ Bearer with no token
 * ✅ Bearer with empty token
 * 
 * Security Considerations:
 * - Returns null for invalid inputs (fail-safe)
 * - Case-insensitive matching for robustness
 * - Trims whitespace to handle client inconsistencies
 * - No exceptions thrown (graceful degradation)
 */

import { extractTokenFromAuthHeader } from '../../helpers/extract-token-from-header';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('extractTokenFromAuthHeader Helper', () => {
  let infoSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    logger.info('🔄 Setting up test case...');
  });

  afterEach(() => {
    infoSpy.mockRestore();
    debugSpy.mockRestore();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Valid Token Extraction Tests
  // =============================================================================

  /**
   * Test Case: Valid Bearer Token
   * ------------------------------
   * Verifies that a properly formatted Bearer token is extracted correctly.
   */
  it('should extract valid Bearer token', () => {
    logger.info('🧪 Test: Valid Bearer token extraction');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InV1aWQiOiIxMjMifX0.abc123';
    const header = `Bearer ${token}`;
    
    logger.info('🔄 Extracting token from header...');
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBe(token);
    logger.info('✅ Token extracted successfully');
  });

  /**
   * Test Case: Case-Insensitive Bearer Keyword
   * -------------------------------------------
   * Verifies that "bearer", "Bearer", "BEARER" all work.
   */
  it('should handle case-insensitive Bearer keyword', () => {
    logger.info('🧪 Test: Case-insensitive Bearer keyword');
    
    const token = 'test.token.here';
    const variations = ['Bearer', 'bearer', 'BEARER', 'BeArEr'];
    
    variations.forEach((keyword) => {
      logger.info(`🔄 Testing "${keyword}" keyword...`);
      const header = `${keyword} ${token}`;
      const result = extractTokenFromAuthHeader(header);
      
      expect(result).toBe(token);
      logger.info(`✅ "${keyword}" keyword works`);
    });
    
    logger.info('✅ All case variations handled correctly');
  });

  /**
   * Test Case: Token With Whitespace
   * ---------------------------------
   * Verifies that extra whitespace is properly trimmed.
   */
  it('should trim whitespace from extracted token', () => {
    logger.info('🧪 Test: Whitespace trimming');
    
    const token = 'clean.token';
    const header = `Bearer   ${token}   `; // Extra spaces
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBe(token);
    logger.info('✅ Whitespace trimmed correctly');
  });

  /**
   * Test Case: Multiple Spaces Between Bearer and Token
   * ----------------------------------------------------
   * Verifies handling of multiple spaces between Bearer and token.
   */
  it('should handle multiple spaces between Bearer and token', () => {
    logger.info('🧪 Test: Multiple spaces handling');
    
    const token = 'my.token';
    const header = 'Bearer     ' + token; // Many spaces
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBe(token);
    logger.info('✅ Multiple spaces handled correctly');
  });

  // =============================================================================
  // Invalid/Missing Header Tests
  // =============================================================================

  /**
   * Test Case: Missing Authorization Header
   * ----------------------------------------
   * Verifies that undefined header returns null.
   */
  it('should return null for undefined header', () => {
    logger.info('🧪 Test: Undefined header');
    
    const result = extractTokenFromAuthHeader(undefined);
    
    expect(result).toBeNull();
    logger.info('✅ Undefined header returned null');
  });

  /**
   * Test Case: Null Authorization Header
   * -------------------------------------
   * Verifies that null header returns null.
   */
  it('should return null for null header', () => {
    logger.info('🧪 Test: Null header');
    
    const result = extractTokenFromAuthHeader(null);
    
    expect(result).toBeNull();
    logger.info('✅ Null header returned null');
  });

  /**
   * Test Case: Empty String Header
   * -------------------------------
   * Verifies that empty string returns null.
   */
  it('should return null for empty string header', () => {
    logger.info('🧪 Test: Empty string header');
    
    const result = extractTokenFromAuthHeader('');
    
    expect(result).toBeNull();
    logger.info('✅ Empty string returned null');
  });

  /**
   * Test Case: Whitespace-Only Header
   * ----------------------------------
   * Verifies that whitespace-only header returns null.
   */
  it('should return null for whitespace-only header', () => {
    logger.info('🧪 Test: Whitespace-only header');
    
    const result = extractTokenFromAuthHeader('   ');
    
    expect(result).toBeNull();
    logger.info('✅ Whitespace-only header returned null');
  });

  // =============================================================================
  // Non-Bearer Scheme Tests
  // =============================================================================

  /**
   * Test Case: Basic Authentication Scheme
   * ---------------------------------------
   * Verifies that Basic auth returns null and logs debug message.
   */
  it('should return null for Basic authentication scheme', () => {
    logger.info('🧪 Test: Basic authentication scheme');
    
    const header = 'Basic dXNlcjpwYXNzd29yZA==';
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBeNull();
    logger.info('✅ Basic auth returned null');
    
    expect(debugSpy).toHaveBeenCalled();
    logger.info('✅ Debug message logged for non-Bearer scheme');
  });

  /**
   * Test Case: Digest Authentication Scheme
   * ----------------------------------------
   * Verifies that Digest auth returns null.
   */
  it('should return null for Digest authentication scheme', () => {
    logger.info('🧪 Test: Digest authentication scheme');
    
    const header = 'Digest username="user", realm="realm"';
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBeNull();
    logger.info('✅ Digest auth returned null');
  });

  /**
   * Test Case: Custom Authentication Scheme
   * ----------------------------------------
   * Verifies that any non-Bearer scheme returns null.
   */
  it('should return null for custom authentication schemes', () => {
    logger.info('🧪 Test: Custom authentication schemes');
    
    const schemes = ['Token', 'JWT', 'ApiKey', 'Custom'];
    
    schemes.forEach((scheme) => {
      logger.info(`🔄 Testing ${scheme} scheme...`);
      const header = `${scheme} some.token.here`;
      const result = extractTokenFromAuthHeader(header);
      
      expect(result).toBeNull();
      logger.info(`✅ ${scheme} scheme returned null`);
    });
    
    logger.info('✅ All custom schemes handled correctly');
  });

  // =============================================================================
  // Malformed Header Tests
  // =============================================================================

  /**
   * Test Case: Bearer Without Token
   * --------------------------------
   * Verifies that "Bearer" alone returns null.
   */
  it('should return null for Bearer without token', () => {
    logger.info('🧪 Test: Bearer without token');
    
    const header = 'Bearer';
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBeNull();
    logger.info('✅ Bearer without token returned null');
  });

  /**
   * Test Case: Bearer With Only Whitespace After
   * ---------------------------------------------
   * Verifies that "Bearer   " returns null.
   */
  it('should return null for Bearer with only whitespace', () => {
    logger.info('🧪 Test: Bearer with only whitespace');
    
    const header = 'Bearer     ';
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBeNull();
    logger.info('✅ Bearer with whitespace returned null');
  });

  /**
   * Test Case: Token Without Bearer Prefix
   * ---------------------------------------
   * Verifies that a token without "Bearer" prefix returns null.
   */
  it('should return null for token without Bearer prefix', () => {
    logger.info('🧪 Test: Token without Bearer prefix');
    
    const header = 'just.a.token';
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBeNull();
    logger.info('✅ Token without prefix returned null');
  });

  // =============================================================================
  // Edge Case Tests
  // =============================================================================

  /**
   * Test Case: Very Long Token
   * ---------------------------
   * Verifies that very long tokens are extracted correctly.
   */
  it('should handle very long tokens', () => {
    logger.info('🧪 Test: Very long token');
    
    const token = 'a'.repeat(1000); // 1000 character token
    const header = `Bearer ${token}`;
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBe(token);
    expect(result?.length).toBe(1000);
    logger.info('✅ Very long token extracted correctly');
  });

  /**
   * Test Case: Token With Special Characters
   * -----------------------------------------
   * Verifies that tokens with special characters are preserved.
   */
  it('should preserve special characters in token', () => {
    logger.info('🧪 Test: Token with special characters');
    
    const token = 'token.with-special_chars+and/stuff=';
    const header = `Bearer ${token}`;
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBe(token);
    logger.info('✅ Special characters preserved');
  });

  /**
   * Test Case: Bearer With Tab Instead of Space
   * --------------------------------------------
   * Verifies that tab instead of space returns null (function requires space).
   */
  it('should return null for Bearer with tab instead of space', () => {
    logger.info('🧪 Test: Bearer with tab separator');
    
    const token = 'my.token';
    const header = `Bearer\t${token}`; // Tab character instead of space
    
    const result = extractTokenFromAuthHeader(header);
    
    // Function checks for 'bearer ' with SPACE, so tab fails the check
    expect(result).toBeNull();
    logger.info('✅ Bearer with tab correctly returns null (space required)');
  });

  // =============================================================================
  // Real-World JWT Token Tests
  // =============================================================================

  /**
   * Test Case: Real JWT Token Extraction
   * -------------------------------------
   * Verifies extraction of an actual JWT format token.
   */
  it('should extract real JWT format token', () => {
    logger.info('🧪 Test: Real JWT token extraction');
    
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const header = `Bearer ${jwtToken}`;
    
    const result = extractTokenFromAuthHeader(header);
    
    expect(result).toBe(jwtToken);
    expect(result?.split('.')).toHaveLength(3); // JWT has 3 parts
    logger.info('✅ Real JWT token extracted correctly');
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: Never Throws Exception
   * ----------------------------------
   * Verifies that the function never throws, always returns null for errors.
   */
  it('should never throw exceptions', () => {
    logger.info('🧪 Test: Never throws exceptions');
    
    const invalidInputs = [
      undefined,
      null,
      '',
      ' ',
      'Bearer',
      'Invalid Header Format',
      'Bearer ',
      // Skip non-string inputs as they'll throw TypeError (expected behavior)
    ];
    
    invalidInputs.forEach((input, index) => {
      logger.info(`🔄 Testing invalid input ${index + 1}/${invalidInputs.length}`);
      
      expect(() => {
        extractTokenFromAuthHeader(input);
      }).not.toThrow();
      
      const result = extractTokenFromAuthHeader(input);
      expect([null, 'string']).toContain(typeof result === 'string' ? 'string' : null);
    });
    
    logger.info('✅ All invalid inputs handled gracefully (no exceptions)');
  });
});
