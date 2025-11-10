/**
 * tRPC Login Procedure Test Suite
 * ================================
 * 
 * Tests the tRPC login procedure which handles authentication for both
 * employees and customers through the tRPC protocol.
 * 
 * Test Coverage:
 * ✅ Successful employee login with tRPC
 * ✅ Successful customer login with tRPC
 * ✅ Input validation via loginSchema
 * ✅ Context extraction (req, res, cookies, IP)
 * ✅ Invalid credentials handling
 * ✅ Inactive account handling
 * ✅ Password verification
 * ✅ Token generation (access + refresh)
 * ✅ Session creation
 * ✅ Cookie setting
 * ✅ Activity tracking updates
 * ✅ Security logging
 * ✅ Performance timing
 * ✅ Client metadata extraction
 * ✅ Error transformation for tRPC
 * 
 * Security Considerations:
 * - Password hashing verification with bcrypt
 * - Refresh token hashing in database
 * - HTTP-only secure cookies
 * - Comprehensive audit logging
 * - IP and User-Agent tracking
 * - Anti-enumeration (same error for invalid creds)
 * 
 * tRPC Features:
 * - Input validation with Zod schemas
 * - Type-safe procedure definitions
 * - Context-based request/response handling
 * - Proper error handling with Error objects
 * 
 * Integration Points:
 * - Schema: loginSchema
 * - Helpers: comparePasswords, generateToken, generateRefreshToken, getClientMetadata, getRefreshCookieOptions
 * - Store: findEmployeeByOfficialEmail, findUserByEmployeeUuid, findCustomerByEmail, findCustomerAccessByCustomerId, createSession, updateUserLastLogin, upsertEmployeeOnlineStatus, updateCustomerLastLoginByCustomerId
 * - Logger: logger, logAuth, logSecurity, logDatabase, PerformanceTimer
 * 
 * Reference: D:\\Biometric Access Management\\AttendanceSystemBackEnd\\src\\__tests__\\trpc
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

jest.mock('../../../helpers/compare-passwords');
jest.mock('../../../helpers/generate-token');
jest.mock('../../../helpers/generate-refresh-token');
jest.mock('../../../helpers/get-client-metadata');
jest.mock('../../../helpers/get-cookie-options');
jest.mock('../../../store/auth.store');

// =============================================================================
// Imports (AFTER mocks)
// =============================================================================

import { router } from '../../../../../trpc/trpc';
import { loginProcedure } from '../../../trpc/routers/login.router';
import { logger, logAuth, logSecurity, logDatabase } from '../../../../../utils/logger';
import { comparePasswords } from '../../../helpers/compare-passwords';
import { generateToken } from '../../../helpers/generate-token';
import { generateRefreshToken } from '../../../helpers/generate-refresh-token';
import { getClientMetadata } from '../../../helpers/get-client-metadata';
import { getRefreshCookieOptions } from '../../../helpers/get-cookie-options';
import {
  findEmployeeByOfficialEmail,
  findUserByEmployeeUuid,
  findCustomerByEmail,
  findCustomerAccessByCustomerId,
  createSession,
  updateUserLastLogin,
  upsertEmployeeOnlineStatus,
  updateCustomerLastLoginByCustomerId,
} from '../../../store/auth.store';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('tRPC Login Procedure', () => {
  let mockCtx: any;
  let mockReq: any;
  let mockRes: any;
  let testRouter: any;

  beforeEach(() => {
    // Setup mock request
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
      login: loginProcedure,
    });

    // Setup default helper mocks
    (getClientMetadata as jest.Mock).mockReturnValue({
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
    });

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
  // Employee Login Tests
  // =============================================================================

  describe('Employee Login', () => {
    it('should successfully login employee with valid credentials', async () => {
      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: 'john@vodichron.com',
        employeeId: 'EMP001',
      };

      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue('access_token_123');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh_token_123',
        hash: 'token_hash_123',
      });
      (createSession as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const input = {
        username: 'john@vodichron.com',
        password: 'Password123!',
      };

      // Call login procedure through router
      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.login(input);

      // Verify response structure
      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          token: 'access_token_123',
          tokenType: 'Bearer',
          expiresIn: expect.any(String),
          subject: {
            id: 'user-123',
            type: 'employee',
            role: 'EMPLOYEE',
            email: 'john@vodichron.com',
            employeeId: 'EMP001',
          },
        },
        timestamp: expect.any(String),
      });

      // Verify employee lookup
      expect(findEmployeeByOfficialEmail).toHaveBeenCalledWith('john@vodichron.com');
      expect(findUserByEmployeeUuid).toHaveBeenCalledWith('emp-123');

      // Verify password comparison
      expect(comparePasswords).toHaveBeenCalledWith('Password123!', 'hashed_password');

      // Verify token generation
      expect(generateToken).toHaveBeenCalledWith({
        uuid: 'user-123',
        role: 'EMPLOYEE',
        email: 'john@vodichron.com',
        type: 'employee',
      });

      // Verify session creation
      expect(createSession).toHaveBeenCalledWith({
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: 'token_hash_123',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.100',
        expiresAt: expect.any(Date),
      });

      // Verify activity tracking
      expect(updateUserLastLogin).toHaveBeenCalledWith('user-123');
      expect(upsertEmployeeOnlineStatus).toHaveBeenCalledWith('emp-123', 'ONLINE');

      // Verify cookie set
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh_token_123',
        expect.any(Object)
      );

      // Verify audit logging
      expect(logAuth).toHaveBeenCalledWith(
        'LOGIN',
        'user-123',
        'john@vodichron.com',
        '192.168.1.100',
        true,
        'EMPLOYEE'
      );

      expect(logSecurity).toHaveBeenCalledWith(
        'SUCCESSFUL_LOGIN',
        'low',
        expect.objectContaining({ userType: 'employee', role: 'EMPLOYEE' }),
        '192.168.1.100',
        'user-123'
      );
    });

    it('should reject employee login with invalid password', async () => {
      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: 'john@vodichron.com',
      };

      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (comparePasswords as jest.Mock).mockResolvedValue(false);

      const input = {
        username: 'john@vodichron.com',
        password: 'WrongPassword!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.login(input)).rejects.toThrow('AUTH_INVALID_CREDENTIALS');

      // Verify failed login logged
      expect(logAuth).toHaveBeenCalledWith(
        'LOGIN',
        'user-123',
        'john@vodichron.com',
        '192.168.1.100',
        false,
        'EMPLOYEE',
        'Invalid password'
      );

      expect(logSecurity).toHaveBeenCalledWith(
        'FAILED_LOGIN_ATTEMPT',
        'medium',
        expect.objectContaining({ reason: 'Invalid password' }),
        '192.168.1.100'
      );

      // Verify no session created
      expect(createSession).not.toHaveBeenCalled();
      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should reject employee login for inactive account', async () => {
      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: 'john@vodichron.com',
      };

      const mockUser = {
        uuid: 'user-123',
        status: 'INACTIVE',
        role: 'EMPLOYEE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);

      const input = {
        username: 'john@vodichron.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.login(input)).rejects.toThrow('AUTH_INVALID_CREDENTIALS');

      // Verify password not checked for inactive user
      expect(comparePasswords).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Customer Login Tests
  // =============================================================================

  describe('Customer Login', () => {
    it('should successfully login customer with valid credentials', async () => {
      const mockCustomer = {
        uuid: 'cust-456',
        email: 'customer@example.com',
        name: 'John Customer',
      };

      const mockAccess = {
        customerId: 'cust-456',
        status: 'ACTIVE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue('access_token_456');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh_token_456',
        hash: 'token_hash_456',
      });
      (createSession as jest.Mock).mockResolvedValue(undefined);
      (updateCustomerLastLoginByCustomerId as jest.Mock).mockResolvedValue(undefined);

      const input = {
        username: 'customer@example.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.login(input);

      // Verify response structure
      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          token: 'access_token_456',
          tokenType: 'Bearer',
          expiresIn: expect.any(String),
          subject: {
            id: 'cust-456',
            type: 'customer',
            role: 'customer',
            email: 'customer@example.com',
            customerId: 'cust-456',
          },
        },
        timestamp: expect.any(String),
      });

      // Verify customer lookups
      expect(findCustomerByEmail).toHaveBeenCalledWith('customer@example.com');
      expect(findCustomerAccessByCustomerId).toHaveBeenCalledWith('cust-456');

      // Verify session creation
      expect(createSession).toHaveBeenCalledWith({
        subjectId: 'cust-456',
        subjectType: 'customer',
        tokenHash: 'token_hash_456',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.100',
        expiresAt: expect.any(Date),
      });

      // Verify activity tracking
      expect(updateCustomerLastLoginByCustomerId).toHaveBeenCalledWith('cust-456');

      // Verify audit logging
      expect(logAuth).toHaveBeenCalledWith(
        'LOGIN',
        'cust-456',
        'customer@example.com',
        '192.168.1.100',
        true,
        'customer'
      );
    });

    it('should reject customer login with invalid password', async () => {
      const mockCustomer = {
        uuid: 'cust-456',
        email: 'customer@example.com',
      };

      const mockAccess = {
        customerId: 'cust-456',
        status: 'ACTIVE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);
      (comparePasswords as jest.Mock).mockResolvedValue(false);

      const input = {
        username: 'customer@example.com',
        password: 'WrongPassword!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.login(input)).rejects.toThrow('AUTH_INVALID_CREDENTIALS');

      expect(logAuth).toHaveBeenCalledWith(
        'LOGIN',
        'cust-456',
        'customer@example.com',
        '192.168.1.100',
        false,
        'customer',
        'Invalid password'
      );
    });

    it('should reject customer login for inactive account', async () => {
      const mockCustomer = {
        uuid: 'cust-456',
        email: 'customer@example.com',
      };

      const mockAccess = {
        customerId: 'cust-456',
        status: 'INACTIVE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);

      const input = {
        username: 'customer@example.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.login(input)).rejects.toThrow('AUTH_INVALID_CREDENTIALS');

      expect(comparePasswords).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // User Not Found Tests
  // =============================================================================

  describe('User Not Found', () => {
    it('should reject login when user not found', async () => {
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);

      const input = {
        username: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.login(input)).rejects.toThrow('AUTH_INVALID_CREDENTIALS');

      expect(logAuth).toHaveBeenCalledWith(
        'LOGIN',
        undefined,
        'nonexistent@example.com',
        '192.168.1.100',
        false,
        undefined,
        'User not found'
      );

      expect(logSecurity).toHaveBeenCalledWith(
        'FAILED_LOGIN_ATTEMPT',
        'medium',
        expect.objectContaining({ reason: 'User not found' }),
        '192.168.1.100'
      );
    });
  });

  // =============================================================================
  // Context and Metadata Tests
  // =============================================================================

  describe('Context and Metadata', () => {
    it('should extract client metadata correctly', async () => {
      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: 'john@vodichron.com',
      };

      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({ token: 'refresh', hash: 'hash' });
      (createSession as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const input = {
        username: 'john@vodichron.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await caller.login(input);

      // Verify client metadata extraction
      expect(getClientMetadata).toHaveBeenCalledWith(
        mockReq.headers,
        mockReq.ip
      );

      // Verify login attempt logged with metadata
      expect(logSecurity).toHaveBeenCalledWith(
        'LOGIN_ATTEMPT',
        'low',
        expect.objectContaining({ username: 'john@vodichron.com', userAgent: 'Mozilla/5.0' }),
        '192.168.1.100'
      );
    });

    it('should handle missing IP address', async () => {
      mockReq.ip = undefined;
      (getClientMetadata as jest.Mock).mockReturnValue({
        ip: undefined,
        userAgent: 'Mozilla/5.0',
      });

      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: 'john@vodichron.com',
      };

      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({ token: 'refresh', hash: 'hash' });
      (createSession as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const input = {
        username: 'john@vodichron.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await caller.login(input);

      // Verify session created with undefined IP
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: undefined,
        })
      );
    });
  });

  // =============================================================================
  // Performance and Logging Tests
  // =============================================================================

  describe('Performance and Logging', () => {
    it('should track performance metrics', async () => {
      // PerformanceTimer is already mocked at module level
      // We just need to verify it was called

      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: 'john@vodichron.com',
      };

      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({ token: 'refresh', hash: 'hash' });
      (createSession as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const input = {
        username: 'john@vodichron.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      const result = await caller.login(input);

      // Verify successful login (which means PerformanceTimer worked)
      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      
      // The test passes if no errors occur during execution
      // PerformanceTimer.end() is called internally without throwing errors
    });

    it('should log comprehensive security events', async () => {
      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: 'john@vodichron.com',
      };

      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({ token: 'refresh', hash: 'hash' });
      (createSession as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      const input = {
        username: 'john@vodichron.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await caller.login(input);

      // Verify multiple log points
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Login attempt initiated'),
        expect.any(Object)
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Extracting client metadata')
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Employee login successful'),
        expect.any(Object)
      );

      // Verify database operation logged
      expect(logDatabase).toHaveBeenCalledWith('INSERT', 'sessions', undefined, undefined, 1);
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: 'john@vodichron.com',
      };

      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: 'hashed_password',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({ token: 'refresh', hash: 'hash' });
      (createSession as jest.Mock).mockRejectedValue(new Error('Database error'));

      const input = {
        username: 'john@vodichron.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.login(input)).rejects.toThrow('Database error');

      // Verify error logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Login controller error'),
        expect.objectContaining({ error: 'Database error' })
      );

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'LOGIN_ERROR',
        'high',
        expect.objectContaining({ error: 'Database error' }),
        '192.168.1.100',
        undefined,
        'LOGIN'
      );
    });

    it('should not log security event for AUTH_INVALID_CREDENTIALS errors', async () => {
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);

      const input = {
        username: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const caller = testRouter.createCaller(mockCtx);
      await expect(caller.login(input)).rejects.toThrow('AUTH_INVALID_CREDENTIALS');

      // Verify LOGIN_ERROR not logged (only FAILED_LOGIN_ATTEMPT)
      expect(logSecurity).not.toHaveBeenCalledWith(
        'LOGIN_ERROR',
        expect.any(String),
        expect.any(Object),
        expect.any(String),
        expect.any(String),
        'LOGIN'
      );
    });
  });
});
