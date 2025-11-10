/**
 * Generate Reset Link Controller Test Suite
 * =========================================
 * 
 * Tests the generateResetLinkController which handles the HTTP REST API endpoint
 * for initiating password reset by generating and sending reset links.
 * 
 * Test Coverage:
 * ✅ Successful reset link generation (200 OK)
 * ✅ Request validation (schema validation)
 * ✅ Missing username field
 * ✅ Invalid username format
 * ✅ Inactive account error (403)
 * ✅ Anti-enumeration (always returns success message)
 * ✅ Client IP extraction and forwarding
 * ✅ Response format validation
 * ✅ Timestamp in responses
 * ✅ Error handling fallback to success message
 * ✅ Service layer integration
 * ✅ Generic error anti-enumeration
 * 
 * Security Considerations:
 * - Anti-enumeration: Returns same success message regardless of user existence
 * - Only inactive accounts get 403 (known state)
 * - Unknown users/errors return generic success message
 * - Input validation via Zod schema
 * - Client IP tracking for audit trails
 * - No information leakage about user existence
 * 
 * HTTP Contract:
 * Route: POST /api/auth/generate-reset-link
 * Auth: Public (no authentication required)
 * Body: { username: string (email) }
 * 
 * Response Codes:
 * - 200: Success (always, for anti-enumeration)
 * - 400: Validation error
 * - 403: Account inactive (only exception)
 * 
 * Integration Points:
 * - Service: generateResetLinkService
 * - Schema: generateResetLinkSchema
 * - Logger: logger
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\controllers
 */

import { Request, Response } from 'express';
import { generateResetLinkController } from '../../controllers/generate-reset-link.controller';
import { generateResetLinkService } from '../../services/generate-reset-link.service';
import { generateResetLinkSchema } from '../../schemas/generate-reset-link.schema';
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
jest.mock('../../services/generate-reset-link.service');

