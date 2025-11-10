/**
 * Reset Password Controller Test Suite
 * ====================================
 * 
 * Tests the resetPasswordController which handles the HTTP REST API endpoint
 * for password reset functionality. This is the final step in the password
 * recovery process.
 * 
 * Test Coverage:
 * ✅ Successful password reset (200 OK)
 * ✅ Request validation (schema validation)
 * ✅ Missing required fields
 * ✅ Invalid email format
 * ✅ Weak password rejection
 * ✅ Expired reset link error (400)
 * ✅ Inactive account error (403)
 * ✅ Invalid token error (400)
 * ✅ Client IP extraction and forwarding
 * ✅ Response format validation
 * ✅ Timestamp in responses
 * ✅ Error code mapping
 * ✅ Service layer integration
 * ✅ Generic error handling
 * 
 * Security Considerations:
 * - Input validation via Zod schema
 * - Password strength requirements enforced
 * - Client IP tracking for audit trails
 * - Appropriate HTTP status codes
 * - Error message security (no sensitive data leakage)
 * - Proper error categorization (expired vs inactive vs generic)
 * 
 * HTTP Contract:
 * Route: POST /api/auth/reset-password
 * Auth: Public (no authentication required)
 * Body: { email: string, sec: string (token), password: string }
 * 
 * Response Codes:
 * - 200: Password reset successful
 * - 400: Validation error or expired link
 * - 403: Account inactive
 * 
 * Integration Points:
 * - Service: resetPasswordService
 * - Schema: resetPasswordSchema
 * - Logger: logger
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\controllers
 */

import { Request, Response } from 'express';
import { resetPasswordController } from '../../controllers/reset-password.controller';
import { resetPasswordService } from '../../services/reset-password.service';
import { resetPasswordSchema } from '../../schemas/reset-password.schema';
import { logger } from '../../../../utils/logger';

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

// Mock service
jest.mock('../../services/reset-password.service');

