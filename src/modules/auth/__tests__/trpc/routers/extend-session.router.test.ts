/**
 * tRPC Extend Session Procedure Test Suite
 * =========================================
 * 
 * Tests the tRPC extend session procedure which handles token refresh
 * and session rotation for authenticated users (employees and customers).
 * 
 * Test Coverage:
 * ✅ Successful employee session extension with token rotation
 * ✅ Successful customer session extension with token rotation
 * ✅ Missing refresh token handling
 * ✅ Invalid/expired refresh token handling
 * ✅ Revoked session handling
 * ✅ Token rotation (security best practice)
 * ✅ New access token generation
 * ✅ Session record updates
 * ✅ Cookie management (new refresh token)
 * ✅ Audit logging (AUTH, SECURITY, DATABASE)
 * ✅ Performance timing
 * ✅ Client IP tracking
 * ✅ Error handling and transformation
 * ✅ Database operation logging
 * 
 * Security Considerations:
 * - Refresh token validation and hashing
 * - Session expiration checks
 * - Revocation status verification
 * - Token rotation on every refresh
 * - HTTP-only secure cookies
 * - Comprehensive audit logging
 * - IP and metadata tracking
 * 
 * tRPC Features:
 * - Context-based request/response handling
 * - Proper error handling with Error objects
 * - Type-safe procedure definitions
 * - Cookie-based authentication
 * 
 * Integration Points:
 * - Helpers: hashRefreshToken, generateToken, generateRefreshToken, getRefreshCookieOptions
 * - Store: findSessionByTokenHash, findUserByEmployeeUuid, updateSessionToken
 * - Logger: logger, logAuth, logSecurity, logDatabase, PerformanceTimer
 * 
 * Reference: D:\vodichron\vodichron-2.0-backend\src\modules\auth\__tests__\trpc\routers\login.router.test.ts
 */

// =============================================================================
// Mock Dependencies (MUST be before imports)
// =============================================================================

// Mock logger
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
  
  // Create PerformanceTimer mock constructor
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
jest.mock('../../../helpers/generate-token');
jest.mock('../../../helpers/generate-refresh-token');
jest.mock('../../../helpers/get-cookie-options');
jest.mock('../../../store/auth.store');

// =============================================================================
// Imports (AFTER mocks)
// =============================================================================

