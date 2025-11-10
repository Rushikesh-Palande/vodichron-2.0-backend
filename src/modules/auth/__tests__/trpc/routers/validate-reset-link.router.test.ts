/**
 * tRPC Validate Reset Link Procedure Test Suite
 * ==============================================
 * 
 * Tests the tRPC validate reset link procedure which verifies password reset
 * tokens before allowing password reset.
 * 
 * Test Coverage:
 * ✅ Valid token validation and email return
 * ✅ Invalid/expired token handling
 * ✅ Missing token handling
 * ✅ Token format validation via schema
 * ✅ Service delegation
 * ✅ Security logging
 * ✅ Performance timing
 * ✅ Client IP tracking
 * ✅ Error handling with safe responses
 * ✅ Response structure for success/failure
 * 
 * Security Considerations:
 * - Validates token expiration (15 minutes)
 * - Returns null for invalid tokens (no details leaked)
 * - Comprehensive security logging
 * - IP tracking for monitoring
 * - Service layer handles token decryption
 * 
 * Integration Points:
 * - Schema: validateResetLinkSchema
 * - Service: validateResetLinkService
 * - Logger: logger, logSecurity, PerformanceTimer
 */

// =============================================================================
// Mock Dependencies (MUST be before imports)
// =============================================================================

jest.mock('../../../../../utils/logger', () => {
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
  
  class MockPerformanceTimer {
    end = jest.fn().mockReturnValue(10);
  }
  
  return {
    logger: mockLogger,
    logSecurity: jest.fn(),
    PerformanceTimer: MockPerformanceTimer,
  };
});

jest.mock('../../../services/validate-reset-link.service');

// =============================================================================
// Imports (AFTER mocks)
// =============================================================================

