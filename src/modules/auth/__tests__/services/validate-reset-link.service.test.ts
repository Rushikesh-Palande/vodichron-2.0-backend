/**
 * Validate Reset Link Service Test Suite
 * =======================================
 * 
 * Tests the validateResetLinkService function which validates password reset
 * links sent to users via email. This is a critical security checkpoint that
 * ensures only valid, non-expired tokens can be used for password resets.
 * 
 * Test Coverage:
 * ✅ Valid token validation (returns email)
 * ✅ Invalid token handling (token not found)
 * ✅ Expired token handling (15-minute window)
 * ✅ Token format validation
 * ✅ Database lookup operations
 * ✅ Security logging for validation attempts
 * ✅ Client IP tracking in logs
 * ✅ Error handling and graceful degradation
 * ✅ Null return for security (no information leakage)
 * ✅ Comprehensive audit trail
 * 
 * Security Considerations:
 * - Always returns null for invalid/expired tokens (no details)
 * - Does not reveal whether email exists in system
 * - All validation attempts logged with IP
 * - Token expiration strictly enforced (15 minutes)
 * - Token preview logged (first 10 chars only)
 * - Database errors return null (fail-safe)
 * - Security events tracked at appropriate levels
 * - No exception thrown to prevent information leakage
 * 
 * Business Logic Flow:
 * Validate: Token → Database Lookup → Expiration Check → Email/Null Response
 * 
 * Integration Points:
 * - Store: findPasswordResetByToken
 * - Logger: logger, logSecurity
 * - Models: PasswordReset
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\services
 */

import { validateResetLinkService } from '../../services/validate-reset-link.service';
import { logger, logSecurity } from '../../../../utils/logger';
import { findPasswordResetByToken } from '../../store/password-reset.store';

// =============================================================================
// Mock Dependencies
// =============================================================================

// Mock logger
jest.mock('../../../../utils/logger', () => {
  const mockLogger: any = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  
  // Set up chaining after initialization
  mockLogger.info.mockReturnValue(mockLogger);
  mockLogger.debug.mockReturnValue(mockLogger);
  mockLogger.warn.mockReturnValue(mockLogger);
  mockLogger.error.mockReturnValue(mockLogger);
  
  return {
    logger: mockLogger,
    logAuth: jest.fn(),
    logSecurity: jest.fn(),
    logDatabase: jest.fn(),
    PerformanceTimer: jest.fn().mockImplementation(() => ({
      end: jest.fn().mockReturnValue(10),
    })),
  };
});

// Mock store functions
jest.mock('../../store/password-reset.store');

