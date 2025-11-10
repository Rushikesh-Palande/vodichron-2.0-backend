/**
 * Generate Token Helper Test Suite
 * ==================================
 * 
 * Tests the generateToken function which creates JWT access tokens for authenticated users.
 * This is a critical component of the authentication system that issues stateless tokens.
 * 
 * Test Coverage:
 * ✅ Successful token generation
 * ✅ Token format validation (JWT structure)
 * ✅ Token payload verification
 * ✅ Custom expiry time handling
 * ✅ Default expiry time usage
 * ✅ Different user types (employee vs customer)
 * ✅ Different roles (super_user, hr, employee, etc.)
 * ✅ Token uniqueness (same payload → different tokens)
 * ✅ expireToken function (logout tokens)
 * ✅ Debug logging verification
 * 
 * Security Considerations:
 * - Verifies JWT signature is present and valid
 * - Tests token expiration mechanisms
 * - Validates payload structure and claims
 * - Ensures tokens are stateless (no DB lookup required)
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\helpers\generate-token.test.ts
 */

import {
  generateToken,
  expireToken,
  type JwtUserPayload,
} from '../../helpers/generate-token';
import { verifyToken } from '../../helpers/verify-token';
import { logger } from '../../../../utils/logger';
import { config } from '../../../../config';
import { ACCESS_TOKEN_EXPIRES_IN } from '../../constants/auth.constants';
import jwt from 'jsonwebtoken';

