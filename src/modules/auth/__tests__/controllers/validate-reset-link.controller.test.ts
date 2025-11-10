/**
 * Validate Reset Link Controller Test Suite
 * =========================================
 * 
 * Tests the validateResetLinkController which handles the HTTP REST API endpoint
 * for validating password reset links before allowing users to reset passwords.
 * 
 * Test Coverage:
 * ✅ Successful link validation (200 OK)
 * ✅ Request validation (schema validation)
 * ✅ Missing sec field
 * ✅ Invalid token format
 * ✅ Expired/invalid token (returns success: false)
 * ✅ CORS origin validation
 * ✅ Unauthorized origin rejection (403)
 * ✅ Client IP extraction and forwarding
 * ✅ Response format validation
 * ✅ Timestamp in responses
 * ✅ Email disclosure on valid token
 * ✅ Service layer integration
 * ✅ Anti-enumeration for errors
 * 
 * Security Considerations:
 * - CORS origin validation (only allowed origins can validate)
 * - Anti-enumeration: Invalid tokens return success: false (not 404)
 * - Client IP tracking for audit trails
 * - Email only disclosed for valid tokens
 * - Input validation via Zod schema
 * - Prevents token validation from unauthorized domains
 * 
 * HTTP Contract:
 * Route: POST /api/auth/validate-reset-link
 * Auth: Public (no authentication required)
 * Body: { sec: string (token), key?: string (optional obfuscation key) }
 * 
 * Response Codes:
 * - 200: Always (with success: true/false for anti-enumeration)
 * - 400: Validation error
 * - 403: Unauthorized origin
 * 
 * Integration Points:
 * - Service: validateResetLinkService
 * - Schema: validateResetLinkSchema
 * - Config: config.cors.origin
 * - Logger: logger
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\controllers
 */

import { Request, Response } from 'express';
import { validateResetLinkController } from '../../controllers/validate-reset-link.controller';
import { validateResetLinkService } from '../../services/validate-reset-link.service';
import { validateResetLinkSchema } from '../../schemas/validate-reset-link.schema';
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
jest.mock('../../services/validate-reset-link.service');

// Mock schema
jest.mock('../../schemas/validate-reset-link.schema', () => ({
  validateResetLinkSchema: {
    safeParse: jest.fn(),
  },
}));