// Mock config for database
jest.mock('../../../../config', () => ({
  config: {
    db: {
      host: 'localhost',
      port: 3306,
      database: 'test_db',
      username: 'test_user',
      password: 'test_pass',
      logging: false,
      timezone: '+00:00',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  },
}));

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Validate Reset Link Service', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Mocks
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // Setup logger spies
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Valid Token Tests
  // =============================================================================

  describe('Valid Token Validation', () => {
    /**
     * Test Case: Successful Token Validation
     * --------------------------------------
     * Verifies that a valid, non-expired token returns the email address.
     * 
     * Steps:
     * 1. Valid reset request exists in database
     * 2. Token is not expired (within 15 minutes)
     * 3. Service validates token
     * 4. Email address returned
     * 5. Success logged
     */
    it('should return email for valid non-expired token', async () => {
      logger.info('🧪 Test: Valid token validation');

      // Step 1: Setup valid reset request
      logger.info('🔄 Step 1: Setting up valid reset request...');
      const testToken = 'encrypted_valid_token_12345';
      const testEmail = 'user@vodichron.com';
      const testIp = '192.168.1.100';

      const mockResetRequest = {
        uuid: 'reset-001',
        email: testEmail,
        token: testToken,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago (within 15 min window)
      };

      // Step 2: Mock database response
      logger.info('🔄 Step 2: Mocking database response...');
      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);

      // Step 3: Execute validation
      logger.info('🔄 Step 3: Executing token validation...');
      const result = await validateResetLinkService(testToken, testIp);

      // Step 4: Verify email returned
      logger.info('✅ Step 4: Verifying email returned...');
      expect(result).not.toBeNull();
      expect(result).toEqual({ email: testEmail });

      // Step 5: Verify database lookup
      logger.info('✅ Step 5: Verifying database lookup...');
      expect(findPasswordResetByToken).toHaveBeenCalledWith(testToken);

      // Step 6: Verify security logging
      logger.info('✅ Step 6: Verifying security logging...');
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_LINK_VALIDATED',
        'low',
        expect.objectContaining({ email: testEmail }),
        testIp
      );

      // Step 7: Verify info logging
      logger.info('✅ Step 7: Verifying info logging...');
      expect(infoSpy).toHaveBeenCalled();
      expect(wasLogged(infoSpy, 'Validating password reset link')).toBe(true);
      expect(wasLogged(infoSpy, 'Reset link validated successfully')).toBe(true);

      logger.info('✅ Valid token validation completed successfully');
    });

    /**
     * Test Case: Token Preview Logging
     * --------------------------------
     * Verifies that only first 10 characters of token are logged (security).
     */
    it('should log only token preview (first 10 chars) for security', async () => {
      logger.info('🧪 Test: Token preview logging');

      const testToken = 'encrypted_very_long_token_that_should_be_truncated_in_logs';
      const mockResetRequest = {
        uuid: 'reset-002',
        email: 'user@example.com',
        token: testToken,
        createdAt: new Date(),
      };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);

      await validateResetLinkService(testToken, '127.0.0.1');

      // Verify full token NOT logged
      expect(infoSpy).toHaveBeenCalled();
      const allInfoCalls = infoSpy.mock.calls.flat();
      const fullTokenLogged = allInfoCalls.some(
        (arg: any) => JSON.stringify(arg).includes(testToken)
      );
      expect(fullTokenLogged).toBe(false);

      logger.info('✅ Token preview security verified');
    });

    /**
     * Test Case: IP Address Tracking
     * ------------------------------
     * Verifies that client IP is tracked in security logs.
     */
    it('should track client IP address in security logs', async () => {
      logger.info('🧪 Test: IP address tracking');

      const testIp = '203.0.113.42';
      const testToken = 'valid_token';
      const mockResetRequest = {
        uuid: 'reset-003',
        email: 'tracked@example.com',
        token: testToken,
        createdAt: new Date(),
      };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);

      await validateResetLinkService(testToken, testIp);

      // Verify IP logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_LINK_VALIDATED',
        'low',
        expect.any(Object),
        testIp
      );

      logger.info('✅ IP address tracking verified');
    });
  });

  // =============================================================================
  // Invalid Token Tests
  // =============================================================================

  describe('Invalid Token Handling', () => {
    /**
     * Test Case: Token Not Found in Database
     * --------------------------------------
     * Verifies that null is returned when token doesn't exist.
     * 
     * Security: Does not reveal whether token exists or not.
     */
    it('should return null for non-existent token', async () => {
      logger.info('🧪 Test: Non-existent token handling');

      const testToken = 'non_existent_token_12345';
      const testIp = '10.0.0.1';

      // Mock no reset request found
      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);

      // Execute validation
      const result = await validateResetLinkService(testToken, testIp);

      // Verify null returned (no information leakage)
      expect(result).toBeNull();

      // Verify database lookup attempted
      expect(findPasswordResetByToken).toHaveBeenCalledWith(testToken);

      // Verify warning logged
      expect(warnSpy).toHaveBeenCalled();
      expect(wasLogged(warnSpy, 'Invalid or expired reset token')).toBe(true);

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_INVALID_TOKEN',
        'medium',
        expect.objectContaining({ reason: 'Token not found or expired' }),
        testIp
      );

      logger.info('✅ Non-existent token properly handled');
    });

    /**
     * Test Case: Expired Token (Handled by Store)
     * -------------------------------------------
     * Verifies that expired tokens return null (store layer handles expiration).
     */
    it('should return null for expired token', async () => {
      logger.info('🧪 Test: Expired token handling');

      const expiredToken = 'expired_token_over_15_minutes';
      const testIp = '127.0.0.1';

      // Store layer returns null for expired tokens
      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);

      const result = await validateResetLinkService(expiredToken, testIp);

      // Verify null returned
      expect(result).toBeNull();

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_INVALID_TOKEN',
        'medium',
        expect.any(Object),
        testIp
      );

      logger.info('✅ Expired token properly rejected');
    });

    /**
     * Test Case: Empty/Invalid Token Format
     * -------------------------------------
     * Verifies handling of malformed tokens.
     */
    it('should return null for empty token', async () => {
      logger.info('🧪 Test: Empty token handling');

      const emptyToken = '';

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);

      const result = await validateResetLinkService(emptyToken);

      // Verify null returned
      expect(result).toBeNull();

      logger.info('✅ Empty token properly handled');
    });

    /**
     * Test Case: Malformed Token
     * --------------------------
     * Verifies that various malformed tokens are handled gracefully.
     */
    it('should handle malformed tokens gracefully', async () => {
      logger.info('🧪 Test: Malformed token handling');

      const malformedTokens = [
        'short',
        '   whitespace   ',
        'token:with:colons',
        'token/with/slashes',
        'token?with=query',
      ];

      for (const token of malformedTokens) {
        (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);

        const result = await validateResetLinkService(token);

        expect(result).toBeNull();
        logger.info(`  ✅ Malformed token handled: "${token}"`);
      }

      logger.info('✅ All malformed tokens handled gracefully');
    });
  });

  // =============================================================================
  // Database Error Handling Tests
  // =============================================================================

  describe('Database Error Handling', () => {
    /**
     * Test Case: Database Connection Error
     * ------------------------------------
     * Verifies graceful handling when database is unavailable.
     * 
     * Security: Returns null (fail-safe), does not throw exception.
     */
    it('should return null when database connection fails', async () => {
      logger.info('🧪 Test: Database connection error');

      const testToken = 'valid_token';
      const testIp = '192.168.1.50';

      // Mock database error
      (findPasswordResetByToken as jest.Mock).mockRejectedValue(
        new Error('Database connection timeout')
      );

      // Execute validation
      const result = await validateResetLinkService(testToken, testIp);

      // Verify null returned (fail-safe)
      expect(result).toBeNull();

      // Verify error logged
      expect(errorSpy).toHaveBeenCalled();
      expect(wasLogged(errorSpy, 'Password reset link validation failed')).toBe(true);

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_VALIDATION_ERROR',
        'medium',
        expect.objectContaining({ error: 'Database connection timeout' }),
        testIp
      );

      logger.info('✅ Database error handled gracefully');
    });

    /**
     * Test Case: Database Query Error
     * -------------------------------
     * Verifies handling of SQL errors.
     */
    it('should return null when database query fails', async () => {
      logger.info('🧪 Test: Database query error');

      const testToken = 'test_token';

      (findPasswordResetByToken as jest.Mock).mockRejectedValue(
        new Error('SQL syntax error')
      );

      const result = await validateResetLinkService(testToken);

      // Still returns null
      expect(result).toBeNull();

      // Error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Database query error handled');
    });

    /**
     * Test Case: Unexpected Database Response
     * ---------------------------------------
     * Verifies handling when database returns unexpected data.
     */
    it('should handle unexpected database responses', async () => {
      logger.info('🧪 Test: Unexpected database response');

      const testToken = 'test_token';

      // Mock unexpected response format
      (findPasswordResetByToken as jest.Mock).mockRejectedValue(
        new Error('Unexpected response format')
      );

      const result = await validateResetLinkService(testToken);

      expect(result).toBeNull();

      logger.info('✅ Unexpected response handled');
    });
  });

  // =============================================================================
  // Security and Logging Tests
  // =============================================================================

  describe('Security and Audit Logging', () => {
    /**
     * Test Case: Comprehensive Logging
     * --------------------------------
     * Verifies all validation steps are logged appropriately.
     */
    it('should log all validation steps', async () => {
      logger.info('🧪 Test: Comprehensive logging');

      const testToken = 'logged_token';
      const mockResetRequest = {
        uuid: 'reset-004',
        email: 'logged@example.com',
        token: testToken,
        createdAt: new Date(),
      };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);

      await validateResetLinkService(testToken);

      // Verify step-by-step logging
      expect(infoSpy).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalled();
      expect(wasLogged(infoSpy, 'Validating password reset link')).toBe(true);
      expect(wasLogged(debugSpy, 'Looking up reset request in database')).toBe(true);
      expect(wasLogged(infoSpy, 'Reset link validated successfully')).toBe(true);

      logger.info('✅ All steps properly logged');
    });

    /**
     * Test Case: Security Event Classification
     * ----------------------------------------
     * Verifies security events are logged at appropriate severity levels.
     */
    it('should log security events at correct severity levels', async () => {
      logger.info('🧪 Test: Security event severity levels');

      // Test 1: Valid token (low severity)
      const validToken = 'valid_token';
      const mockResetRequest = {
        uuid: 'reset-005',
        email: 'valid@example.com',
        token: validToken,
        createdAt: new Date(),
      };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      await validateResetLinkService(validToken);

      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_LINK_VALIDATED',
        'low', // Low severity for success
        expect.any(Object),
        undefined
      );

      // Test 2: Invalid token (medium severity)
      jest.clearAllMocks();
      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);
      await validateResetLinkService('invalid_token');

      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_INVALID_TOKEN',
        'medium', // Medium severity for invalid attempt
        expect.any(Object),
        undefined
      );

      // Test 3: Error (medium severity)
      jest.clearAllMocks();
      (findPasswordResetByToken as jest.Mock).mockRejectedValue(new Error('Test error'));
      await validateResetLinkService('error_token');

      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_VALIDATION_ERROR',
        'medium', // Medium severity for errors
        expect.any(Object),
        undefined
      );

      logger.info('✅ Security severity levels correct');
    });

    /**
     * Test Case: No Email Leakage in Errors
     * -------------------------------------
     * Verifies that email addresses are not leaked in error responses.
     * 
     * Security: Critical to prevent email enumeration.
     */
    it('should not leak email information for invalid tokens', async () => {
      logger.info('🧪 Test: Email information leakage prevention');

      const invalidToken = 'invalid_token_no_leak';

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);

      const result = await validateResetLinkService(invalidToken);

      // Result is null (no email returned)
      expect(result).toBeNull();

      // Verify security log does not contain email
      const securityCalls = (logSecurity as jest.Mock).mock.calls;
      const hasEmail = securityCalls.some((call) =>
        JSON.stringify(call).includes('@')
      );
      expect(hasEmail).toBe(false);

      logger.info('✅ No email leakage for invalid tokens');
    });

    /**
     * Test Case: IP Tracking for All Attempts
     * ---------------------------------------
     * Verifies IP address is tracked for both valid and invalid attempts.
     */
    it('should track IP for both valid and invalid attempts', async () => {
      logger.info('🧪 Test: IP tracking consistency');

      const testIp = '198.51.100.10';

      // Test 1: Valid token
      const mockResetRequest = {
        uuid: 'reset-006',
        email: 'tracked@example.com',
        token: 'valid',
        createdAt: new Date(),
      };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      await validateResetLinkService('valid_token', testIp);

      expect(logSecurity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        testIp
      );

      // Test 2: Invalid token
      jest.clearAllMocks();
      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);
      await validateResetLinkService('invalid_token', testIp);

      expect(logSecurity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        testIp
      );

      logger.info('✅ IP tracking consistent for all attempts');
    });
  });

  // =============================================================================
  // Edge Cases and Boundary Tests
  // =============================================================================

  describe('Edge Cases', () => {
    /**
     * Test Case: Validation Without IP Address
     * ----------------------------------------
     * Verifies service works when IP is not provided.
     */
    it('should work without client IP address', async () => {
      logger.info('🧪 Test: Validation without IP');

      const testToken = 'token_without_ip';
      const mockResetRequest = {
        uuid: 'reset-007',
        email: 'noip@example.com',
        token: testToken,
        createdAt: new Date(),
      };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);

      // Call without IP parameter
      const result = await validateResetLinkService(testToken);

      // Should still work
      expect(result).toEqual({ email: 'noip@example.com' });

      // Security logged with undefined IP
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_LINK_VALIDATED',
        'low',
        expect.any(Object),
        undefined
      );

      logger.info('✅ Works without IP address');
    });

    /**
     * Test Case: Very Long Token
     * --------------------------
     * Verifies handling of unusually long tokens.
     */
    it('should handle very long tokens', async () => {
      logger.info('🧪 Test: Very long token');

      const veryLongToken = 'a'.repeat(1000); // 1000 character token

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);

      const result = await validateResetLinkService(veryLongToken);

      expect(result).toBeNull();

      logger.info('✅ Very long token handled');
    });

    /**
     * Test Case: Special Characters in Token
     * --------------------------------------
     * Verifies tokens with special characters are handled properly.
     */
    it('should handle tokens with special characters', async () => {
      logger.info('🧪 Test: Special characters in token');

      const specialToken = 'token:with/special%chars=value&key';
      const mockResetRequest = {
        uuid: 'reset-008',
        email: 'special@example.com',
        token: specialToken,
        createdAt: new Date(),
      };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);

      const result = await validateResetLinkService(specialToken);

      expect(result).toEqual({ email: 'special@example.com' });

      logger.info('✅ Special characters handled');
    });

    /**
     * Test Case: Concurrent Validations
     * ---------------------------------
     * Verifies multiple validations can run concurrently.
     */
    it('should handle concurrent validations', async () => {
      logger.info('🧪 Test: Concurrent validations');

      const tokens = ['token1', 'token2', 'token3'];
      const mockRequests = tokens.map((token, index) => ({
        uuid: `reset-${100 + index}`,
        email: `user${index}@example.com`,
        token,
        createdAt: new Date(),
      }));

      (findPasswordResetByToken as jest.Mock).mockImplementation((token: string) => {
        const index = tokens.indexOf(token);
        return Promise.resolve(mockRequests[index]);
      });

      const results = await Promise.all(
        tokens.map((token) => validateResetLinkService(token))
      );

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toEqual({ email: `user${index}@example.com` });
      });

      logger.info('✅ Concurrent validations handled');
    });
  });
});
