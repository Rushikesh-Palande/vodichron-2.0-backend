/**
 * Verify Token Helper Test Suite
 * ================================
 * 
 * Tests the verifyToken function which validates JWT access tokens and extracts user payload.
 * This is a critical security component used in authentication middleware.
 * 
 * Test Coverage:
 * ✅ Valid token verification
 * ✅ Invalid token handling
 * ✅ Expired token handling
 * ✅ Malformed token handling
 * ✅ Token with invalid signature
 * ✅ Token with wrong secret
 * ✅ Null/undefined token handling
 * ✅ Empty string token
 * ✅ Token payload extraction
 * ✅ Warning logging for invalid tokens
 * 
 * Security Considerations:
 * - Verifies tokens fail gracefully (return null, no exceptions)
 * - Tests signature validation
 * - Validates expiration checks
 * - Ensures no sensitive data leaks in logs
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\helpers\verify-token.test.ts
 */

import { verifyToken } from '../../helpers/verify-token';
import { generateToken, type JwtUserPayload } from '../../helpers/generate-token';
import { logger } from '../../../../utils/logger';
import jwt from 'jsonwebtoken';
import { config } from '../../../../config';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('verifyToken Helper', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Spies
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    
    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
    
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Valid Token Tests
  // =============================================================================

  /**
   * Test Case: Valid Token Verification
   * ------------------------------------
   * Verifies that a valid token is successfully verified and the
   * correct user payload is extracted.
   */
  it('should successfully verify a valid token and return user payload', () => {
    logger.info('🧪 Test: Valid token verification');
    
    // Generate a valid token
    const payload: JwtUserPayload = {
      uuid: 'user-123',
      role: 'employee',
      email: 'test@example.com',
      type: 'employee',
    };
    
    logger.info('🔄 Generating valid token...');
    const token = generateToken(payload);
    
    logger.info('🔄 Verifying token...');
    const result = verifyToken(token);
    
    // Should return the user payload
    expect(result).not.toBeNull();
    expect(result?.uuid).toBe(payload.uuid);
    expect(result?.role).toBe(payload.role);
    expect(result?.email).toBe(payload.email);
    expect(result?.type).toBe(payload.type);
    logger.info('✅ Token verified with correct payload');
    
    // Should log debug message
    expect(debugSpy).toHaveBeenCalled();
    expect(wasLogged(debugSpy, 'Access token verified')).toBe(true);
    logger.info('✅ Debug logging verified');
  });

  /**
   * Test Case: Token Without Optional Email
   * ----------------------------------------
   * Verifies that tokens without the optional email field are verified correctly.
   */
  it('should verify token without optional email field', () => {
    logger.info('🧪 Test: Token without email verification');
    
    const payload: JwtUserPayload = {
      uuid: 'user-456',
      role: 'manager',
      type: 'employee',
      // No email
    };
    
    const token = generateToken(payload);
    const result = verifyToken(token);
    
    expect(result).not.toBeNull();
    expect(result?.uuid).toBe(payload.uuid);
    expect(result?.email).toBeUndefined();
    logger.info('✅ Token without email verified correctly');
  });

  // =============================================================================
  // Expired Token Tests
  // =============================================================================

  /**
   * Test Case: Expired Token Returns Null
   * --------------------------------------
   * Verifies that an expired token returns null instead of throwing an error.
   */
  it('should return null for expired token', async () => {
    logger.info('🧪 Test: Expired token handling');
    
    const payload: JwtUserPayload = {
      uuid: 'expired-user',
      role: 'employee',
      type: 'employee',
    };
    
    // Generate token with 1ms expiry
    logger.info('🔄 Generating token with 1ms expiry...');
    const token = generateToken(payload, '1ms');
    
    // Wait 100ms to ensure expiration
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    logger.info('🔄 Attempting to verify expired token...');
    const result = verifyToken(token);
    
    // Should return null
    expect(result).toBeNull();
    logger.info('✅ Expired token returned null (fail-safe)');
    
    // Should log warning
    expect(warnSpy).toHaveBeenCalled();
    expect(wasLogged(warnSpy, 'Invalid or expired access token')).toBe(true);
    logger.info('✅ Warning logged for expired token');
  });

  // =============================================================================
  // Invalid Token Tests
  // =============================================================================

  /**
   * Test Case: Malformed Token
   * ---------------------------
   * Verifies that a malformed token (not proper JWT format) returns null.
   */
  it('should return null for malformed token', () => {
    logger.info('🧪 Test: Malformed token handling');
    
    const malformedToken = 'not.a.valid.jwt.token';
    
    logger.info('🔄 Verifying malformed token...');
    const result = verifyToken(malformedToken);
    
    expect(result).toBeNull();
    logger.info('✅ Malformed token returned null');
    
    expect(warnSpy).toHaveBeenCalled();
    logger.info('✅ Warning logged for malformed token');
  });

  /**
   * Test Case: Token With Invalid Signature
   * ----------------------------------------
   * Verifies that a token with an invalid signature is rejected.
   */
  it('should return null for token with invalid signature', () => {
    logger.info('🧪 Test: Invalid signature handling');
    
    const payload: JwtUserPayload = {
      uuid: 'user-789',
      role: 'employee',
      type: 'employee',
    };
    
    // Generate token with wrong secret
    logger.info('🔄 Generating token with wrong secret...');
    const wrongSecret = 'wrong-secret-key';
    const token = jwt.sign({ user: payload }, wrongSecret);
    
    logger.info('🔄 Attempting to verify token with wrong secret...');
    const result = verifyToken(token);
    
    expect(result).toBeNull();
    logger.info('✅ Token with invalid signature rejected');
    
    expect(warnSpy).toHaveBeenCalled();
    logger.info('✅ Warning logged for invalid signature');
  });

  /**
   * Test Case: Token Missing Required Parts
   * ----------------------------------------
   * Verifies that a token with missing parts returns null.
   */
  it('should return null for token with missing parts', () => {
    logger.info('🧪 Test: Token with missing parts');
    
    const incompleteToken = 'header.payload'; // Missing signature
    
    const result = verifyToken(incompleteToken);
    
    expect(result).toBeNull();
    logger.info('✅ Incomplete token returned null');
  });

  /**
   * Test Case: Token With Tampered Payload
   * ---------------------------------------
   * Verifies that a token with tampered payload fails verification.
   */
  it('should return null for token with tampered payload', () => {
    logger.info('🧪 Test: Tampered payload handling');
    
    const payload: JwtUserPayload = {
      uuid: 'user-original',
      role: 'employee',
      type: 'employee',
    };
    
    const token = generateToken(payload);
    
    // Tamper with the payload part (middle section)
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({
      user: { uuid: 'user-hacker', role: 'super_user', type: 'employee' }
    })).toString('base64url');
    
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    
    logger.info('🔄 Verifying tampered token...');
    const result = verifyToken(tamperedToken);
    
    expect(result).toBeNull();
    logger.info('✅ Tampered token rejected (signature mismatch)');
  });

  // =============================================================================
  // Edge Case Tests
  // =============================================================================

  /**
   * Test Case: Empty String Token
   * ------------------------------
   * Verifies that an empty string returns null.
   */
  it('should return null for empty string token', () => {
    logger.info('🧪 Test: Empty string token');
    
    const result = verifyToken('');
    
    expect(result).toBeNull();
    logger.info('✅ Empty string returned null');
    
    expect(warnSpy).toHaveBeenCalled();
    logger.info('✅ Warning logged for empty token');
  });

  /**
   * Test Case: Whitespace-Only Token
   * ---------------------------------
   * Verifies that a whitespace-only token returns null.
   */
  it('should return null for whitespace-only token', () => {
    logger.info('🧪 Test: Whitespace-only token');
    
    const result = verifyToken('   ');
    
    expect(result).toBeNull();
    logger.info('✅ Whitespace token returned null');
  });

  /**
   * Test Case: Token With Extra Characters
   * ---------------------------------------
   * Verifies that a token with extra invalid characters is rejected.
   */
  it('should return null for token with extra characters', () => {
    logger.info('🧪 Test: Token with extra characters');
    
    const payload: JwtUserPayload = {
      uuid: 'user-test',
      role: 'employee',
      type: 'employee',
    };
    
    const validToken = generateToken(payload);
    const invalidToken = validToken + 'EXTRA_CHARS';
    
    const result = verifyToken(invalidToken);
    
    expect(result).toBeNull();
    logger.info('✅ Token with extra characters rejected');
  });

  // =============================================================================
  // Different User Types Tests
  // =============================================================================

  /**
   * Test Case: Employee Token Verification
   * ---------------------------------------
   * Verifies that employee tokens are verified correctly.
   */
  it('should verify employee token correctly', () => {
    logger.info('🧪 Test: Employee token verification');
    
    const payload: JwtUserPayload = {
      uuid: 'emp-001',
      role: 'employee',
      email: 'employee@company.com',
      type: 'employee',
    };
    
    const token = generateToken(payload);
    const result = verifyToken(token);
    
    expect(result).not.toBeNull();
    expect(result?.type).toBe('employee');
    logger.info('✅ Employee token verified');
  });

  /**
   * Test Case: Customer Token Verification
   * ---------------------------------------
   * Verifies that customer tokens are verified correctly.
   */
  it('should verify customer token correctly', () => {
    logger.info('🧪 Test: Customer token verification');
    
    const payload: JwtUserPayload = {
      uuid: 'cust-001',
      role: 'customer',
      email: 'customer@example.com',
      type: 'customer',
    };
    
    const token = generateToken(payload);
    const result = verifyToken(token);
    
    expect(result).not.toBeNull();
    expect(result?.type).toBe('customer');
    logger.info('✅ Customer token verified');
  });

  // =============================================================================
  // Different Roles Tests
  // =============================================================================

  /**
   * Test Case: Different Roles Verification
   * ----------------------------------------
   * Verifies that tokens with different roles are verified correctly.
   */
  it('should verify tokens with different roles', () => {
    logger.info('🧪 Test: Different roles verification');
    
    const roles = ['super_user', 'hr', 'employee', 'manager', 'director'];
    
    roles.forEach((role) => {
      logger.info(`🔄 Testing role: ${role}`);
      
      const payload: JwtUserPayload = {
        uuid: `user-${role}`,
        role: role,
        type: 'employee',
      };
      
      const token = generateToken(payload);
      const result = verifyToken(token);
      
      expect(result).not.toBeNull();
      expect(result?.role).toBe(role);
      logger.info(`✅ Token with role ${role} verified`);
    });
    
    logger.info('✅ All roles verified successfully');
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: No Token Details Leaked in Logs
   * -------------------------------------------
   * Verifies that token strings are never logged in plaintext.
   */
  it('should not leak token string in logs', () => {
    logger.info('🧪 Test: Token not logged in plaintext');
    
    const payload: JwtUserPayload = {
      uuid: 'security-test',
      role: 'employee',
      type: 'employee',
    };
    
    const token = generateToken(payload);
    verifyToken(token);
    
    // Check that token string doesn't appear in any logs
    const allCalls = [
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...debugSpy.mock.calls,
    ];
    
    const tokenLogged = allCalls.some((call) =>
      call.some((arg: any) => typeof arg === 'string' && arg.includes(token))
    );
    
    expect(tokenLogged).toBe(false);
    logger.info('✅ Token not leaked in logs');
  });

  /**
   * Test Case: Error Messages Don't Expose Secrets
   * -----------------------------------------------
   * Verifies that error messages don't expose the secret key.
   */
  it('should not expose secret in error messages', () => {
    logger.info('🧪 Test: Secret not exposed in errors');
    
    const invalidToken = 'invalid.token.here';
    verifyToken(invalidToken);
    
    const secret = config.security.sessionSecret as string;
    const allCalls = [
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...debugSpy.mock.calls,
    ];
    
    const secretLogged = allCalls.some((call) =>
      call.some((arg: any) => {
        if (typeof arg === 'string') {
          return arg.includes(secret);
        }
        return false;
      })
    );
    
    expect(secretLogged).toBe(false);
    logger.info('✅ Secret not exposed in logs');
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  /**
   * Test Case: Generate and Verify Token Flow
   * ------------------------------------------
   * Integration test verifying the complete generate → verify flow.
   */
  it('should complete full generate and verify flow', () => {
    logger.info('🧪 Test: Full generate and verify flow');
    
    const payload: JwtUserPayload = {
      uuid: 'flow-test-user',
      role: 'hr',
      email: 'hr@test.com',
      type: 'employee',
    };
    
    logger.info('🔄 Step 1: Generating token...');
    const token = generateToken(payload);
    expect(token).toBeDefined();
    logger.info('✅ Step 1: Token generated');
    
    logger.info('🔄 Step 2: Verifying token...');
    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    logger.info('✅ Step 2: Token verified');
    
    logger.info('🔄 Step 3: Validating payload...');
    expect(verified?.uuid).toBe(payload.uuid);
    expect(verified?.role).toBe(payload.role);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.type).toBe(payload.type);
    logger.info('✅ Step 3: Payload validated');
    
    logger.info('✅ Full flow completed successfully');
  });

  /**
   * Test Case: Multiple Tokens Verification
   * ----------------------------------------
   * Verifies that multiple tokens can be verified independently.
   */
  it('should verify multiple tokens independently', () => {
    logger.info('🧪 Test: Multiple tokens verification');
    
    const tokens: string[] = [];
    const payloads: JwtUserPayload[] = [];
    
    // Generate multiple tokens
    for (let i = 0; i < 5; i++) {
      const payload: JwtUserPayload = {
        uuid: `user-${i}`,
        role: 'employee',
        type: 'employee',
      };
      
      payloads.push(payload);
      tokens.push(generateToken(payload));
    }
    
    logger.info('✅ Generated 5 tokens');
    
    // Verify all tokens
    tokens.forEach((token, index) => {
      const result = verifyToken(token);
      expect(result).not.toBeNull();
      expect(result?.uuid).toBe(payloads[index].uuid);
    });
    
    logger.info('✅ All 5 tokens verified independently');
  });

  // =============================================================================
  // Fail-Safe Behavior Tests
  // =============================================================================

  /**
   * Test Case: Never Throws Exception
   * ----------------------------------
   * Verifies that verifyToken never throws exceptions, always returns null for errors.
   */
  it('should never throw exceptions for any invalid input', () => {
    logger.info('🧪 Test: Never throws exceptions');
    
    const invalidInputs = [
      '',
      ' ',
      'invalid',
      'a.b.c',
      null as any,
      undefined as any,
      123 as any,
      {} as any,
      [] as any,
    ];
    
    invalidInputs.forEach((input, index) => {
      logger.info(`🔄 Testing invalid input ${index + 1}/${invalidInputs.length}`);
      
      expect(() => {
        verifyToken(input);
      }).not.toThrow();
      
      const result = verifyToken(input);
      expect(result).toBeNull();
    });
    
    logger.info('✅ All invalid inputs handled gracefully (no exceptions)');
  });
});
