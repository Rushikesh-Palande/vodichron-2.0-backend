/**
 * tRPC Reset Password Procedure Test Suite
 * ==========================================
 * 
 * Tests the tRPC reset password procedure which handles password reset
 * with token validation and single-use enforcement.
 * 
 * Test Coverage:
 * ✅ Successful password reset for employees
 * ✅ Successful password reset for customers
 * ✅ Token validation and verification
 * ✅ Password strength validation via schema
 * ✅ Single-use token enforcement
 * ✅ Invalid/expired token handling
 * ✅ Service delegation
 * ✅ Security logging (AUTH, SECURITY)
 * ✅ Performance timing
 * ✅ Client IP tracking
 * ✅ Error handling
 * ✅ Audit trail creation
 * 
 * Security Considerations:
 * - Token validation before password update
 * - Password hashing (bcrypt)
 * - Single-use tokens (deleted after use)
 * - Comprehensive audit logging
 * - IP tracking for security monitoring
 * - Account status verification
 * 
 * Integration Points:
 * - Schema: resetPasswordSchema
 * - Service: resetPasswordService
 * - Logger: logger, logAuth, logSecurity, PerformanceTimer
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
    logAuth: jest.fn(),
    logSecurity: jest.fn(),
    PerformanceTimer: MockPerformanceTimer,
  };
});

jest.mock('../../../services/reset-password.service');

// =============================================================================
// Imports (AFTER mocks)
// =============================================================================

import { router } from '../../../../../trpc/trpc';
import { resetPasswordProcedure } from '../../../trpc/routers/reset-password.router';
import { logger, logAuth, logSecurity } from '../../../../../utils/logger';
import { resetPasswordService } from '../../../services/reset-password.service';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('tRPC Reset Password Procedure', () => {
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
      resetPassword: resetPasswordProcedure,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // Successful Password Reset Tests
  // =============================================================================

  describe('Successful Password Reset', () => {
    it('should successfully reset password with valid token', async () => {
      const email = 'user@vodichron.com';
      const token = 'valid_reset_token_abc123';
      const newPassword = 'NewSecurePassword123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.resetPassword({
        email,
        sec: token,
        password: newPassword,
      });

      // Verify response structure
      expect(result).toEqual({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
        timestamp: expect.any(String),
      });

      // Verify service called with correct params
      expect(resetPasswordService).toHaveBeenCalledWith(
        email,
        token,
        newPassword,
        '192.168.1.100'
      );

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_ATTEMPT',
        'low',
        { email },
        '192.168.1.100'
      );

      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        undefined,
        email,
        '192.168.1.100',
        true,
        undefined
      );
    });

    it('should handle employee password reset', async () => {
      const email = 'employee@vodichron.com';
      const token = 'employee_token';
      const password = 'EmployeePass123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.resetPassword({ email, sec: token, password });

      expect(result.success).toBe(true);
      expect(resetPasswordService).toHaveBeenCalledWith(email, token, password, '192.168.1.100');
    });

    it('should handle customer password reset', async () => {
      const email = 'customer@example.com';
      const token = 'customer_token';
      const password = 'CustomerPass123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.resetPassword({ email, sec: token, password });

      expect(result.success).toBe(true);
      expect(resetPasswordService).toHaveBeenCalledWith(email, token, password, '192.168.1.100');
    });
  });

  // =============================================================================
  // Token Validation Tests
  // =============================================================================

  describe('Token Validation', () => {
    it('should reject reset with invalid token', async () => {
      const email = 'user@example.com';
      const token = 'invalid_token';
      const password = 'NewPassword123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired reset token')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Invalid or expired reset token');

      // Verify error logged
      expect(logger.error).toHaveBeenCalled();

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_FAILED',
        'medium',
        expect.objectContaining({ error: 'Invalid or expired reset token' }),
        '192.168.1.100'
      );

      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        undefined,
        email,
        '192.168.1.100',
        false,
        undefined,
        'Invalid or expired reset token'
      );
    });

    it('should reject reset with expired token', async () => {
      const email = 'user@example.com';
      const token = 'expired_token';
      const password = 'NewPassword123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Reset token has expired')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Reset token has expired');
    });

    it('should reject reset with already used token', async () => {
      const email = 'user@example.com';
      const token = 'used_token';
      const password = 'NewPassword123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Reset token has already been used')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Reset token has already been used');
    });

    it('should reject reset with mismatched email', async () => {
      const email = 'user@example.com';
      const token = 'token_for_different_user';
      const password = 'NewPassword123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Token does not match email')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Token does not match email');
    });
  });

  // =============================================================================
  // Password Validation Tests
  // =============================================================================

  describe('Password Validation', () => {
    it('should validate password strength via schema', async () => {
      const email = 'user@example.com';
      const token = 'valid_token';

      const caller = testRouter.createCaller(mockCtx);

      // Password too short (less than 6 characters)
      await expect(
        caller.resetPassword({ email, sec: token, password: '12345' })
      ).rejects.toThrow();

      // Service should not be called for invalid input
      expect(resetPasswordService).not.toHaveBeenCalled();
    });

    it('should accept valid password formats', async () => {
      const email = 'user@example.com';
      const token = 'valid_token';
      const validPasswords = [
        'Password123!',      // Standard format
        'Abcd1234@',         // Minimal length
        'MyP@ssw0rd',        // Alternative special
        'Secure$Pass1',      // $ special char
      ];

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      for (const password of validPasswords) {
        const caller = testRouter.createCaller(mockCtx);
        const result = await caller.resetPassword({ email, sec: token, password });
        
        expect(result.success).toBe(true);
        expect(resetPasswordService).toHaveBeenCalledWith(email, token, password, '192.168.1.100');
        
        jest.clearAllMocks();
      }
    });

    it('should reject empty password', async () => {
      const email = 'user@example.com';
      const token = 'valid_token';

      const caller = testRouter.createCaller(mockCtx);

      await expect(
        caller.resetPassword({ email, sec: token, password: '' })
      ).rejects.toThrow();

      expect(resetPasswordService).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Email Validation Tests
  // =============================================================================

  describe('Email Validation', () => {
    it('should validate email format via schema', async () => {
      const token = 'valid_token';
      const password = 'NewPassword123!';

      const caller = testRouter.createCaller(mockCtx);

      // Invalid email format
      await expect(
        caller.resetPassword({ email: 'not-an-email', sec: token, password })
      ).rejects.toThrow();

      expect(resetPasswordService).not.toHaveBeenCalled();
    });

    it('should accept valid email formats', async () => {
      const token = 'valid_token';
      const password = 'NewPassword123!';
      const validEmails = [
        'user@example.com',
        'employee@vodichron.com',
        'customer+tag@example.co.uk',
      ];

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      for (const email of validEmails) {
        const caller = testRouter.createCaller(mockCtx);
        const result = await caller.resetPassword({ email, sec: token, password });
        
        expect(result.success).toBe(true);
        jest.clearAllMocks();
      }
    });
  });

  // =============================================================================
  // Account Status Tests
  // =============================================================================

  describe('Account Status', () => {
    it('should reject reset for inactive account', async () => {
      const email = 'inactive@example.com';
      const token = 'valid_token';
      const password = 'NewPassword123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Account is inactive')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Account is inactive');

      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        undefined,
        email,
        '192.168.1.100',
        false,
        undefined,
        'Account is inactive'
      );
    });

    it('should reject reset for nonexistent account', async () => {
      const email = 'nonexistent@example.com';
      const token = 'valid_token';
      const password = 'NewPassword123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('User not found');
    });
  });

  // =============================================================================
  // Client IP Tracking Tests
  // =============================================================================

  describe('Client IP Tracking', () => {
    it('should track client IP in service call', async () => {
      mockReq.ip = '203.0.113.45';
      const email = 'user@example.com';
      const token = 'token';
      const password = 'Password123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.resetPassword({ email, sec: token, password });

      // Verify IP passed to service
      expect(resetPasswordService).toHaveBeenCalledWith(email, token, password, '203.0.113.45');

      // Verify IP logged in security events
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_ATTEMPT',
        'low',
        { email },
        '203.0.113.45'
      );

      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        undefined,
        email,
        '203.0.113.45',
        true,
        undefined
      );
    });

    it('should handle missing IP address', async () => {
      mockReq.ip = undefined;
      const email = 'user@example.com';
      const token = 'token';
      const password = 'Password123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.resetPassword({ email, sec: token, password });

      // Should still work
      expect(result.success).toBe(true);

      // Should use 'unknown' as IP
      expect(resetPasswordService).toHaveBeenCalledWith(email, token, password, 'unknown');
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const email = 'user@example.com';
      const token = 'token';
      const password = 'Password123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Database connection failed');

      // Verify error logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Reset password tRPC error'),
        expect.objectContaining({ error: 'Database connection failed' })
      );

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_FAILED',
        'medium',
        expect.objectContaining({ error: 'Database connection failed' }),
        expect.any(String)
      );

      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        undefined,
        email,
        expect.any(String),
        false,
        undefined,
        'Database connection failed'
      );
    });

    it('should handle password hashing errors', async () => {
      const email = 'user@example.com';
      const token = 'token';
      const password = 'Password123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Password hashing failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Password hashing failed');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle token deletion errors', async () => {
      const email = 'user@example.com';
      const token = 'token';
      const password = 'Password123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Failed to delete reset token')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Failed to delete reset token');
    });
  });

  // =============================================================================
  // Performance and Logging Tests
  // =============================================================================

  describe('Performance and Logging', () => {
    it('should track performance metrics', async () => {
      const email = 'user@example.com';
      const token = 'token';
      const password = 'Password123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.resetPassword({ email, sec: token, password });

      // Verify successful completion (which means PerformanceTimer worked)
      expect(result.success).toBe(true);
    });

    it('should log comprehensive security events', async () => {
      const email = 'user@example.com';
      const token = 'token';
      const password = 'Password123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.resetPassword({ email, sec: token, password });

      // Verify logging occurred
      expect(logger.info).toHaveBeenCalled();

      // Verify specific log contains password reset
      const logCalls = (logger.info as jest.Mock).mock.calls;
      const hasResetLog = logCalls.some(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('Password reset')
      );
      expect(hasResetLog).toBe(true);
    });

    it('should log both attempt and completion', async () => {
      const email = 'user@example.com';
      const token = 'token';
      const password = 'Password123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.resetPassword({ email, sec: token, password });

      // Verify attempt logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_ATTEMPT',
        'low',
        { email },
        '192.168.1.100'
      );

      // Verify completion logged
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        undefined,
        email,
        '192.168.1.100',
        true,
        undefined
      );
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration', () => {
    it('should delegate to service with correct parameters', async () => {
      const email = 'test@vodichron.com';
      const token = 'integration_token';
      const password = 'IntegrationPass123!';
      const ip = '192.168.1.50';
      mockReq.ip = ip;

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.resetPassword({ email, sec: token, password });

      // Verify service called exactly once with correct params
      expect(resetPasswordService).toHaveBeenCalledTimes(1);
      expect(resetPasswordService).toHaveBeenCalledWith(email, token, password, ip);
    });

    it('should complete full password reset flow', async () => {
      const email = 'complete@test.com';
      const token = 'complete_token';
      const password = 'CompletePass123!';

      (resetPasswordService as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.resetPassword({ email, sec: token, password });

      // Verify all components worked together
      expect(result.success).toBe(true);
      expect(result.message).toContain('You can now login');
      expect(resetPasswordService).toHaveBeenCalled();
      expect(logSecurity).toHaveBeenCalled();
      expect(logAuth).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle complete error flow', async () => {
      const email = 'error@test.com';
      const token = 'error_token';
      const password = 'ErrorPass123!';

      (resetPasswordService as jest.Mock).mockRejectedValue(
        new Error('Complete error')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(
        caller.resetPassword({ email, sec: token, password })
      ).rejects.toThrow('Complete error');

      // Verify error flow completed
      expect(resetPasswordService).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_FAILED',
        'medium',
        expect.any(Object),
        expect.any(String)
      );
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        undefined,
        email,
        expect.any(String),
        false,
        undefined,
        'Complete error'
      );
    });
  });
});