// Mock schema (we'll use real schema but can spy on it)
jest.mock('../../schemas/reset-password.schema', () => ({
  resetPasswordSchema: {
    safeParse: jest.fn(),
  },
}));

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Reset Password Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Mocks
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // Setup request mock
    mockReq = {
      body: {},
      headers: {},
    } as Request;
    
    // Set IP separately to avoid readonly error
    (mockReq as any).ip = '192.168.1.100';

    // Setup response mock with chainable methods
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup logger spies
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Successful Password Reset Tests
  // =============================================================================

  describe('Successful Password Reset', () => {
    /**
     * Test Case: Successful Password Reset
     * ------------------------------------
     * Verifies complete successful password reset flow.
     * 
     * Steps:
     * 1. Valid request body
     * 2. Schema validation passes
     * 3. Service executes successfully
     * 4. Returns 200 with success message
     */
    it('should successfully reset password with valid data', async () => {
      logger.info('🧪 Test: Successful password reset');

      // Step 1: Setup valid request
      logger.info('🔄 Step 1: Setting up valid request...');
      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'valid_encrypted_token',
        password: 'NewSecurePassword123!',
      };
      (mockReq as any).ip = '203.0.113.42';

      // Step 2: Mock successful validation
      logger.info('🔄 Step 2: Mocking successful validation...');
      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          email: 'user@vodichron.com',
          sec: 'valid_encrypted_token',
          password: 'NewSecurePassword123!',
        },
      });

      // Step 3: Mock successful service call
      logger.info('🔄 Step 3: Mocking successful service...');
      (resetPasswordService as jest.Mock).mockResolvedValue(true);

      // Step 4: Execute controller
      logger.info('🔄 Step 4: Executing controller...');
      await resetPasswordController(mockReq as Request, mockRes as Response);

      // Step 5: Verify service called with correct parameters
      logger.info('✅ Step 5: Verifying service call...');
      expect(resetPasswordService).toHaveBeenCalledWith(
        'user@vodichron.com',
        'valid_encrypted_token',
        'NewSecurePassword123!',
        '203.0.113.42'
      );

      // Step 6: Verify response
      logger.info('✅ Step 6: Verifying response...');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
        timestamp: expect.any(String),
      });

      logger.info('✅ Password reset completed successfully');
    });

    /**
     * Test Case: Client IP Extraction
     * -------------------------------
     * Verifies that client IP is extracted and forwarded.
     */
    it('should extract and forward client IP to service', async () => {
      logger.info('🧪 Test: Client IP extraction');

      const testIp = '10.0.0.50';
      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'token',
        password: 'Password123!',
      };
      (mockReq as any).ip = testIp;

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });
      (resetPasswordService as jest.Mock).mockResolvedValue(true);

      await resetPasswordController(mockReq as Request, mockRes as Response);

      // Verify IP forwarded
      expect(resetPasswordService).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        testIp
      );

      logger.info('✅ Client IP extracted and forwarded');
    });

    /**
     * Test Case: Unknown IP Fallback
     * ------------------------------
     * Verifies fallback when IP is not available.
     */
    it('should use "unknown" when client IP is not available', async () => {
      logger.info('🧪 Test: Unknown IP fallback');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'token',
        password: 'Password123!',
      };
      (mockReq as any).ip = undefined; // No IP

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });
      (resetPasswordService as jest.Mock).mockResolvedValue(true);

      await resetPasswordController(mockReq as Request, mockRes as Response);

      // Verify 'unknown' used
      expect(resetPasswordService).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'unknown'
      );

      logger.info('✅ Unknown IP fallback working');
    });
  });

  // =============================================================================
  // Validation Error Tests
  // =============================================================================

  describe('Validation Errors', () => {
    /**
     * Test Case: Missing Required Fields
     * ----------------------------------
     * Verifies rejection when required fields are missing.
     */
    it('should reject request with missing email', async () => {
      logger.info('🧪 Test: Missing email field');

      mockReq.body = {
        sec: 'token',
        password: 'Password123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Email is required',
              path: ['email'],
            },
          ],
        },
      });

      await resetPasswordController(mockReq as Request, mockRes as Response);

      // Verify validation error response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email is required',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
      });

      // Verify service NOT called
      expect(resetPasswordService).not.toHaveBeenCalled();

      // Verify warning logged
      expect(warnSpy).toHaveBeenCalled();
      expect(wasLogged(warnSpy, 'Reset password validation failed')).toBe(true);

      logger.info('✅ Missing email properly rejected');
    });

    /**
     * Test Case: Missing Token
     * ------------------------
     * Verifies rejection when reset token is missing.
     */
    it('should reject request with missing token', async () => {
      logger.info('🧪 Test: Missing token field');

      mockReq.body = {
        email: 'user@vodichron.com',
        password: 'Password123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Reset token is required',
              path: ['sec'],
            },
          ],
        },
      });

      await resetPasswordController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Reset token is required',
          code: 'VALIDATION_ERROR',
        })
      );

      logger.info('✅ Missing token properly rejected');
    });

    /**
     * Test Case: Missing Password
     * ---------------------------
     * Verifies rejection when password is missing.
     */
    it('should reject request with missing password', async () => {
      logger.info('🧪 Test: Missing password field');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'token',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Password is required',
              path: ['password'],
            },
          ],
        },
      });

      await resetPasswordController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Password is required',
        })
      );

      logger.info('✅ Missing password properly rejected');
    });

    /**
     * Test Case: Invalid Email Format
     * -------------------------------
     * Verifies rejection of invalid email addresses.
     */
    it('should reject request with invalid email format', async () => {
      logger.info('🧪 Test: Invalid email format');

      mockReq.body = {
        email: 'not-an-email',
        sec: 'token',
        password: 'Password123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Invalid email format',
              path: ['email'],
            },
          ],
        },
      });

      await resetPasswordController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid email format',
        })
      );

      logger.info('✅ Invalid email properly rejected');
    });

    /**
     * Test Case: Weak Password
     * ------------------------
     * Verifies rejection of passwords not meeting requirements.
     */
    it('should reject request with weak password', async () => {
      logger.info('🧪 Test: Weak password rejection');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'token',
        password: 'weak',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
              path: ['password'],
            },
          ],
        },
      });

      await resetPasswordController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
        })
      );

      logger.info('✅ Weak password properly rejected');
    });
  });

  // =============================================================================
  // Service Error Tests
  // =============================================================================

  describe('Service Errors', () => {
    /**
     * Test Case: Expired Reset Link
     * -----------------------------
     * Verifies proper handling of expired reset links.
     */
    it('should return 400 for expired reset link', async () => {
      logger.info('🧪 Test: Expired reset link error');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'expired_token',
        password: 'NewPassword123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Looks like your reset link is expired.')
      );

      await resetPasswordController(mockReq as Request, mockRes as Response);

      // Verify specific expired link response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Looks like your reset link is expired.',
        code: 'RESET_LINK_EXPIRED',
        timestamp: expect.any(String),
      });

      // Verify error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Expired link properly handled');
    });

    /**
     * Test Case: Inactive Account
     * ---------------------------
     * Verifies proper handling of inactive accounts (403 Forbidden).
     */
    it('should return 403 for inactive account', async () => {
      logger.info('🧪 Test: Inactive account error');

      mockReq.body = {
        email: 'inactive@vodichron.com',
        sec: 'token',
        password: 'NewPassword123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Your account is in deactivated state, contact HR to activate the account.')
      );

      await resetPasswordController(mockReq as Request, mockRes as Response);

      // Verify 403 Forbidden for inactive account
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Your account is in deactivated state, contact HR to activate the account.',
        code: 'ACCOUNT_INACTIVE',
        timestamp: expect.any(String),
      });

      logger.info('✅ Inactive account properly handled with 403');
    });

    /**
     * Test Case: Invalid Reset Request
     * --------------------------------
     * Verifies handling of invalid reset requests.
     */
    it('should return 400 for invalid reset request', async () => {
      logger.info('🧪 Test: Invalid reset request');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'invalid_token',
        password: 'NewPassword123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Invalid reset request.')
      );

      await resetPasswordController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid reset request.',
        timestamp: expect.any(String),
      });

      logger.info('✅ Invalid request properly handled');
    });

    /**
     * Test Case: Generic Service Error
     * --------------------------------
     * Verifies handling of generic/unexpected errors.
     */
    it('should return 400 for generic service errors', async () => {
      logger.info('🧪 Test: Generic service error');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'token',
        password: 'NewPassword123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await resetPasswordController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection failed',
        timestamp: expect.any(String),
      });

      logger.info('✅ Generic error properly handled');
    });

    /**
     * Test Case: Error Without Message
     * --------------------------------
     * Verifies handling when error has no message.
     */
    it('should handle error without message', async () => {
      logger.info('🧪 Test: Error without message');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'token',
        password: 'NewPassword123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      // Throw error without message
      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = ''; // Empty message
      (resetPasswordService as jest.Mock).mockRejectedValue(errorWithoutMessage);

      await resetPasswordController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to reset password',
        timestamp: expect.any(String),
      });

      logger.info('✅ Error without message handled with fallback');
    });
  });

  // =============================================================================
  // Response Format Tests
  // =============================================================================

  describe('Response Format Validation', () => {
    /**
     * Test Case: Success Response Format
     * ----------------------------------
     * Verifies success response has required fields.
     */
    it('should return response with timestamp', async () => {
      logger.info('🧪 Test: Response timestamp');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'token',
        password: 'Password123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });
      (resetPasswordService as jest.Mock).mockResolvedValue(true);

      await resetPasswordController(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      // Verify timestamp exists and is valid ISO string
      expect(jsonCall.timestamp).toBeDefined();
      expect(() => new Date(jsonCall.timestamp)).not.toThrow();

      logger.info('✅ Response includes valid timestamp');
    });

    /**
     * Test Case: Error Response Format
     * --------------------------------
     * Verifies error response has required fields.
     */
    it('should return error response with all required fields', async () => {
      logger.info('🧪 Test: Error response format');

      mockReq.body = {
        email: 'user@vodichron.com',
        sec: 'expired_token',
        password: 'Password123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Looks like your reset link is expired.')
      );

      await resetPasswordController(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      // Verify all required fields
      expect(jsonCall).toHaveProperty('success', false);
      expect(jsonCall).toHaveProperty('message');
      expect(jsonCall).toHaveProperty('code', 'RESET_LINK_EXPIRED');
      expect(jsonCall).toHaveProperty('timestamp');

      logger.info('✅ Error response has all required fields');
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration', () => {
    /**
     * Test Case: Schema Integration
     * -----------------------------
     * Verifies schema validation is properly integrated.
     */
    it('should call schema validation with request body', async () => {
      logger.info('🧪 Test: Schema validation integration');

      const requestData = {
        email: 'test@vodichron.com',
        sec: 'test_token',
        password: 'TestPassword123!',
      };

      mockReq.body = requestData;

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: requestData,
      });
      (resetPasswordService as jest.Mock).mockResolvedValue(true);

      await resetPasswordController(mockReq as Request, mockRes as Response);

      // Verify schema called with exact body data
      expect(resetPasswordSchema.safeParse).toHaveBeenCalledWith(requestData);

      logger.info('✅ Schema validation properly integrated');
    });

    /**
     * Test Case: Service Integration
     * ------------------------------
     * Verifies service is called with validated data.
     */
    it('should pass validated data to service', async () => {
      logger.info('🧪 Test: Service integration with validated data');

      mockReq.body = {
        email: 'TEST@VODICHRON.COM', // Uppercase
        sec: ' token_with_spaces ',
        password: 'Password123!',
      };

      // Schema normalizes/transforms data
      const validatedData = {
        email: 'test@vodichron.com', // Lowercase
        sec: 'token_with_spaces', // Trimmed
        password: 'Password123!',
      };

      (resetPasswordSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: validatedData,
      });
      (resetPasswordService as jest.Mock).mockResolvedValue(true);

      await resetPasswordController(mockReq as Request, mockRes as Response);

      // Verify service receives validated/transformed data
      expect(resetPasswordService).toHaveBeenCalledWith(
        'test@vodichron.com',
        'token_with_spaces',
        'Password123!',
        expect.any(String)
      );

      logger.info('✅ Service receives validated data');
    });
  });
});