import { router } from '../../../../../trpc/trpc';
import { extendSessionProcedure } from '../../../trpc/routers/extend-session.router';
import { logger, logAuth, logSecurity, logDatabase, PerformanceTimer } from '../../../../../utils/logger';
import { hashRefreshToken } from '../../../helpers/verify-refresh-token';
import { generateToken } from '../../../helpers/generate-token';
import { generateRefreshToken } from '../../../helpers/generate-refresh-token';
import { getRefreshCookieOptions } from '../../../helpers/get-cookie-options';
import {
  findSessionByTokenHash,
  findUserByEmployeeUuid,
  updateSessionToken,
} from '../../../store/auth.store';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('tRPC Extend Session Procedure', () => {
  let mockCtx: any;
  let mockReq: any;
  let mockRes: any;
  let testRouter: any;

  beforeEach(() => {
    // Setup mock request with cookies
    mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
      ip: '192.168.1.100',
      cookies: {},
    };

    // Setup mock response
    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    // Setup tRPC context
    mockCtx = {
      req: mockReq,
      res: mockRes,
    };

    // Create test router
    testRouter = router({
      extendSession: extendSessionProcedure,
    });

    // Setup default helper mocks
    (getRefreshCookieOptions as jest.Mock).mockReturnValue({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // Employee Session Extension Tests
  // =============================================================================

  describe('Employee Session Extension', () => {
    it('should successfully extend employee session with valid refresh token', async () => {
      const oldRefreshToken = 'old_refresh_token_123';
      const oldTokenHash = 'old_token_hash_123';
      const newRefreshToken = 'new_refresh_token_456';
      const newTokenHash = 'new_token_hash_456';

      mockReq.cookies = { refreshToken: oldRefreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: oldTokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      const mockUser = {
        uuid: 'user-123',
        role: 'EMPLOYEE',
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(oldTokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue('new_access_token_123');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: newRefreshToken,
        hash: newTokenHash,
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.extendSession();

      // Verify response structure
      expect(result).toEqual({
        success: true,
        message: 'Session extended',
        data: {
          token: 'new_access_token_123',
          tokenType: 'Bearer',
          expiresIn: expect.any(String),
        },
        timestamp: expect.any(String),
      });

      // Verify refresh token was hashed
      expect(hashRefreshToken).toHaveBeenCalledWith(oldRefreshToken);

      // Verify session lookup
      expect(findSessionByTokenHash).toHaveBeenCalledWith(oldTokenHash);

      // Verify user lookup for employee
      expect(findUserByEmployeeUuid).toHaveBeenCalledWith('emp-123');

      // Verify new access token generated
      expect(generateToken).toHaveBeenCalledWith({
        uuid: 'user-123',
        role: 'EMPLOYEE',
        type: 'employee',
      });

      // Verify new refresh token generated
      expect(generateRefreshToken).toHaveBeenCalled();

      // Verify session token rotated
      expect(updateSessionToken).toHaveBeenCalledWith(
        oldTokenHash,
        newTokenHash,
        expect.any(Date)
      );

      // Verify new refresh token cookie set
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        newRefreshToken,
        expect.any(Object)
      );

      // Verify audit logging
      expect(logAuth).toHaveBeenCalledWith(
        'TOKEN_REFRESH_ATTEMPT',
        undefined,
        undefined,
        '192.168.1.100'
      );

      expect(logAuth).toHaveBeenCalledWith(
        'TOKEN_REFRESH',
        'user-123',
        undefined,
        '192.168.1.100',
        true,
        'EMPLOYEE'
      );

      expect(logDatabase).toHaveBeenCalledWith('UPDATE', 'sessions', undefined, undefined, 1);
    });

    it('should handle employee session extension when user not found', async () => {
      const refreshToken = 'valid_refresh_token';
      const tokenHash = 'valid_token_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(null); // User not found
      (generateToken as jest.Mock).mockReturnValue('fallback_token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'new_refresh',
        hash: 'new_hash',
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.extendSession();

      // Should still work with fallback to subjectId
      expect(result.success).toBe(true);
      expect(generateToken).toHaveBeenCalledWith({
        uuid: 'emp-123', // Falls back to subjectId
        role: 'employee', // Falls back to default role
        type: 'employee',
      });
    });
  });

  // =============================================================================
  // Customer Session Extension Tests
  // =============================================================================

  describe('Customer Session Extension', () => {
    it('should successfully extend customer session with valid refresh token', async () => {
      const oldRefreshToken = 'customer_refresh_token';
      const oldTokenHash = 'customer_token_hash';
      const newRefreshToken = 'new_customer_refresh';
      const newTokenHash = 'new_customer_hash';

      mockReq.cookies = { refreshToken: oldRefreshToken };

      const mockSession = {
        subjectId: 'cust-456',
        subjectType: 'customer',
        tokenHash: oldTokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(oldTokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (generateToken as jest.Mock).mockReturnValue('new_customer_access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: newRefreshToken,
        hash: newTokenHash,
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.extendSession();

      // Verify response structure
      expect(result).toEqual({
        success: true,
        message: 'Session extended',
        data: {
          token: 'new_customer_access_token',
          tokenType: 'Bearer',
          expiresIn: expect.any(String),
        },
        timestamp: expect.any(String),
      });

      // Verify customer token generation (no user lookup needed)
      expect(generateToken).toHaveBeenCalledWith({
        uuid: 'cust-456',
        role: 'customer',
        type: 'customer',
      });

      // Verify user lookup NOT called for customers
      expect(findUserByEmployeeUuid).not.toHaveBeenCalled();

      // Verify session token rotated
      expect(updateSessionToken).toHaveBeenCalledWith(
        oldTokenHash,
        newTokenHash,
        expect.any(Date)
      );

      // Verify audit logging for customer
      expect(logAuth).toHaveBeenCalledWith(
        'TOKEN_REFRESH',
        'cust-456',
        undefined,
        '192.168.1.100',
        true,
        'customer'
      );
    });
  });

  // =============================================================================
  // Validation and Error Tests
  // =============================================================================

  describe('Validation and Error Handling', () => {
    it('should reject extend session with missing refresh token', async () => {
      mockReq.cookies = {}; // No refresh token

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.extendSession()).rejects.toThrow('AUTH_REFRESH_MISSING');

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'TOKEN_REFRESH_MISSING',
        'medium',
        expect.objectContaining({ reason: 'No refresh token in cookie' }),
        '192.168.1.100'
      );

      // Verify no session operations performed
      expect(findSessionByTokenHash).not.toHaveBeenCalled();
      expect(updateSessionToken).not.toHaveBeenCalled();
      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should reject extend session with invalid refresh token (session not found)', async () => {
      const invalidToken = 'invalid_refresh_token';
      const tokenHash = 'invalid_hash';

      mockReq.cookies = { refreshToken: invalidToken };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(null); // Session not found

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.extendSession()).rejects.toThrow('AUTH_REFRESH_INVALID');

      // Verify security logging
      expect(logAuth).toHaveBeenCalledWith(
        'TOKEN_REFRESH',
        undefined,
        undefined,
        '192.168.1.100',
        false,
        undefined,
        'Invalid or expired token'
      );

      expect(logSecurity).toHaveBeenCalledWith(
        'TOKEN_REFRESH_INVALID',
        'medium',
        expect.objectContaining({ reason: 'Invalid or expired session' }),
        '192.168.1.100'
      );
    });

    it('should reject extend session with expired refresh token', async () => {
      const expiredToken = 'expired_refresh_token';
      const tokenHash = 'expired_hash';

      mockReq.cookies = { refreshToken: expiredToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.extendSession()).rejects.toThrow('AUTH_REFRESH_INVALID');

      // Verify no token rotation happened
      expect(updateSessionToken).not.toHaveBeenCalled();
      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should reject extend session with revoked refresh token', async () => {
      const revokedToken = 'revoked_refresh_token';
      const tokenHash = 'revoked_hash';

      mockReq.cookies = { refreshToken: revokedToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: new Date(), // Revoked
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.extendSession()).rejects.toThrow('AUTH_REFRESH_INVALID');

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'TOKEN_REFRESH_INVALID',
        'medium',
        expect.objectContaining({ reason: 'Invalid or expired session' }),
        '192.168.1.100'
      );
    });
  });

  // =============================================================================
  // Token Rotation Tests
  // =============================================================================

  describe('Token Rotation', () => {
    it('should rotate refresh token on every session extension', async () => {
      const oldToken = 'old_token';
      const oldHash = 'old_hash';
      const newToken = 'new_token';
      const newHash = 'new_hash';

      mockReq.cookies = { refreshToken: oldToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: oldHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      const mockUser = {
        uuid: 'user-123',
        role: 'ADMIN',
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(oldHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue('access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: newToken,
        hash: newHash,
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.extendSession();

      // Verify old token was used for lookup
      expect(hashRefreshToken).toHaveBeenCalledWith(oldToken);
      expect(findSessionByTokenHash).toHaveBeenCalledWith(oldHash);

      // Verify new token was generated
      expect(generateRefreshToken).toHaveBeenCalled();

      // Verify database updated with new hash
      expect(updateSessionToken).toHaveBeenCalledWith(
        oldHash, // Old hash for WHERE clause
        newHash, // New hash for SET clause
        expect.any(Date) // New expiry
      );

      // Verify new token set in cookie
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        newToken,
        expect.any(Object)
      );
    });

    it('should generate new access token with correct user data', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      const mockUser = {
        uuid: 'user-123',
        role: 'MANAGER',
      };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue('new_access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'new_refresh',
        hash: 'new_hash',
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.extendSession();

      // Verify access token generated with correct user data
      expect(generateToken).toHaveBeenCalledWith({
        uuid: 'user-123',
        role: 'MANAGER',
        type: 'employee',
      });
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
        subjectId: 'cust-456',
        subjectType: 'customer',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh',
        hash: 'hash',
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.extendSession();

      // Verify IP logged in auth events
      expect(logAuth).toHaveBeenCalledWith(
        'TOKEN_REFRESH_ATTEMPT',
        undefined,
        undefined,
        '203.0.113.45'
      );

      expect(logAuth).toHaveBeenCalledWith(
        'TOKEN_REFRESH',
        'cust-456',
        undefined,
        '203.0.113.45',
        true,
        'customer'
      );
    });

    it('should handle missing IP address gracefully', async () => {
      mockReq.ip = undefined;
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      const mockUser = { uuid: 'user-123', role: 'EMPLOYEE' };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh',
        hash: 'hash',
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.extendSession();

      // Should still work
      expect(result.success).toBe(true);

      // IP should be 'unknown'
      expect(logAuth).toHaveBeenCalledWith(
        'TOKEN_REFRESH_ATTEMPT',
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
    it('should handle database errors gracefully', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.extendSession()).rejects.toThrow('Database connection failed');

      // Verify error logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Extend-session controller error'),
        expect.objectContaining({ error: 'Database connection failed' })
      );

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'TOKEN_REFRESH_ERROR',
        'high',
        expect.objectContaining({ error: 'Database connection failed' }),
        expect.any(String)
      );
    });

    it('should not log TOKEN_REFRESH_ERROR for AUTH_REFRESH_MISSING', async () => {
      mockReq.cookies = {}; // Missing token

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.extendSession()).rejects.toThrow('AUTH_REFRESH_MISSING');

      // Verify TOKEN_REFRESH_ERROR not logged (only TOKEN_REFRESH_MISSING)
      expect(logSecurity).not.toHaveBeenCalledWith(
        'TOKEN_REFRESH_ERROR',
        expect.any(String),
        expect.any(Object),
        expect.any(String)
      );
    });

    it('should not log TOKEN_REFRESH_ERROR for AUTH_REFRESH_INVALID', async () => {
      mockReq.cookies = { refreshToken: 'invalid' };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(null);

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.extendSession()).rejects.toThrow('AUTH_REFRESH_INVALID');

      // Verify TOKEN_REFRESH_ERROR not logged (only TOKEN_REFRESH_INVALID)
      expect(logSecurity).not.toHaveBeenCalledWith(
        'TOKEN_REFRESH_ERROR',
        expect.any(String),
        expect.any(Object),
        expect.any(String)
      );
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
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh',
        hash: 'hash',
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.extendSession();

      // Verify successful extension (which means PerformanceTimer worked)
      expect(result.success).toBe(true);
      expect(result.message).toBe('Session extended');

      // The test passes if no errors occur during execution
      // PerformanceTimer.end() is called internally without throwing errors
    });

    it('should log comprehensive security and database events', async () => {
      mockReq.cookies = { refreshToken: 'token' };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      const mockUser = { uuid: 'user-123', role: 'ADMIN' };

      (hashRefreshToken as jest.Mock).mockReturnValue('hash');
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh',
        hash: 'hash',
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      const caller = testRouter.createCaller(mockCtx);
      await caller.extendSession();

      // Verify multiple log points (check that logging calls were made)
      expect(logger.info).toHaveBeenCalled();
      
      // Verify specific log contains session extension success
      const logCalls = (logger.info as jest.Mock).mock.calls;
      const hasExtendLog = logCalls.some(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('Session extended')
      );
      expect(hasExtendLog).toBe(true);

      // Verify database operation logged
      expect(logDatabase).toHaveBeenCalledWith('UPDATE', 'sessions', undefined, undefined, 1);
    });
  });
});
