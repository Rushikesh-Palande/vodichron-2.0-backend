/**
 * Extend Session Controller Test Suite
 * ====================================
 * 
 * Tests the extendSession controller which handles the HTTP REST API endpoint
 * for extending user sessions by rotating refresh tokens.
 * 
 * Test Coverage:
 * ✅ Successful session extension delegation
 * ✅ Service delegation
 * ✅ Error handling (500 on unexpected errors)
 * ✅ Service response forwarding
 * ✅ Request/Response object passing
 * 
 * Security Considerations:
 * - No input validation (handled by service layer)
 * - Refresh token validation by service
 * - Token rotation by service
 * - Generic 500 error on unexpected failures
 * 
 * HTTP Contract:
 * Route: POST /api/auth/extend-session
 * Auth: Requires refresh token in cookie
 * Body: None
 * 
 * Response Codes:
 * - 200/401: Handled by service layer (handleExtendSession)
 * - 500: Internal server error
 * 
 * Integration Points:
 * - Service: handleExtendSession
 * - Logger: logger
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\controllers
 */

import { Request, Response } from 'express';
import { extendSession } from '../../controllers/extend-session.controller';
import { handleExtendSession } from '../../services/auth.service';
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

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Extend Session Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Mocks
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // Setup request mock
    mockReq = {
      cookies: {},
      headers: {},
    } as Request;
    
    (mockReq as any).ip = '192.168.1.100';

    // Setup response mock with chainable methods
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };

    // Setup logger spies
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Successful Session Extension Tests
  // =============================================================================

  describe('Successful Session Extension', () => {
    /**
     * Test Case: Successful Delegation
     * --------------------------------
     * Verifies controller delegates to handleExtendSession service.
     */
    it('should delegate to handleExtendSession service', async () => {
      logger.info('🧪 Test: Successful session extension delegation');

      (handleExtendSession as jest.Mock).mockResolvedValue(undefined);

      await extendSession(mockReq as Request, mockRes as Response);

      // Verify handleExtendSession was called
      expect(handleExtendSession).toHaveBeenCalledWith(mockReq, mockRes);

      logger.info('✅ Successfully delegated to handleExtendSession');
    });

    /**
     * Test Case: Service Response Returned
     * ------------------------------------
     * Verifies controller returns service response.
     */
    it('should return response from handleExtendSession service', async () => {
      logger.info('🧪 Test: Service response returned');

      // Mock service returns a value
      const mockServiceResponse = { success: true, token: 'new_token' };
      (handleExtendSession as jest.Mock).mockResolvedValue(mockServiceResponse);

      const result = await extendSession(mockReq as Request, mockRes as Response);

      // Verify controller returns service response
      expect(result).toBe(mockServiceResponse);

      logger.info('✅ Service response returned correctly');
    });

    /**
     * Test Case: Request/Response Objects Passed
     * ------------------------------------------
     * Verifies exact req/res objects passed to service.
     */
    it('should pass exact request and response objects to service', async () => {
      logger.info('🧪 Test: Exact objects passed');

      (handleExtendSession as jest.Mock).mockResolvedValue(undefined);

      await extendSession(mockReq as Request, mockRes as Response);

      // Verify service receives the actual req/res objects (not copies)
      const callArgs = (handleExtendSession as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe(mockReq);
      expect(callArgs[1]).toBe(mockRes);

      logger.info('✅ Exact objects passed to service');
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

      (handleExtendSession as jest.Mock).mockRejectedValue(
        new Error('Session validation failed')
      );

      await extendSession(mockReq as Request, mockRes as Response);

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
     * Test Case: Database Error
     * -------------------------
     * Verifies handling of database errors.
     */
    it('should return 500 for database errors', async () => {
      logger.info('🧪 Test: Database error handling');

      (handleExtendSession as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await extendSession(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { message: 'Internal server error' },
      });

      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Database error properly handled');
    });

    /**
     * Test Case: Unexpected Error
     * ---------------------------
     * Verifies handling of unexpected errors.
     */
    it('should return 500 for unexpected errors', async () => {
      logger.info('🧪 Test: Unexpected error handling');

      (handleExtendSession as jest.Mock).mockRejectedValue(
        new Error('Unexpected error occurred')
      );

      await extendSession(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: { message: 'Internal server error' },
      });

      logger.info('✅ Unexpected error properly handled');
    });
  });

  // =============================================================================
  // Response Format Tests
  // =============================================================================

  describe('Response Format Validation', () => {
    /**
     * Test Case: Internal Error Format
     * --------------------------------
     * Verifies 500 error has correct format.
     */
    it('should return internal error with correct format', async () => {
      logger.info('🧪 Test: Internal error format');

      (handleExtendSession as jest.Mock).mockRejectedValue(new Error('Test error'));

      await extendSession(mockReq as Request, mockRes as Response);

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
     * Test Case: Service Integration
     * ------------------------------
     * Verifies service is properly integrated.
     */
    it('should integrate with handleExtendSession service', async () => {
      logger.info('🧪 Test: Service integration');

      (handleExtendSession as jest.Mock).mockResolvedValue(undefined);

      await extendSession(mockReq as Request, mockRes as Response);

      // Verify service was called exactly once
      expect(handleExtendSession).toHaveBeenCalledTimes(1);

      // Verify with correct arguments
      expect(handleExtendSession).toHaveBeenCalledWith(mockReq, mockRes);

      logger.info('✅ Service properly integrated');
    });

    /**
     * Test Case: No Validation Layer
     * ------------------------------
     * Verifies controller has no validation (delegated to service).
     */
    it('should not perform any validation', async () => {
      logger.info('🧪 Test: No validation in controller');

      // Even with empty request
      mockReq.cookies = {};

      (handleExtendSession as jest.Mock).mockResolvedValue(undefined);

      await extendSession(mockReq as Request, mockRes as Response);

      // Service should still be called (validation is service's responsibility)
      expect(handleExtendSession).toHaveBeenCalled();

      logger.info('✅ No validation performed in controller');
    });

    /**
     * Test Case: Direct Delegation
     * ----------------------------
     * Verifies controller only delegates, no extra logic.
     */
    it('should only delegate without extra logic', async () => {
      logger.info('🧪 Test: Direct delegation only');

      const mockResponse = { success: true };
      (handleExtendSession as jest.Mock).mockResolvedValue(mockResponse);

      const result = await extendSession(mockReq as Request, mockRes as Response);

      // Controller should return exactly what service returns
      expect(result).toBe(mockResponse);

      // No modifications or additional processing
      expect(handleExtendSession).toHaveBeenCalledTimes(1);

      logger.info('✅ Direct delegation confirmed');
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    /**
     * Test Case: Service Returns Undefined
     * ------------------------------------
     * Verifies handling when service doesn't return a value.
     */
    it('should handle service returning undefined', async () => {
      logger.info('🧪 Test: Service returns undefined');

      (handleExtendSession as jest.Mock).mockResolvedValue(undefined);

      const result = await extendSession(mockReq as Request, mockRes as Response);

      expect(result).toBeUndefined();

      logger.info('✅ Undefined return handled');
    });

    /**
     * Test Case: Service Returns Null
     * -------------------------------
     * Verifies handling when service returns null.
     */
    it('should handle service returning null', async () => {
      logger.info('🧪 Test: Service returns null');

      (handleExtendSession as jest.Mock).mockResolvedValue(null);

      const result = await extendSession(mockReq as Request, mockRes as Response);

      expect(result).toBeNull();

      logger.info('✅ Null return handled');
    });
  });
});
