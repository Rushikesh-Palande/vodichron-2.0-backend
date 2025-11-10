/**
 * Login Controller Test Suite
 * ===========================
 * 
 * Tests the authLogin controller which handles the HTTP REST API endpoint
 * for user authentication (both employees and customers).
 * 
 * Test Coverage:
 * ✅ Successful login delegation to service
 * ✅ Request validation (schema validation)
 * ✅ Missing username field
 * ✅ Missing password field
 * ✅ Invalid email format
 * ✅ Weak password (too short)
 * ✅ Service delegation
 * ✅ Error handling (500 on unexpected errors)
 * ✅ Validation error format
 * ✅ Integration with handleLogin service
 * 
 * Security Considerations:
 * - Input validation via Zod schema
 * - Email format validation
 * - Password presence validation
 * - Proper error categorization
 * - Generic 500 error on unexpected failures
 * 
 * HTTP Contract:
 * Route: POST /api/auth/login
 * Auth: Public (no authentication required)
 * Body: { username: string (email), password: string }
 * 
 * Response Codes:
 * - 200/401: Handled by service layer (handleLogin)
 * - 400: Validation error
 * - 500: Internal server error
 * 
 * Integration Points:
 * - Service: handleLogin
 * - Schema: loginSchema
 * - Logger: logger
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\controllers
 */

import { Request, Response } from 'express';
import { authLogin } from '../../controllers/login.controller';
import { handleLogin } from '../../services/auth.service';
import { loginSchema } from '../../schemas/auth.schemas';
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
jest.mock('../../services/auth.service');