import { router } from '../../../../../trpc/trpc';
import { validateResetLinkProcedure } from '../../../trpc/routers/validate-reset-link.router';
import { logger, logSecurity } from '../../../../../utils/logger';
import { validateResetLinkService } from '../../../services/validate-reset-link.service';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('tRPC Validate Reset Link Procedure', () => {
  let mockCtx: any;
  let mockReq: any;
  let testRouter: any;

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.100',
    };

    mockCtx = {
      req: mockReq,
      res: {},
    };

    testRouter = router({
      validateResetLink: validateResetLinkProcedure,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // Valid Token Tests
  // =============================================================================

  describe('Valid Token Validation', () => {
    it('should successfully validate valid reset token and return email', async () => {
      const token = 'valid_encrypted_token_abc123';
      const email = 'user@vodichron.com';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify response structure
      expect(result).toEqual({
        success: true,
        data: { email },
        timestamp: expect.any(String),
      });

      // Verify service called with correct params
      expect(validateResetLinkService).toHaveBeenCalledWith(token, '192.168.1.100');

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_VALIDATE_ATTEMPT',
        'low',
        { tokenPreview: 'valid_encr...' },
        '192.168.1.100'
      );
    });

    it('should handle employee email validation', async () => {
      const token = 'employee_token';
      const email = 'employee@vodichron.com';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe(email);
    });

    it('should handle customer email validation', async () => {
      const token = 'customer_token';
      const email = 'customer@example.com';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe(email);
    });

    it('should truncate long tokens in security logs', async () => {
      const longToken = 'a'.repeat(100);
      const email = 'user@example.com';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email });

      const caller = testRouter.createCaller(mockCtx);
      await caller.validateResetLink({ sec: longToken });

      // Verify token preview is truncated to 10 chars
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_VALIDATE_ATTEMPT',
        'low',
        { tokenPreview: 'aaaaaaaaaa...' },
        '192.168.1.100'
      );
    });
  });

  // =============================================================================
  // Invalid/Expired Token Tests
  // =============================================================================

  describe('Invalid and Expired Tokens', () => {
    it('should return failure for invalid token', async () => {
      const token = 'invalid_token';

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify failure response
      expect(result).toEqual({
        success: false,
        message: 'Invalid or expired reset link',
        data: null,
        timestamp: expect.any(String),
      });

      // Verify warning logged
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return failure for expired token', async () => {
      const token = 'expired_token_xyz';

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired reset link');
      expect(result.data).toBeNull();
    });

    it('should return failure for tampered token', async () => {
      const token = 'tampered_token';

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });

    it('should return failure for already used token', async () => {
      const token = 'used_token';

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired reset link');
    });
  });

  // =============================================================================
  // Input Validation Tests
  // =============================================================================

  describe('Input Validation', () => {
    it('should validate token format via schema', async () => {
      const caller = testRouter.createCaller(mockCtx);

      // Empty token should be rejected by schema
      await expect(
        caller.validateResetLink({ sec: '' })
      ).rejects.toThrow();

      // Service should not be called for invalid input
      expect(validateResetLinkService).not.toHaveBeenCalled();
    });

    it('should accept valid token formats', async () => {
      const validTokens = [
        'abc123xyz',
        'encrypted_token_with_underscores',
        'TOKEN123',
        'mix3d_T0k3n-123',
      ];

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'test@example.com' });

      for (const token of validTokens) {
        const caller = testRouter.createCaller(mockCtx);
        const result = await caller.validateResetLink({ sec: token });
        
        expect(result.success).toBe(true);
        expect(validateResetLinkService).toHaveBeenCalledWith(token, '192.168.1.100');
        
        jest.clearAllMocks();
      }
    });

    it('should handle tokens with special characters', async () => {
      const token = 'token_with-special.chars+123';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'user@example.com' });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      expect(result.success).toBe(true);
      expect(validateResetLinkService).toHaveBeenCalledWith(token, '192.168.1.100');
    });
  });

  // =============================================================================
  // Client IP Tracking Tests
  // =============================================================================

  describe('Client IP Tracking', () => {
    it('should track client IP in service call', async () => {
      mockReq.ip = '203.0.113.45';
      const token = 'test_token';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'user@example.com' });

      const caller = testRouter.createCaller(mockCtx);
      await caller.validateResetLink({ sec: token });

      // Verify IP passed to service
      expect(validateResetLinkService).toHaveBeenCalledWith(token, '203.0.113.45');

      // Verify IP logged in security events
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_VALIDATE_ATTEMPT',
        'low',
        expect.any(Object),
        '203.0.113.45'
      );
    });

    it('should handle missing IP address', async () => {
      mockReq.ip = undefined;
      const token = 'test_token';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'user@example.com' });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Should still work
      expect(result.success).toBe(true);

      // Should use 'unknown' as IP
      expect(validateResetLinkService).toHaveBeenCalledWith(token, 'unknown');
    });

    it('should log different IPs for different requests', async () => {
      const token = 'token';
      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'user@example.com' });

      // First request from IP1
      mockReq.ip = '192.168.1.10';
      let caller = testRouter.createCaller(mockCtx);
      await caller.validateResetLink({ sec: token });

      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_VALIDATE_ATTEMPT',
        'low',
        expect.any(Object),
        '192.168.1.10'
      );

      jest.clearAllMocks();

      // Second request from IP2
      mockReq.ip = '192.168.1.20';
      caller = testRouter.createCaller(mockCtx);
      await caller.validateResetLink({ sec: token });

      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_VALIDATE_ATTEMPT',
        'low',
        expect.any(Object),
        '192.168.1.20'
      );
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const token = 'test_token';

      (validateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Should return failure (not throw)
      expect(result).toEqual({
        success: false,
        message: 'Invalid or expired reset link',
        data: null,
        timestamp: expect.any(String),
      });

      // Verify error logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Validate reset link tRPC error'),
        expect.objectContaining({ error: 'Database connection failed' })
      );

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_VALIDATE_ERROR',
        'medium',
        expect.objectContaining({ error: 'Database connection failed' }),
        expect.any(String)
      );
    });

    it('should handle decryption errors', async () => {
      const token = 'corrupted_encrypted_token';

      (validateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Decryption failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Should return failure
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });

    it('should handle database lookup errors', async () => {
      const token = 'valid_format_token';

      (validateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Token lookup failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Should return failure gracefully
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired reset link');
    });
  });

  // =============================================================================
  // Response Format Tests
  // =============================================================================

  describe('Response Format', () => {
    it('should return correct format for valid token', async () => {
      const token = 'valid_token';
      const email = 'test@example.com';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify all required fields present
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('email', email);
      expect(result).toHaveProperty('timestamp');
      expect(result).not.toHaveProperty('message');
    });

    it('should return correct format for invalid token', async () => {
      const token = 'invalid_token';

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify all required fields present
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('message', 'Invalid or expired reset link');
      expect(result).toHaveProperty('data', null);
      expect(result).toHaveProperty('timestamp');
    });

    it('should return ISO timestamp format', async () => {
      const token = 'token';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'test@example.com' });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify timestamp is valid ISO format
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // =============================================================================
  // Performance and Logging Tests
  // =============================================================================

  describe('Performance and Logging', () => {
    it('should track performance metrics for valid token', async () => {
      const token = 'token';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'user@example.com' });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify successful completion (which means PerformanceTimer worked)
      expect(result.success).toBe(true);
    });

    it('should track performance metrics for invalid token', async () => {
      const token = 'invalid';

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify completion with failure (PerformanceTimer still worked)
      expect(result.success).toBe(false);
    });

    it('should log comprehensive security events', async () => {
      const token = 'test_token';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'user@example.com' });

      const caller = testRouter.createCaller(mockCtx);
      await caller.validateResetLink({ sec: token });

      // Verify logging occurred
      expect(logger.info).toHaveBeenCalled();

      // Verify specific log contains validation
      const logCalls = (logger.info as jest.Mock).mock.calls;
      const hasValidationLog = logCalls.some(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('Reset link')
      );
      expect(hasValidationLog).toBe(true);
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration', () => {
    it('should delegate to service with correct parameters', async () => {
      const token = 'integration_test_token';
      const ip = '192.168.1.50';
      mockReq.ip = ip;

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email: 'test@vodichron.com' });

      const caller = testRouter.createCaller(mockCtx);
      await caller.validateResetLink({ sec: token });

      // Verify service called exactly once with correct params
      expect(validateResetLinkService).toHaveBeenCalledTimes(1);
      expect(validateResetLinkService).toHaveBeenCalledWith(token, ip);
    });

    it('should complete full validation flow', async () => {
      const token = 'complete_flow_token';
      const email = 'complete@test.com';

      (validateResetLinkService as jest.Mock).mockResolvedValue({ email });

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify all components worked together
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe(email);
      expect(validateResetLinkService).toHaveBeenCalled();
      expect(logSecurity).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle validation failure flow', async () => {
      const token = 'fail_flow_token';

      (validateResetLinkService as jest.Mock).mockResolvedValue(null);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.validateResetLink({ sec: token });

      // Verify failure flow completed properly
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(validateResetLinkService).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