// Mock config
jest.mock('../../../../config', () => ({
  config: {
    cors: {
      origin: ['https://app.vodichron.com', 'https://vodichron.com'],
    },
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

describe('Validate Reset Link Controller', () => {
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
  // Successful Validation Tests
  // =============================================================================

  describe('Successful Token Validation', () => {
    /**
     * Test Case: Valid Token
     * ----------------------
     * Verifies successful validation of valid reset token.
     */
    it('should successfully validate valid reset token', async () => {
      logger.info('🧪 Test: Valid token validation');

      mockReq.body = { sec: 'valid_encrypted_token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };
      (mockReq as any).ip = '203.0.113.42';

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { sec: 'valid_encrypted_token' },
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify service called
      expect(validateResetLinkService).toHaveBeenCalledWith(
        'valid_encrypted_token',
        '203.0.113.42'
      );

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { email: 'user@vodichron.com' },
        timestamp: expect.any(String),
      });

      logger.info('✅ Valid token validated successfully');
    });

    /**
     * Test Case: Client IP Extraction
     * -------------------------------
     * Verifies IP forwarding to service.
     */
    it('should extract and forward client IP to service', async () => {
      logger.info('🧪 Test: Client IP extraction');

      const testIp = '10.0.0.50';
      mockReq.body = { sec: 'token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };
      (mockReq as any).ip = testIp;

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(validateResetLinkService).toHaveBeenCalledWith('token', testIp);

      logger.info('✅ Client IP extracted and forwarded');
    });

    /**
     * Test Case: Unknown IP Fallback
     * ------------------------------
     * Verifies fallback when IP unavailable.
     */
    it('should use "unknown" when client IP is not available', async () => {
      logger.info('🧪 Test: Unknown IP fallback');

      mockReq.body = { sec: 'token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };
      (mockReq as any).ip = undefined;

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(validateResetLinkService).toHaveBeenCalledWith('token', 'unknown');

      logger.info('✅ Unknown IP fallback working');
    });
  });

  // =============================================================================
  // CORS Origin Validation Tests
  // =============================================================================

  describe('CORS Origin Validation', () => {
    /**
     * Test Case: Allowed Origin
     * -------------------------
     * Verifies requests from allowed origins are processed.
     */
    it('should allow request from allowed origin', async () => {
      logger.info('🧪 Test: Allowed origin');

      mockReq.body = { sec: 'token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(validateResetLinkService).toHaveBeenCalled();

      logger.info('✅ Allowed origin accepted');
    });

    /**
     * Test Case: Unauthorized Origin
     * ------------------------------
     * Verifies requests from unauthorized origins are rejected.
     */
    it('should reject request from unauthorized origin', async () => {
      logger.info('🧪 Test: Unauthorized origin');

      mockReq.body = { sec: 'token' };
      mockReq.headers = { origin: 'https://malicious-site.com' };

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized request, this action will be reported',
        timestamp: expect.any(String),
      });

      // Verify service NOT called
      expect(validateResetLinkService).not.toHaveBeenCalled();

      // Verify warning logged
      expect(warnSpy).toHaveBeenCalled();

      logger.info('✅ Unauthorized origin rejected');
    });

    /**
     * Test Case: Origin from Referer Header
     * -------------------------------------
     * Verifies origin can be extracted from referer if origin missing.
     */
    it('should check origin from referer header', async () => {
      logger.info('🧪 Test: Referer header origin');

      mockReq.body = { sec: 'token' };
      mockReq.headers = { referer: 'https://app.vodichron.com/reset' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(validateResetLinkService).toHaveBeenCalled();

      logger.info('✅ Referer header origin accepted');
    });

    /**
     * Test Case: No Origin Header
     * ---------------------------
     * Verifies requests with no origin/referer are allowed.
     */
    it('should allow request with no origin header', async () => {
      logger.info('🧪 Test: No origin header');

      mockReq.body = { sec: 'token' };
      mockReq.headers = {}; // No origin or referer

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(validateResetLinkService).toHaveBeenCalled();

      logger.info('✅ No origin header allowed');
    });
  });

  // =============================================================================
  // Validation Error Tests
  // =============================================================================

  describe('Validation Errors', () => {
    /**
     * Test Case: Missing Token
     * ------------------------
     * Verifies rejection when token missing.
     */
    it('should reject request with missing token', async () => {
      logger.info('🧪 Test: Missing token field');

      mockReq.body = {};
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Token is required',
              path: ['sec'],
            },
          ],
        },
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token is required',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
      });

      expect(validateResetLinkService).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();

      logger.info('✅ Missing token properly rejected');
    });

    /**
     * Test Case: Invalid Token Format
     * -------------------------------
     * Verifies rejection of invalid token format.
     */
    it('should reject request with invalid token format', async () => {
      logger.info('🧪 Test: Invalid token format');

      mockReq.body = { sec: 123 }; // Number instead of string
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: {
          issues: [
            {
              message: 'Token must be a string',
              path: ['sec'],
            },
          ],
        },
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'VALIDATION_ERROR',
        })
      );

      logger.info('✅ Invalid token format rejected');
    });
  });

  // =============================================================================
  // Invalid Token Tests (Anti-Enumeration)
  // =============================================================================

  describe('Invalid Token Handling', () => {
    /**
     * Test Case: Expired/Invalid Token
     * --------------------------------
     * Verifies returns success: false for invalid tokens.
     */
    it('should return success: false for invalid token', async () => {
      logger.info('🧪 Test: Invalid token');

      mockReq.body = { sec: 'invalid_token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      // Still returns 200 (anti-enumeration)
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset link',
        timestamp: expect.any(String),
      });

      logger.info('✅ Invalid token handled with anti-enumeration');
    });

    /**
     * Test Case: Service Error Handling
     * ---------------------------------
     * Verifies service errors return success: false.
     */
    it('should return success: false for service errors', async () => {
      logger.info('🧪 Test: Service error handling');

      mockReq.body = { sec: 'token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      // Still returns 200 with success: false
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset link',
        timestamp: expect.any(String),
      });

      // Verify error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Service error handled gracefully');
    });
  });

  // =============================================================================
  // Response Format Tests
  // =============================================================================

  describe('Response Format Validation', () => {
    /**
     * Test Case: Success Response Format
     * ----------------------------------
     * Verifies valid token response format.
     */
    it('should return response with email for valid token', async () => {
      logger.info('🧪 Test: Valid token response format');

      mockReq.body = { sec: 'token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      expect(jsonCall).toHaveProperty('success', true);
      expect(jsonCall).toHaveProperty('data');
      expect(jsonCall.data).toHaveProperty('email', 'user@vodichron.com');
      expect(jsonCall).toHaveProperty('timestamp');
      expect(() => new Date(jsonCall.timestamp)).not.toThrow();

      logger.info('✅ Valid token response has correct format');
    });

    /**
     * Test Case: Invalid Token Response Format
     * ----------------------------------------
     * Verifies invalid token response format.
     */
    it('should return response with message for invalid token', async () => {
      logger.info('🧪 Test: Invalid token response format');

      mockReq.body = { sec: 'invalid_token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      
      expect(jsonCall).toHaveProperty('success', false);
      expect(jsonCall).toHaveProperty('message', 'Invalid or expired reset link');
      expect(jsonCall).toHaveProperty('timestamp');

      logger.info('✅ Invalid token response has correct format');
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration', () => {
    /**
     * Test Case: Schema Integration
     * -----------------------------
     * Verifies schema validation integration.
     */
    it('should call schema validation with request body', async () => {
      logger.info('🧪 Test: Schema validation integration');

      const requestData = { sec: 'test_token', key: 'obfuscate_key' };
      mockReq.body = requestData;
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: requestData,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(validateResetLinkSchema.safeParse).toHaveBeenCalledWith(requestData);

      logger.info('✅ Schema validation properly integrated');
    });

    /**
     * Test Case: Service Integration
     * ------------------------------
     * Verifies service receives validated data.
     */
    it('should pass validated token to service', async () => {
      logger.info('🧪 Test: Service integration');

      mockReq.body = { sec: ' token_with_spaces ' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      // Schema trims data
      const validatedData = { sec: 'token_with_spaces' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: validatedData,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      expect(validateResetLinkService).toHaveBeenCalledWith(
        'token_with_spaces',
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
     * Test Case: Email Only Disclosed for Valid Tokens
     * ------------------------------------------------
     * Verifies email is only returned for valid tokens.
     */
    it('should only disclose email for valid tokens', async () => {
      logger.info('🧪 Test: Email disclosure security');

      // Test valid token
      mockReq.body = { sec: 'valid_token' };
      mockReq.headers = { origin: 'https://app.vodichron.com' };

      (validateResetLinkSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockReq.body,
      });

      (validateResetLinkService as jest.Mock).mockResolvedValue({
        email: 'user@vodichron.com',
      });

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      let jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data).toHaveProperty('email');

      jest.clearAllMocks();

      // Test invalid token
      mockReq.body = { sec: 'invalid_token' };
      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('data');
      expect(jsonCall).toHaveProperty('message');

      logger.info('✅ Email only disclosed for valid tokens');
    });

    /**
     * Test Case: Origin Logging
     * -------------------------
     * Verifies unauthorized origins are logged.
     */
    it('should log unauthorized origin attempts', async () => {
      logger.info('🧪 Test: Unauthorized origin logging');

      mockReq.body = { sec: 'token' };
      mockReq.headers = { origin: 'https://evil.com' };

      await validateResetLinkController(mockReq as Request, mockRes as Response);

      // Verify warning logged with origin details
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls.flat();
      const hasOriginLog = warnCalls.some((call: any) =>
        JSON.stringify(call).includes('Unauthorized origin')
      );
      expect(hasOriginLog).toBe(true);

      logger.info('✅ Unauthorized origin logged');
    });
  });
});