// Mock schema
jest.mock('../../schemas/auth.schemas', () => ({
  loginSchema: {
    safeParse: jest.fn(),
  },
}));

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Login Controller', () => {
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
  // Successful Login Tests
  // =============================================================================

  describe('Successful Login', () => {
    /**
     * Test Case: Successful Login Delegation
     * --------------------------------------
     * Verifies controller delegates to handleLogin service.
     */
    it('should delegate to handleLogin service on valid input', async () => {
      logger.info('🧪 Test: Successful login delegation');

      mockReq.body = {
        username: 'user@vodichron.com',
        password: 'Password123!',
      };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (handleLogin as jest.Mock).mockResolvedValue(undefined);

      await authLogin(mockReq as Request, mockRes as Response);

      // Verify handleLogin was called
      expect(handleLogin).toHaveBeenCalledWith(mockReq, mockRes);

      // Verify validation passed
      expect(loginSchema.safeParse).toHaveBeenCalledWith({
        username: 'user@vodichron.com',
        password: 'Password123!',
      });

      logger.info('✅ Successfully delegated to handleLogin');
    });

    /**
     * Test Case: Service Response Returned
     * ------------------------------------
     * Verifies controller returns service response.
     */
    it('should return response from handleLogin service', async () => {
      logger.info('🧪 Test: Service response returned');

      mockReq.body = {
        username: 'user@vodichron.com',
        password: 'Password123!',
      };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      // Mock service returns a value
      const mockServiceResponse = { success: true, token: 'abc' };
      (handleLogin as jest.Mock).mockResolvedValue(mockServiceResponse);

      const result = await authLogin(mockReq as Request, mockRes as Response);

      // Verify controller returns service response
      expect(result).toBe(mockServiceResponse);

      logger.info('✅ Service response returned correctly');
    });
  });

  // =============================================================================
  // Validation Error Tests
  // =============================================================================

  describe('Validation Errors', () => {
    /**
     * Test Case: Missing Username
     * ---------------------------
     * Verifies rejection when username missing.
     */
    it('should reject request with missing username', async () => {
      logger.info('🧪 Test: Missing username field');

      mockReq.body = { password: 'Password123!' };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Username is required',
              path: ['username'],
            },
          ],
        },
      });

      await authLogin(mockReq as Request, mockRes as Response);

      // Verify validation error response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Username is required',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
      });

      // Verify service NOT called
      expect(handleLogin).not.toHaveBeenCalled();

      // Verify warning logged
      expect(warnSpy).toHaveBeenCalled();

      logger.info('✅ Missing username properly rejected');
    });

    /**
     * Test Case: Missing Password
     * ---------------------------
     * Verifies rejection when password missing.
     */
    it('should reject request with missing password', async () => {
      logger.info('🧪 Test: Missing password field');

      mockReq.body = { username: 'user@vodichron.com' };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
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

      await authLogin(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Password is required',
          code: 'VALIDATION_ERROR',
        })
      );

      expect(handleLogin).not.toHaveBeenCalled();

      logger.info('✅ Missing password properly rejected');
    });

    /**
     * Test Case: Invalid Email Format
     * -------------------------------
     * Verifies rejection of invalid email format.
     */
    it('should reject request with invalid email format', async () => {
      logger.info('🧪 Test: Invalid email format');

      mockReq.body = {
        username: 'not-an-email',
        password: 'Password123!',
      };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Invalid email format',
              path: ['username'],
            },
          ],
        },
      });

      await authLogin(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid email format',
          code: 'VALIDATION_ERROR',
        })
      );

      logger.info('✅ Invalid email properly rejected');
    });

    /**
     * Test Case: Password Too Short
     * -----------------------------
     * Verifies rejection of weak passwords.
     */
    it('should reject request with password too short', async () => {
      logger.info('🧪 Test: Password too short');

      mockReq.body = {
        username: 'user@vodichron.com',
        password: '12345', // Less than 6 characters
      };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Password must be at least 6 characters',
              path: ['password'],
            },
          ],
        },
      });

      await authLogin(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
        })
      );

      logger.info('✅ Short password properly rejected');
    });

    /**
     * Test Case: Empty Request Body
     * -----------------------------
     * Verifies handling when both fields missing.
     */
    it('should reject request with empty body', async () => {
      logger.info('🧪 Test: Empty request body');

      mockReq.body = {};

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Username is required',
              path: ['username'],
            },
          ],
        },
      });

      await authLogin(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
        })
      );

      expect(handleLogin).not.toHaveBeenCalled();

      logger.info('✅ Empty body properly rejected');
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    /**
     * Test Case: Service Throws Error
     * -------------------------------
     * Verifies 500 error when service throws.
     */
    it('should return 500 when service throws error', async () => {
      logger.info('🧪 Test: Service error handling');

      mockReq.body = {
        username: 'user@vodichron.com',
        password: 'Password123!',
      };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (handleLogin as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await authLogin(mockReq as Request, mockRes as Response);

      // Verify 500 error
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { message: 'Internal server error' },
      });

      // Verify error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Service error properly handled');
    });

    /**
     * Test Case: Validation Throws Error
     * ----------------------------------
     * Verifies 500 when validation itself throws.
     */
    it('should return 500 when validation throws error', async () => {
      logger.info('🧪 Test: Validation error handling');

      mockReq.body = {
        username: 'user@vodichron.com',
        password: 'Password123!',
      };

      (loginSchema.safeParse as jest.Mock).mockImplementation(() => {
        throw new Error('Schema validation crashed');
      });

      await authLogin(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { message: 'Internal server error' },
      });

      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Validation error properly handled');
    });
  });

  // =============================================================================
  // Response Format Tests
  // =============================================================================

  describe('Response Format Validation', () => {
    /**
     * Test Case: Validation Error Format
     * ----------------------------------
     * Verifies validation error has all required fields.
     */
    it('should return validation error with all required fields', async () => {
      logger.info('🧪 Test: Validation error format');

      mockReq.body = {};

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Username is required',
              path: ['username'],
            },
          ],
        },
      });

      await authLogin(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      // Verify all required fields
      expect(jsonCall).toHaveProperty('success', false);
      expect(jsonCall).toHaveProperty('message');
      expect(jsonCall).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(jsonCall).toHaveProperty('timestamp');
      expect(() => new Date(jsonCall.timestamp)).not.toThrow();

      logger.info('✅ Validation error has correct format');
    });

    /**
     * Test Case: Internal Error Format
     * --------------------------------
     * Verifies 500 error has correct format.
     */
    it('should return internal error with correct format', async () => {
      logger.info('🧪 Test: Internal error format');

      mockReq.body = {
        username: 'user@vodichron.com',
        password: 'Password123!',
      };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (handleLogin as jest.Mock).mockRejectedValue(new Error('Test error'));

      await authLogin(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      expect(jsonCall).toHaveProperty('error');
      expect(jsonCall.error).toHaveProperty('message', 'Internal server error');

      logger.info('✅ Internal error has correct format');
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration', () => {
    /**
     * Test Case: Schema Validation Integration
     * ----------------------------------------
     * Verifies schema is called with correct data.
     */
    it('should call schema validation with request body', async () => {
      logger.info('🧪 Test: Schema validation integration');

      const requestData = {
        username: 'test@vodichron.com',
        password: 'TestPassword123!',
      };

      mockReq.body = requestData;

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: requestData,
      });

      (handleLogin as jest.Mock).mockResolvedValue(undefined);

      await authLogin(mockReq as Request, mockRes as Response);

      // Verify schema called with exact body
      expect(loginSchema.safeParse).toHaveBeenCalledWith(requestData);

      logger.info('✅ Schema validation properly integrated');
    });

    /**
     * Test Case: Service Integration
     * ------------------------------
     * Verifies service receives correct req/res objects.
     */
    it('should pass request and response to service', async () => {
      logger.info('🧪 Test: Service integration');

      mockReq.body = {
        username: 'user@vodichron.com',
        password: 'Password123!',
      };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (handleLogin as jest.Mock).mockResolvedValue(undefined);

      await authLogin(mockReq as Request, mockRes as Response);

      // Verify service receives the actual req/res objects
      expect(handleLogin).toHaveBeenCalledWith(mockReq, mockRes);

      logger.info('✅ Service receives correct objects');
    });

    /**
     * Test Case: Validation Before Service
     * ------------------------------------
     * Verifies validation happens before service call.
     */
    it('should validate before calling service', async () => {
      logger.info('🧪 Test: Validation order');

      mockReq.body = {
        username: 'invalid',
        password: 'pass',
      };

      (loginSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [{ message: 'Invalid email' }],
        },
      });

      await authLogin(mockReq as Request, mockRes as Response);

      // Verify schema was called
      expect(loginSchema.safeParse).toHaveBeenCalled();

      // Verify service was NOT called due to validation failure
      expect(handleLogin).not.toHaveBeenCalled();

      logger.info('✅ Validation happens before service call');
    });
  });
});