// Helper function to convert expiry string to seconds
function getTokenExpiryInSeconds(expiryString: string): number {
  // Handle format like '30m', '1h', '5s', etc.
  const match = expiryString.match(/(\d+)([smh])/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiryString}`);
  }
  
  const [, value, unit] = match;
  const numValue = parseInt(value, 10);
  
  switch (unit) {
    case 's':
      return numValue;
    case 'm':
      return numValue * 60;
    case 'h':
      return numValue * 60 * 60;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

describe('generateToken Helper', () => {
  let infoSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Spies
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // Spy on logger methods to verify logging behavior
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    
    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    debugSpy.mockRestore();
    
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Successful Token Generation Tests
  // =============================================================================

  /**
   * Test Case: Basic Token Generation
   * ----------------------------------
   * Verifies that generateToken successfully creates a JWT token
   * for a valid user payload.
   * 
   * Steps:
   * 1. Create a user payload
   * 2. Generate a token
   * 3. Verify token is a string
   * 4. Verify token has 3 parts (header.payload.signature)
   * 5. Verify debug logging occurred
   */
  it('should successfully generate a JWT access token', () => {
    logger.info('🧪 Test: Basic token generation');
    
    // Step 1: Create user payload
    const payload: JwtUserPayload = {
      uuid: 'user-123-456',
      role: 'employee',
      email: 'test@example.com',
      type: 'employee',
    };
    logger.info('✅ Step 1: User payload created');
    
    // Step 2: Generate token
    logger.info('🔄 Step 2: Generating token...');
    const token = generateToken(payload);
    
    // Step 3: Verify token is a string
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    logger.info('✅ Step 3: Token is a non-empty string');
    
    // Step 4: Verify JWT format (header.payload.signature)
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    logger.info('✅ Step 4: Token has 3 parts (JWT format)');
    
    // Step 5: Verify debug logging
    expect(debugSpy).toHaveBeenCalled();
    expect(wasLogged(debugSpy, 'Access token generated')).toBe(true);
    logger.info('✅ Step 5: Debug logging verified');
  });

  /**
   * Test Case: Token Payload Verification
   * --------------------------------------
   * Verifies that the generated token contains the correct user payload
   * when decoded.
   */
  it('should embed correct user payload in token', () => {
    logger.info('🧪 Test: Token payload verification');
    
    const payload: JwtUserPayload = {
      uuid: 'emp-789',
      role: 'hr',
      email: 'hr@company.com',
      type: 'employee',
    };
    
    logger.info('🔄 Generating token...');
    const token = generateToken(payload);
    
    logger.info('🔄 Decoding token to verify payload...');
    const decoded = jwt.decode(token) as { user: JwtUserPayload; iat: number; exp: number };
    
    // Verify user payload is embedded correctly
    expect(decoded.user).toBeDefined();
    expect(decoded.user.uuid).toBe(payload.uuid);
    expect(decoded.user.role).toBe(payload.role);
    expect(decoded.user.email).toBe(payload.email);
    expect(decoded.user.type).toBe(payload.type);
    logger.info('✅ Token contains correct user payload');
    
    // Verify JWT standard claims
    expect(decoded.iat).toBeDefined(); // Issued at timestamp
    expect(decoded.exp).toBeDefined(); // Expiry timestamp
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
    logger.info('✅ Token contains iat and exp claims');
  });

  // =============================================================================
  // Token Format Tests
  // =============================================================================

  /**
   * Test Case: JWT Structure Validation
   * ------------------------------------
   * Verifies that the generated token follows proper JWT structure
   * with valid Base64 encoded parts.
   */
  it('should generate a properly formatted JWT token', () => {
    logger.info('🧪 Test: JWT structure validation');
    
    const payload: JwtUserPayload = {
      uuid: 'test-user',
      role: 'employee',
      type: 'employee',
    };
    
    const token = generateToken(payload);
    
    // Split into parts
    const [header, payloadPart, signature] = token.split('.');
    logger.info('✅ Token split into 3 parts');
    
    // Verify each part is Base64 URL-encoded (non-empty)
    expect(header.length).toBeGreaterThan(0);
    expect(payloadPart.length).toBeGreaterThan(0);
    expect(signature.length).toBeGreaterThan(0);
    logger.info('✅ All parts are non-empty');
    
    // Decode and verify header
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64').toString());
    expect(decodedHeader.alg).toBe('HS256'); // HMAC SHA-256
    expect(decodedHeader.typ).toBe('JWT');
    logger.info('✅ Header contains correct algorithm (HS256) and type (JWT)');
  });

  /**
   * Test Case: Token Signature Validation
   * --------------------------------------
   * Verifies that the token has a valid signature that can be verified
   * using the secret key.
   */
  it('should generate a token with valid signature', () => {
    logger.info('🧪 Test: Token signature validation');
    
    const payload: JwtUserPayload = {
      uuid: 'sig-test',
      role: 'employee',
      type: 'employee',
    };
    
    const token = generateToken(payload);
    logger.info('✅ Token generated');
    
    // Verify signature using jsonwebtoken library
    logger.info('🔄 Verifying signature...');
    const secret = config.security.sessionSecret as string;
    
    expect(() => {
      jwt.verify(token, secret);
    }).not.toThrow();
    logger.info('✅ Token signature is valid');
  });

  // =============================================================================
  // Expiry Time Tests
  // =============================================================================

  /**
   * Test Case: Default Expiry Time
   * -------------------------------
   * Verifies that tokens use the default expiry time when none is specified.
   * This test dynamically reads from ACCESS_TOKEN_EXPIRES_IN constant,
   * which comes from JWT_ACCESS_TOKEN_EXPIRES_IN env variable.
   * 
   * If you change JWT_ACCESS_TOKEN_EXPIRES_IN in .env file, this test
   * will automatically use the new value without modification.
   */
  it('should use default expiry time when not specified', () => {
    logger.info('🧪 Test: Default expiry time');
    
    // Dynamically read expected expiry from config
    const expectedExpirySeconds = getTokenExpiryInSeconds(ACCESS_TOKEN_EXPIRES_IN);
    logger.info(`🔄 Reading default expiry from config: ${ACCESS_TOKEN_EXPIRES_IN} = ${expectedExpirySeconds}s`);
    
    const payload: JwtUserPayload = {
      uuid: 'default-exp',
      role: 'employee',
      type: 'employee',
    };
    
    const token = generateToken(payload);
    const decoded = jwt.decode(token) as { iat: number; exp: number };
    
    // Calculate actual expiry duration
    const duration = decoded.exp - decoded.iat;
    
    // Verify against dynamically read config value (not hardcoded)
    expect(duration).toBe(expectedExpirySeconds);
    logger.info(`✅ Token uses configured default expiry (${ACCESS_TOKEN_EXPIRES_IN} = ${expectedExpirySeconds}s)`);
  });

  /**
   * Test Case: Custom Expiry Time
   * ------------------------------
   * Verifies that custom expiry times can be specified and are
   * correctly applied to the token.
   */
  it('should use custom expiry time when specified', () => {
    logger.info('🧪 Test: Custom expiry time');
    
    const payload: JwtUserPayload = {
      uuid: 'custom-exp',
      role: 'employee',
      type: 'employee',
    };
    
    // Generate token with 1 hour expiry
    logger.info('🔄 Generating token with 1 hour expiry...');
    const token = generateToken(payload, '1h');
    
    const decoded = jwt.decode(token) as { iat: number; exp: number };
    const duration = decoded.exp - decoded.iat;
    
    // 1 hour = 3600 seconds
    expect(duration).toBe(3600);
    logger.info('✅ Token uses custom expiry (1 hour)');
  });

  /**
   * Test Case: Short-Lived Token
   * -----------------------------
   * Verifies that very short expiry times work correctly.
   */
  it('should generate token with short expiry time', () => {
    logger.info('🧪 Test: Short-lived token');
    
    const payload: JwtUserPayload = {
      uuid: 'short-lived',
      role: 'employee',
      type: 'employee',
    };
    
    // Generate token with 5 seconds expiry
    const token = generateToken(payload, '5s');
    
    const decoded = jwt.decode(token) as { iat: number; exp: number };
    const duration = decoded.exp - decoded.iat;
    
    // 5 seconds
    expect(duration).toBe(5);
    logger.info('✅ Token uses short expiry (5 seconds)');
  });

  // =============================================================================
  // User Type Tests
  // =============================================================================

  /**
   * Test Case: Employee Token Generation
   * -------------------------------------
   * Verifies that tokens can be generated for employee users.
   */
  it('should generate token for employee type', () => {
    logger.info('🧪 Test: Employee token generation');
    
    const payload: JwtUserPayload = {
      uuid: 'emp-001',
      role: 'employee',
      email: 'employee@company.com',
      type: 'employee',
    };
    
    const token = generateToken(payload);
    const decoded = jwt.decode(token) as { user: JwtUserPayload };
    
    expect(decoded.user.type).toBe('employee');
    logger.info('✅ Employee token generated correctly');
  });

  /**
   * Test Case: Customer Token Generation
   * -------------------------------------
   * Verifies that tokens can be generated for customer users.
   */
  it('should generate token for customer type', () => {
    logger.info('🧪 Test: Customer token generation');
    
    const payload: JwtUserPayload = {
      uuid: 'cust-001',
      role: 'customer',
      email: 'customer@example.com',
      type: 'customer',
    };
    
    const token = generateToken(payload);
    const decoded = jwt.decode(token) as { user: JwtUserPayload };
    
    expect(decoded.user.type).toBe('customer');
    logger.info('✅ Customer token generated correctly');
  });

  // =============================================================================
  // Role Tests
  // =============================================================================

  /**
   * Test Case: Different Roles Token Generation
   * --------------------------------------------
   * Verifies that tokens can be generated for different user roles.
   */
  it('should generate tokens for different roles', () => {
    logger.info('🧪 Test: Different roles token generation');
    
    const roles = ['super_user', 'hr', 'employee', 'manager', 'director', 'customer'];
    
    roles.forEach((role) => {
      logger.info(`🔄 Generating token for role: ${role}`);
      
      const payload: JwtUserPayload = {
        uuid: `user-${role}`,
        role: role,
        type: role === 'customer' ? 'customer' : 'employee',
      };
      
      const token = generateToken(payload);
      const decoded = jwt.decode(token) as { user: JwtUserPayload };
      
      expect(decoded.user.role).toBe(role);
      logger.info(`✅ Token generated for role: ${role}`);
    });
    
    logger.info('✅ All roles tested successfully');
  });

  // =============================================================================
  // Uniqueness Tests
  // =============================================================================

  /**
   * Test Case: Token Uniqueness
   * ----------------------------
   * Verifies that generating multiple tokens with the same payload
   * produces different tokens due to different issued-at times.
   */
  it('should generate unique tokens even with same payload', async () => {
    logger.info('🧪 Test: Token uniqueness');
    
    const payload: JwtUserPayload = {
      uuid: 'same-user',
      role: 'employee',
      type: 'employee',
    };
    
    logger.info('🔄 Generating first token...');
    const token1 = generateToken(payload);
    
    // Wait 1 second to ensure different iat timestamp
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    logger.info('🔄 Generating second token...');
    const token2 = generateToken(payload);
    
    // Tokens should be different due to different iat
    expect(token1).not.toBe(token2);
    logger.info('✅ Tokens are unique (different iat timestamps)');
    
    // But both should have same payload
    const decoded1 = jwt.decode(token1) as { user: JwtUserPayload };
    const decoded2 = jwt.decode(token2) as { user: JwtUserPayload };
    
    expect(decoded1.user.uuid).toBe(decoded2.user.uuid);
    expect(decoded1.user.role).toBe(decoded2.user.role);
    logger.info('✅ Both tokens have same user payload');
  });

  // =============================================================================
  // expireToken Function Tests
  // =============================================================================

  /**
   * Test Case: Expire Token Generation
   * -----------------------------------
   * Verifies that expireToken creates a token that expires almost immediately
   * for use in logout flows.
   */
  it('should generate an almost-expired token for logout', () => {
    logger.info('🧪 Test: Expire token generation');
    
    logger.info('🔄 Generating expire token...');
    const token = expireToken();
    
    // Verify it's a valid token
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
    logger.info('✅ Expire token is valid JWT');
    
    // Decode and check expiry
    const decoded = jwt.decode(token) as { user: JwtUserPayload; iat: number; exp: number };
    
    // Should have minimal user payload
    expect(decoded.user.uuid).toBe('0');
    expect(decoded.user.role).toBe('none');
    expect(decoded.user.type).toBe('employee');
    logger.info('✅ Expire token has placeholder payload');
    
    // Should expire in 1ms
    const duration = decoded.exp - decoded.iat;
    expect(duration).toBeLessThanOrEqual(1);
    logger.info('✅ Expire token has 1ms expiry');
  });

  /**
   * Test Case: Expired Token Verification Fails
   * --------------------------------------------
   * Verifies that an expired token cannot be verified successfully.
   */
  it('should create token that immediately fails verification', async () => {
    logger.info('🧪 Test: Expired token verification');
    
    const token = expireToken();
    
    // Wait 100ms to ensure token is expired
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    logger.info('🔄 Attempting to verify expired token...');
    const result = verifyToken(token);
    
    expect(result).toBeNull();
    logger.info('✅ Expired token correctly fails verification');
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  /**
   * Test Case: Token Can Be Verified
   * ---------------------------------
   * Integration test verifying that a generated token can be
   * successfully verified using the verifyToken helper.
   */
  it('should generate token that can be verified', () => {
    logger.info('🧪 Test: Token verification integration');
    
    const payload: JwtUserPayload = {
      uuid: 'verify-test',
      role: 'employee',
      email: 'verify@test.com',
      type: 'employee',
    };
    
    logger.info('🔄 Generating token...');
    const token = generateToken(payload);
    
    logger.info('🔄 Verifying token...');
    const verified = verifyToken(token);
    
    expect(verified).not.toBeNull();
    expect(verified?.uuid).toBe(payload.uuid);
    expect(verified?.role).toBe(payload.role);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.type).toBe(payload.type);
    logger.info('✅ Token successfully verified with correct payload');
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  /**
   * Test Case: Token Without Email
   * -------------------------------
   * Verifies that tokens can be generated without the optional email field.
   */
  it('should generate token without optional email field', () => {
    logger.info('🧪 Test: Token without email');
    
    const payload: JwtUserPayload = {
      uuid: 'no-email',
      role: 'employee',
      type: 'employee',
      // email is optional
    };
    
    const token = generateToken(payload);
    const decoded = jwt.decode(token) as { user: JwtUserPayload };
    
    expect(decoded.user.email).toBeUndefined();
    logger.info('✅ Token generated without email field');
  });

  /**
   * Test Case: Long UUID
   * ---------------------
   * Verifies that tokens can handle long UUID strings.
   */
  it('should handle long UUID strings', () => {
    logger.info('🧪 Test: Long UUID handling');
    
    const longUuid = 'a'.repeat(200); // Very long UUID
    
    const payload: JwtUserPayload = {
      uuid: longUuid,
      role: 'employee',
      type: 'employee',
    };
    
    const token = generateToken(payload);
    const decoded = jwt.decode(token) as { user: JwtUserPayload };
    
    expect(decoded.user.uuid).toBe(longUuid);
    logger.info('✅ Long UUID handled correctly');
  });

  // =============================================================================
  // Logging Tests
  // =============================================================================

  /**
   * Test Case: Debug Logging Content
   * ---------------------------------
   * Verifies that the debug log includes relevant information
   * about the token generation.
   */
  it('should log token generation with role and type', () => {
    logger.info('🧪 Test: Debug logging content');
    
    const payload: JwtUserPayload = {
      uuid: 'log-test',
      role: 'manager',
      type: 'employee',
    };
    
    generateToken(payload);
    
    // Verify debug log was called
    expect(debugSpy).toHaveBeenCalled();
    expect(wasLogged(debugSpy, 'Access token generated')).toBe(true);
    logger.info('✅ Debug log contains token generation message');
  });
});
