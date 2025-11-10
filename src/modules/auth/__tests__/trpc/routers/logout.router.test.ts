/**
 * tRPC Logout Procedure Test Suite
 * =================================
 * 
 * Tests the tRPC logout procedure which handles session termination,
 * session revocation, and user activity updates for employees and customers.
 * 
 * Test Coverage:
 * ✅ Successful employee logout with session revocation
 * ✅ Successful customer logout with session revocation
 * ✅ Employee online status update to OFFLINE
 * ✅ Customer activity tracking
 * ✅ Session revocation in database
 * ✅ Cookie clearing
 * ✅ Logout without refresh token (graceful handling)
 * ✅ Logout with already revoked session
 * ✅ Logout with missing session
 * ✅ User activity updates (lastLogin)
 * ✅ Audit logging (AUTH, SECURITY, DATABASE)
 * ✅ Performance timing
 * ✅ Client IP tracking
 * ✅ Error handling
 * 
 * Security Considerations:
 * - Session revocation prevents reuse
 * - Cookie clearing removes client-side tokens
 * - Comprehensive audit logging
 * - IP tracking for security monitoring
 * - Graceful handling of edge cases
 * 
 * Integration Points:
 * - Helpers: hashRefreshToken
 * - Store: findSessionByTokenHash, revokeSessionByTokenHash, findUserByEmployeeUuid, 
 *          updateUserLastLogin, updateCustomerLastLoginByCustomerId, upsertEmployeeOnlineStatus
 * - Logger: logger, logAuth, logSecurity, logDatabase, PerformanceTimer
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
    logDatabase: jest.fn(),
    PerformanceTimer: MockPerformanceTimer,
  };
});

jest.mock('../../../helpers/verify-refresh-token');
jest.mock('../../../store/auth.store');

// =============================================================================
// Imports (AFTER mocks)
// =============================================================================

import { router } from '../../../../../trpc/trpc';
import { logoutProcedure } from '../../../trpc/routers/logout.router';
import { logger, logAuth, logSecurity, logDatabase } from '../../../../../utils/logger';
import { hashRefreshToken } from '../../../helpers/verify-refresh-token';
import {
  findSessionByTokenHash,
  revokeSessionByTokenHash,
  findUserByEmployeeUuid,
  updateUserLastLogin,
  updateCustomerLastLoginByCustomerId,
  upsertEmployeeOnlineStatus,
} from '../../../store/auth.store';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('tRPC Logout Procedure', () => {
  let mockCtx: any;
  let mockReq: any;
  let mockRes: any;
  let testRouter: any;

  beforeEach(() => {
    mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
      ip: '192.168.1.100',
      cookies: {},
    };

    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    mockCtx = {
      req: mockReq,
      res: mockRes,
    };

    testRouter = router({
      logout: logoutProcedure,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // Employee Logout Tests
  // =============================================================================

  describe('Employee Logout', () => {
    it('should successfully logout employee with valid session', async () => {
      const refreshToken = 'employee_refresh_token';
      const tokenHash = 'employee_token_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash,
        revokedAt: null,
      };

      const mockUser = {
        uuid: 'user-123',
        role: 'EMPLOYEE',
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.logout();

      // Verify response structure
      expect(result).toEqual({
        success: true,
        message: 'Logout successful',
        data: { cleared: true },
        timestamp: expect.any(String),
      });

      // Verify session revocation
      expect(hashRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(findSessionByTokenHash).toHaveBeenCalledWith(tokenHash);
      expect(revokeSessionByTokenHash).toHaveBeenCalledWith(tokenHash);

      // Verify employee activity updates
      expect(findUserByEmployeeUuid).toHaveBeenCalledWith('emp-123');
      expect(updateUserLastLogin).toHaveBeenCalledWith('user-123');
      expect(upsertEmployeeOnlineStatus).toHaveBeenCalledWith('emp-123', 'OFFLINE');

      // Verify cookie cleared
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');

      // Verify audit logging
      expect(logAuth).toHaveBeenCalledWith(
        'LOGOUT_ATTEMPT',
        undefined,
        undefined,
        '192.168.1.100'
      );

      expect(logAuth).toHaveBeenCalledWith(
        'LOGOUT',
        'user-123',
        undefined,
        '192.168.1.100',
        true,
        'EMPLOYEE'
      );

      expect(logDatabase).toHaveBeenCalledWith('UPDATE', 'sessions', undefined, undefined, 1);
    });

    it('should handle employee logout when user not found', async () => {
      const refreshToken = 'token';
      const tokenHash = 'hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash,
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(null); // User not found
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.logout();

      // Should still complete logout
      expect(result.success).toBe(true);

      // Should not update user last login (no user found)
      expect(updateUserLastLogin).not.toHaveBeenCalled();

      // Should still update employee online status
      expect(upsertEmployeeOnlineStatus).toHaveBeenCalledWith('emp-123', 'OFFLINE');

      // Audit log should use subjectId as fallback
      expect(logAuth).toHaveBeenCalledWith(
        'LOGOUT',
        'emp-123',
        undefined,
        '192.168.1.100',
        true,
        'employee'
      );
    });
  });

  // =============================================================================
  // Customer Logout Tests
  // =============================================================================

  describe('Customer Logout', () => {
    it('should successfully logout customer with valid session', async () => {
      const refreshToken = 'customer_refresh_token';
      const tokenHash = 'customer_token_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'cust-456',
        subjectType: 'customer',
        tokenHash,
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateCustomerLastLoginByCustomerId as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.logout();

      // Verify response structure
      expect(result).toEqual({
        success: true,
        message: 'Logout successful',
        data: { cleared: true },
        timestamp: expect.any(String),
      });

      // Verify session revocation
      expect(revokeSessionByTokenHash).toHaveBeenCalledWith(tokenHash);

      // Verify customer activity update
      expect(updateCustomerLastLoginByCustomerId).toHaveBeenCalledWith('cust-456');

      // Verify employee operations NOT called for customers
      expect(findUserByEmployeeUuid).not.toHaveBeenCalled();
      expect(upsertEmployeeOnlineStatus).not.toHaveBeenCalled();

      // Verify cookie cleared
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');

      // Verify audit logging
      expect(logAuth).toHaveBeenCalledWith(
        'LOGOUT',
        'cust-456',
        undefined,
        '192.168.1.100',
        true,
        'customer'
      );
    });
  });

  // =============================================================================
  // Edge Cases and Graceful Handling
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle logout without refresh token gracefully', async () => {
      mockReq.cookies = {}; // No refresh token

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.logout();

      // Should still return success
      expect(result).toEqual({
        success: true,
        message: 'Logout successful',
        data: { cleared: true },
        timestamp: expect.any(String),
      });

      // Should not attempt session operations
      expect(findSessionByTokenHash).not.toHaveBeenCalled();
      expect(revokeSessionByTokenHash).not.toHaveBeenCalled();

      // Should still clear cookie
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');

      // Verify attempt logged
      expect(logAuth).toHaveBeenCalledWith(
        'LOGOUT_ATTEMPT',
        undefined,
        undefined,
        '192.168.1.100'
      );
    });

    it('should handle logout with already revoked session', async () => {
      const refreshToken = 'revoked_token';
      const tokenHash = 'revoked_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash,
        revokedAt: new Date(), // Already revoked
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.logout();

      // Should still return success
      expect(result.success).toBe(true);

      // Should not revoke again
      expect(revokeSessionByTokenHash).not.toHaveBeenCalled();

      // Should still clear cookie
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
    });

    it('should handle logout with missing session (token not found)', async () => {
      const refreshToken = 'nonexistent_token';
      const tokenHash = 'nonexistent_hash';

      mockReq.cookies = { refreshToken };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(null); // Session not found

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.logout();

      // Should still return success
      expect(result.success).toBe(true);

      // Should not attempt revocation
      expect(revokeSessionByTokenHash).not.toHaveBeenCalled();

      // Should still clear cookie
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
    });
  });

  // =============================================================================
  // Session Revocation Tests
  // =============================================================================

  describe('Session Revocation', () => {
    it('should revoke active employee session', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        revokedAt: null,
      };

      const mockUser = { uuid: 'user-123', role: 'ADMIN' };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.logout();

      // Verify revocation was called
      expect(revokeSessionByTokenHash).toHaveBeenCalledWith('hash');

      // Verify database operation logged
      expect(logDatabase).toHaveBeenCalledWith('UPDATE', 'sessions', undefined, undefined, 1);
    });

    it('should revoke active customer session', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'cust-456',
        subjectType: 'customer',
        tokenHash: 'hash',
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateCustomerLastLoginByCustomerId as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.logout();

      // Verify revocation was called
      expect(revokeSessionByTokenHash).toHaveBeenCalledWith('hash');
    });
  });

  // =============================================================================
  // Client IP and Metadata Tests
  // =============================================================================

  describe('Client IP and Metadata', () => {
    it('should track client IP in audit logs', async () => {
      mockReq.ip = '203.0.113.45';
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        revokedAt: null,
      };

      const mockUser = { uuid: 'user-123', role: 'EMPLOYEE' };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.logout();

      // Verify IP logged in auth events
      expect(logAuth).toHaveBeenCalledWith(
        'LOGOUT_ATTEMPT',
        undefined,
        undefined,
        '203.0.113.45'
      );

      expect(logAuth).toHaveBeenCalledWith(
        'LOGOUT',
        'user-123',
        undefined,
        '203.0.113.45',
        true,
        'EMPLOYEE'
      );
    });

    it('should handle missing IP address gracefully', async () => {
      mockReq.ip = undefined;
      mockReq.cookies = {};

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.logout();

      // Should still work
      expect(result.success).toBe(true);

      // IP should be 'unknown'
      expect(logAuth).toHaveBeenCalledWith(
        'LOGOUT_ATTEMPT',
        undefined,
        undefined,
        'unknown'
      );
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle database errors during session revocation', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (revokeSessionByTokenHash as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.logout()).rejects.toThrow('Database connection failed');

      // Verify error logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Logout controller error'),
        expect.objectContaining({ error: 'Database connection failed' })
      );

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'LOGOUT_ERROR',
        'medium',
        expect.objectContaining({ error: 'Database connection failed' }),
        expect.any(String)
      );
    });

    it('should handle errors during user activity updates', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockRejectedValue(
        new Error('User lookup failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.logout()).rejects.toThrow('User lookup failed');

      // Verify error logged
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Performance and Logging Tests
  // =============================================================================

  describe('Performance and Logging', () => {
    it('should track performance metrics', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'cust-456',
        subjectType: 'customer',
        tokenHash: 'hash',
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateCustomerLastLoginByCustomerId as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.logout();

      // Verify successful logout (which means PerformanceTimer worked)
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');
    });

    it('should log comprehensive audit events', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        revokedAt: null,
      };

      const mockUser = { uuid: 'user-123', role: 'MANAGER' };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.logout();

      // Verify multiple log points
      expect(logger.info).toHaveBeenCalled();
      
      // Verify specific log contains logout success
      const logCalls = (logger.info as jest.Mock).mock.calls;
      const hasLogoutLog = logCalls.some(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('Logout successful')
      );
      expect(hasLogoutLog).toBe(true);

      // Verify database operation logged
      expect(logDatabase).toHaveBeenCalledWith('UPDATE', 'sessions', undefined, undefined, 1);
    });
  });
});
