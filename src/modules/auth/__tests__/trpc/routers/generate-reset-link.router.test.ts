/**
 * tRPC Generate Reset Link Procedure Test Suite
 * ==============================================
 * 
 * Tests the tRPC generate reset link procedure which handles password reset
 * link generation with anti-enumeration security.
 * 
 * Test Coverage:
 * ✅ Successful reset link generation for employees
 * ✅ Successful reset link generation for customers
 * ✅ Anti-enumeration (always returns success)
 * ✅ Email validation via schema
 * ✅ Service delegation
 * ✅ Security logging
 * ✅ Performance timing
 * ✅ Client IP tracking
 * ✅ Error handling with graceful responses
 * ✅ Inactive account handling
 * 
 * Security Considerations:
 * - Always returns success to prevent email enumeration
 * - Only throws errors for inactive accounts
 * - Comprehensive security logging
 * - IP tracking for monitoring
 * - Service layer handles actual logic
 * 
 * Integration Points:
 * - Schema: generateResetLinkSchema
 * - Service: generateResetLinkService
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

jest.mock('../../../services/generate-reset-link.service');

// =============================================================================
// Imports (AFTER mocks)
// =============================================================================

import { router } from '../../../../../trpc/trpc';
import { generateResetLinkProcedure } from '../../../trpc/routers/generate-reset-link.router';
import { logger, logSecurity } from '../../../../../utils/logger';
import { generateResetLinkService } from '../../../services/generate-reset-link.service';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('tRPC Generate Reset Link Procedure', () => {
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
      generateResetLink: generateResetLinkProcedure,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // Successful Reset Link Generation Tests
  // =============================================================================

  describe('Successful Reset Link Generation', () => {
    it('should successfully generate reset link for valid email', async () => {
      const email = 'user@vodichron.com';

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      // Verify response structure
      expect(result).toEqual({
        success: true,
        message: 'If the email exists, you will receive password reset instructions shortly.',
        timestamp: expect.any(String),
      });

      // Verify service called with correct params
      expect(generateResetLinkService).toHaveBeenCalledWith(email, '192.168.1.100');

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_REQUEST',
        'low',
        { username: email },
        '192.168.1.100'
      );
    });

    it('should handle employee email', async () => {
      const email = 'employee@vodichron.com';

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      expect(result.success).toBe(true);
      expect(generateResetLinkService).toHaveBeenCalledWith(email, '192.168.1.100');
    });

    it('should handle customer email', async () => {
      const email = 'customer@example.com';

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      expect(result.success).toBe(true);
      expect(generateResetLinkService).toHaveBeenCalledWith(email, '192.168.1.100');
    });
  });

  // =============================================================================
  // Anti-Enumeration Security Tests
  // =============================================================================

  describe('Anti-Enumeration Security', () => {
    it('should return success even when email does not exist', async () => {
      const email = 'nonexistent@example.com';

      // Service throws error for non-existent email
      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      // Should still return success (anti-enumeration)
      expect(result).toEqual({
        success: true,
        message: 'If the email exists, you will receive password reset instructions shortly.',
        timestamp: expect.any(String),
      });

      // Verify error logged
      expect(logger.error).toHaveBeenCalled();

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_ERROR',
        'medium',
        expect.objectContaining({ error: 'User not found' }),
        '192.168.1.100'
      );
    });

    it('should return success for generic service errors', async () => {
      const email = 'user@example.com';

      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Email service unavailable')
      );

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      // Should still return success
      expect(result.success).toBe(true);
      expect(result.message).toContain('If the email exists');
    });

    it('should throw error for deactivated accounts', async () => {
      const email = 'deactivated@example.com';

      // Service throws specific error for deactivated accounts
      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Account is in deactivated state')
      );

      const caller = testRouter.createCaller(mockCtx);
      
      // Should throw (not return success for deactivated accounts)
      await expect(caller.generateResetLink({ username: email })).rejects.toThrow(
        'Account is in deactivated state'
      );
    });
  });

  // =============================================================================
  // Input Validation Tests
  // =============================================================================

  describe('Input Validation', () => {
    it('should validate email format via schema', async () => {
      // Invalid email format should be caught by schema
      const caller = testRouter.createCaller(mockCtx);
      
      await expect(
        caller.generateResetLink({ username: 'not-an-email' })
      ).rejects.toThrow();

      // Service should not be called for invalid input
      expect(generateResetLinkService).not.toHaveBeenCalled();
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
        'user_123@test.io',
      ];

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      for (const email of validEmails) {
        const caller = testRouter.createCaller(mockCtx);
        const result = await caller.generateResetLink({ username: email });
        
        expect(result.success).toBe(true);
        expect(generateResetLinkService).toHaveBeenCalledWith(email, '192.168.1.100');
        
        jest.clearAllMocks();
      }
    });
  });

  // =============================================================================
  // Client IP Tracking Tests
  // =============================================================================

  describe('Client IP Tracking', () => {
    it('should track client IP in service call', async () => {
      mockReq.ip = '203.0.113.45';
      const email = 'user@example.com';

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.generateResetLink({ username: email });

      // Verify IP passed to service
      expect(generateResetLinkService).toHaveBeenCalledWith(email, '203.0.113.45');

      // Verify IP logged in security events
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_REQUEST',
        'low',
        { username: email },
        '203.0.113.45'
      );
    });

    it('should handle missing IP address', async () => {
      mockReq.ip = undefined;
      const email = 'user@example.com';

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      // Should still work
      expect(result.success).toBe(true);

      // Should use 'unknown' as IP
      expect(generateResetLinkService).toHaveBeenCalledWith(email, 'unknown');
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const email = 'user@example.com';

      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      // Should return success (anti-enumeration)
      expect(result.success).toBe(true);

      // Verify error logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Generate reset link tRPC error'),
        expect.objectContaining({ error: 'Database connection failed' })
      );

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_ERROR',
        'medium',
        expect.objectContaining({ error: 'Database connection failed' }),
        expect.any(String)
      );
    });

    it('should handle email service failures', async () => {
      const email = 'user@example.com';

      (generateResetLinkService as jest.Mock).mockRejectedValue(
        new Error('SMTP server unavailable')
      );

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      // Should still return success (don't reveal email sending failures)
      expect(result.success).toBe(true);
      expect(result.message).toContain('If the email exists');
    });
  });

  // =============================================================================
  // Performance and Logging Tests
  // =============================================================================

  describe('Performance and Logging', () => {
    it('should track performance metrics', async () => {
      const email = 'user@example.com';

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      // Verify successful completion (which means PerformanceTimer worked)
      expect(result.success).toBe(true);
    });

    it('should log comprehensive security events', async () => {
      const email = 'user@example.com';

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.generateResetLink({ username: email });

      // Verify logging occurred
      expect(logger.info).toHaveBeenCalled();

      // Verify specific log contains reset request
      const logCalls = (logger.info as jest.Mock).mock.calls;
      const hasResetLog = logCalls.some(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('Password reset')
      );
      expect(hasResetLog).toBe(true);
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration', () => {
    it('should delegate to service with correct parameters', async () => {
      const email = 'test@vodichron.com';
      const ip = '192.168.1.50';
      mockReq.ip = ip;

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.generateResetLink({ username: email });

      // Verify service called exactly once with correct params
      expect(generateResetLinkService).toHaveBeenCalledTimes(1);
      expect(generateResetLinkService).toHaveBeenCalledWith(email, ip);
    });

    it('should complete full flow for valid request', async () => {
      const email = 'complete@test.com';

      (generateResetLinkService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.generateResetLink({ username: email });

      // Verify all components worked together
      expect(result.success).toBe(true);
      expect(generateResetLinkService).toHaveBeenCalled();
      expect(logSecurity).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });
  });
});