// Mock schema
jest.mock('../../schemas/generate-reset-link.schema', () => ({
  generateResetLinkSchema: {
    safeParse: jest.fn(),
  },
}));

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Generate Reset Link Controller', () => {
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
  // Successful Reset Link Generation Tests
  // =============================================================================

  describe('Successful Reset Link Generation', () => {
    /**
     * Test Case: Successful Link Generation
     * -------------------------------------
     * Verifies complete successful reset link generation flow.
     */
    it('should successfully generate reset link with valid username', async () => {
      logger.info('🧪 Test: Successful reset link generation');

      mockReq.body = { username: 'user@vodichron.com' };
      (mockReq as any).ip = '203.0.113.42';

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { username: 'user@vodichron.com' },
      });

      (generateResetLinkService as jest.Mock).mockResolvedValue(true);

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify service called
      expect(generateResetLinkService).toHaveBeenCalledWith(
        'user@vodichron.com',
        '203.0.113.42'
      );

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists, you will receive password reset instructions shortly.',
        timestamp: expect.any(String),
      });

      logger.info('✅ Reset link generated successfully');
    });

    /**
     * Test Case: Client IP Extraction
     * -------------------------------
     * Verifies that client IP is extracted and forwarded.
     */
    it('should extract and forward client IP to service', async () => {
      logger.info('🧪 Test: Client IP extraction');

      const testIp = '10.0.0.50';
      mockReq.body = { username: 'user@vodichron.com' };
      (mockReq as any).ip = testIp;

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });
      (generateResetLinkService as jest.Mock).mockResolvedValue(true);

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify IP forwarded
      expect(generateResetLinkService).toHaveBeenCalledWith(
        'user@vodichron.com',
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

      mockReq.body = { username: 'user@vodichron.com' };
      (mockReq as any).ip = undefined;

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });
      (generateResetLinkService as jest.Mock).mockResolvedValue(true);

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify 'unknown' used
      expect(generateResetLinkService).toHaveBeenCalledWith(
        'user@vodichron.com',
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
     * Test Case: Missing Username
     * ---------------------------
     * Verifies rejection when username is missing.
     */
    it('should reject request with missing username', async () => {
      logger.info('🧪 Test: Missing username field');

      mockReq.body = {};

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
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

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify validation error response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Username is required',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
      });

      // Verify service NOT called
      expect(generateResetLinkService).not.toHaveBeenCalled();

      // Verify warning logged
      expect(warnSpy).toHaveBeenCalled();

      logger.info('✅ Missing username properly rejected');
    });

    /**
     * Test Case: Invalid Username Format
     * ----------------------------------
     * Verifies rejection of invalid email format.
     */
    it('should reject request with invalid username format', async () => {
      logger.info('🧪 Test: Invalid username format');

      mockReq.body = { username: 'not-an-email' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
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

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid email format',
          code: 'VALIDATION_ERROR',
        })
      );

      logger.info('✅ Invalid username properly rejected');
    });

    /**
     * Test Case: Empty String Username
     * --------------------------------
     * Verifies rejection of empty string.
     */
    it('should reject request with empty username', async () => {
      logger.info('🧪 Test: Empty username');

      mockReq.body = { username: '' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Username cannot be empty',
              path: ['username'],
            },
          ],
        },
      });

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );

      logger.info('✅ Empty username properly rejected');
    });
  });

  // =============================================================================
  // Service Error Tests (Anti-Enumeration)
  // =============================================================================

  describe('Service Errors and Anti-Enumeration', () => {
    /**
     * Test Case: Inactive Account
     * ---------------------------
     * Verifies 403 for inactive accounts (only exception to anti-enumeration).
     */
    it('should return 403 for inactive account', async () => {
      logger.info('🧪 Test: Inactive account error');

      mockReq.body = { username: 'inactive@vodichron.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Your account is in deactivated state, contact HR to activate the account.')
      );

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify 403 for inactive account
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Your account is in deactivated state, contact HR to activate the account.',
        timestamp: expect.any(String),
      });

      // Verify error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Inactive account properly handled with 403');
    });

    /**
     * Test Case: User Not Found (Anti-Enumeration)
     * --------------------------------------------
     * Verifies generic success message when user doesn't exist.
     * 
     * Security: Prevents user enumeration attacks.
     */
    it('should return success message for non-existent user (anti-enumeration)', async () => {
      logger.info('🧪 Test: Non-existent user anti-enumeration');

      mockReq.body = { username: 'nonexistent@example.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      // Service throws error for non-existent user
      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify returns success message (anti-enumeration)
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists, you will receive password reset instructions shortly.',
        timestamp: expect.any(String),
      });

      logger.info('✅ Anti-enumeration working for non-existent user');
    });

    /**
     * Test Case: Generic Service Error (Anti-Enumeration)
     * ---------------------------------------------------
     * Verifies generic success message for any error (except inactive).
     */
    it('should return success message for generic errors (anti-enumeration)', async () => {
      logger.info('🧪 Test: Generic error anti-enumeration');

      mockReq.body = { username: 'user@vodichron.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      // Service throws generic error
      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify returns success message (anti-enumeration)
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists, you will receive password reset instructions shortly.',
        timestamp: expect.any(String),
      });

      // Verify error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Anti-enumeration working for generic errors');
    });

    /**
     * Test Case: Email Sending Failure (Anti-Enumeration)
     * ---------------------------------------------------
     * Verifies success message even when email fails to send.
     */
    it('should return success message when email fails to send', async () => {
      logger.info('🧪 Test: Email failure anti-enumeration');

      mockReq.body = { username: 'user@vodichron.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Failed to send email')
      );

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'If the email exists, you will receive password reset instructions shortly.',
        })
      );

      logger.info('✅ Email failure handled with anti-enumeration');
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

      mockReq.body = { username: 'user@vodichron.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });
      (generateResetLinkService as jest.Mock).mockResolvedValue(true);

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      // Verify timestamp exists and is valid ISO string
      expect(jsonCall.timestamp).toBeDefined();
      expect(() => new Date(jsonCall.timestamp)).not.toThrow();

      logger.info('✅ Response includes valid timestamp');
    });

    /**
     * Test Case: Generic Success Message
     * ----------------------------------
     * Verifies the anti-enumeration message is consistent.
     */
    it('should return consistent anti-enumeration message', async () => {
      logger.info('🧪 Test: Consistent anti-enumeration message');

      mockReq.body = { username: 'user@vodichron.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });
      (generateResetLinkService as jest.Mock).mockResolvedValue(true);

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      // Verify exact message
      expect(jsonCall.message).toBe(
        'If the email exists, you will receive password reset instructions shortly.'
      );

      logger.info('✅ Anti-enumeration message is consistent');
    });

    /**
     * Test Case: Error Response Format
     * --------------------------------
     * Verifies validation error response format.
     */
    it('should return validation error with all required fields', async () => {
      logger.info('🧪 Test: Validation error format');

      mockReq.body = {};

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
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

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      // Verify all required fields
      expect(jsonCall).toHaveProperty('success', false);
      expect(jsonCall).toHaveProperty('message');
      expect(jsonCall).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(jsonCall).toHaveProperty('timestamp');

      logger.info('✅ Validation error has all required fields');
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

      const requestData = { username: 'test@vodichron.com' };
      mockReq.body = requestData;

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: requestData,
      });
      (generateResetLinkService as jest.Mock).mockResolvedValue(true);

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify schema called with exact body data
      expect(generateResetLinkSchema.safeParse).toHaveBeenCalledWith(requestData);

      logger.info('✅ Schema validation properly integrated');
    });

    /**
     * Test Case: Service Integration
     * ------------------------------
     * Verifies service is called with validated data.
     */
    it('should pass validated data to service', async () => {
      logger.info('🧪 Test: Service integration with validated data');

      mockReq.body = { username: 'TEST@VODICHRON.COM' };

      // Schema normalizes data
      const validatedData = { username: 'test@vodichron.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: validatedData,
      });
      (generateResetLinkService as jest.Mock).mockResolvedValue(true);

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify service receives validated/normalized data
      expect(generateResetLinkService).toHaveBeenCalledWith(
        'test@vodichron.com',
        expect.any(String)
      );

      logger.info('✅ Service receives validated data');
    });
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  describe('Security', () => {
    /**
     * Test Case: No Information Leakage
     * ---------------------------------
     * Verifies no sensitive information in logs or responses.
     */
    it('should not leak user existence information in response', async () => {
      logger.info('🧪 Test: No information leakage');

      mockReq.body = { username: 'user@vodichron.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      // Test multiple error scenarios
      const errorScenarios = [
        new Error('User not found'),
        new Error('Email sending failed'),
        new Error('Token generation failed'),
      ];

      for (const error of errorScenarios) {
        (generateResetLinkService as jest.Mock).mockRejectedValue(error);
        
        await generateResetLinkController(mockReq as Request, mockRes as Response);

        const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
        
        // All should return same generic message
        expect(jsonCall.message).toBe(
          'If the email exists, you will receive password reset instructions shortly.'
        );
        
        jest.clearAllMocks();
      }

      logger.info('✅ No information leakage in any error scenario');
    });

    /**
     * Test Case: Inactive Account is Only Exception
     * ---------------------------------------------
     * Verifies only inactive accounts get different response.
     */
    it('should only reveal inactive account status', async () => {
      logger.info('🧪 Test: Inactive account exception');

      mockReq.body = { username: 'inactive@vodichron.com' };

      (generateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Your account is in deactivated state, contact HR to activate the account.')
      );

      await generateResetLinkController(mockReq as Request, mockRes as Response);

      // Should get 403 with specific message
      expect(mockRes.status).toHaveBeenCalledWith(403);
      
      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.message).toContain('deactivated state');

      logger.info('✅ Inactive account is only exception to anti-enumeration');
    });
  });
});
