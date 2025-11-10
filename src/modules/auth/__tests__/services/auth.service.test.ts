/**
 * Auth Service Test Suite
 * ========================
 * 
 * Tests the main authentication service functions: handleLogin, handleExtendSession,
 * and handleLogout. These are critical business logic functions that orchestrate
 * the entire authentication workflow, coordinating between helpers, store operations,
 * and HTTP responses.
 * 
 * Test Coverage:
 * ✅ Employee login flow (credentials → tokens → session creation)
 * ✅ Customer login flow (separate authentication path)
 * ✅ Login input validation (missing credentials)
 * ✅ User existence validation (employee and customer lookups)
 * ✅ Password verification (bcrypt comparison)
 * ✅ Account status checks (ACTIVE vs INACTIVE)
 * ✅ Access token generation (JWT)
 * ✅ Refresh token generation and storage
 * ✅ Session creation with client metadata (IP, user agent)
 * ✅ Last login timestamp updates
 * ✅ Employee online status management (ONLINE/OFFLINE)
 * ✅ Session extension with valid refresh tokens
 * ✅ Token rotation on session extension (security best practice)
 * ✅ Refresh token validation (expiry, revocation)
 * ✅ Logout flow with session revocation
 * ✅ Cookie management (set, clear)
 * ✅ Error handling and graceful degradation
 * ✅ Security audit logging
 * ✅ Client metadata capture for forensics
 * ✅ Anti-enumeration error messages
 * 
 * Security Considerations:
 * - No plaintext passwords logged anywhere
 * - Consistent error messages prevent user enumeration
 * - Failed login attempts are logged for monitoring
 * - Proper session lifecycle management (creation → extension → revocation)
 * - Token rotation on every session extension
 * - Refresh tokens are single-use via rotation
 * - Client metadata captured for audit trails
 * - Expired/revoked sessions properly rejected
 * - httpOnly secure cookies for refresh tokens
 * - Different authentication paths for employees vs customers
 * 
 * Business Logic Flow:
 * Login: Credentials → Validation → Password Check → Status Check → Token Generation → Session Creation → Response
 * Extend: Refresh Token → Validation → Token Rotation → New Access Token → Response
 * Logout: Refresh Token → Session Revocation → Online Status Update → Cookie Clear → Response
 * 
 * Integration Points:
 * - Helpers: comparePasswords, generateToken, generateRefreshToken, getClientMetadata, hashRefreshToken
 * - Store: All auth.store functions for database operations
 * - Models: Employee, User, Customer, CustomerAccess, Session, OnlineStatus
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\services
 */

import { handleLogin, handleExtendSession, handleLogout } from '../../services/auth.service';
import { logger } from '../../../../utils/logger';
import { comparePasswords } from '../../helpers/compare-passwords';
import { generateToken } from '../../helpers/generate-token';
import { generateRefreshToken } from '../../helpers/generate-refresh-token';
import { getClientMetadata } from '../../helpers/get-client-metadata';
import { hashRefreshToken } from '../../helpers/verify-refresh-token';
import { getRefreshCookieOptions } from '../../helpers/get-cookie-options';
import {
  findEmployeeByOfficialEmail,
  findCustomerByEmail,
  findUserByEmployeeUuid,
  findCustomerAccessByCustomerId,
  updateUserLastLogin,
  updateCustomerLastLoginByCustomerId,
  upsertEmployeeOnlineStatus,
  createSession,
  findSessionByTokenHash,
  revokeSessionByTokenHash,
  updateSessionToken,
} from '../../store/auth.store';

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
  
  // Set up chaining after initialization
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

// Mock helpers
jest.mock('../../helpers/compare-passwords');
jest.mock('../../helpers/generate-token');
jest.mock('../../helpers/generate-refresh-token');
jest.mock('../../helpers/get-client-metadata');
jest.mock('../../helpers/verify-refresh-token');
jest.mock('../../helpers/get-cookie-options', () => ({
  getRefreshCookieOptions: jest.fn(() => ({
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: '/api/auth',
  })),
}));

// Mock store
jest.mock('../../store/auth.store');

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Auth Service', () => {
  let mockReq: any;
  let mockRes: any;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Mocks
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // Setup request mock
    mockReq = {
      body: {},
      headers: {
        'user-agent': 'Test Browser',
      },
      ip: '127.0.0.1',
      cookies: {},
    };

    // Setup response mock
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    // Setup logger spies
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    // Setup default mocks
    (getClientMetadata as jest.Mock).mockReturnValue({
      ip: '127.0.0.1',
      userAgent: 'Test Browser',
    });
    
    // Re-setup getRefreshCookieOptions mock after clearAllMocks
    (getRefreshCookieOptions as jest.Mock).mockReturnValue({
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/api/auth',
    });

    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // handleLogin - Employee Flow Tests
  // =============================================================================

  describe('handleLogin - Employee Flow', () => {
    /**
     * Test Case: Successful Employee Login
     * -------------------------------------
     * Verifies complete employee login flow from credentials to token issuance.
     * 
     * Steps:
     * 1. Employee enters email and password
     * 2. System finds employee record
     * 3. System finds associated user record (ACTIVE)
     * 4. Password is verified
     * 5. Last login timestamp updated
     * 6. Online status set to ONLINE
     * 7. Access token generated
     * 8. Refresh token generated and stored
     * 9. Tokens returned to client
     */
    it('should successfully login employee with valid credentials', async () => {
      logger.info('🧪 Test: Successful employee login');

      // Step 1: Setup test data
      logger.info('🔄 Step 1: Setting up employee test data...');
      const testEmail = 'employee@vodichron.com';
      const testPassword = 'ValidPassword123!';
      
      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: testEmail,
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        uuid: 'user-123',
        employeeId: 'emp-123',
        password: 'hashed_password',
        role: 'ADMIN',
        status: 'ACTIVE',
      };

      // Step 2: Mock database responses
      logger.info('🔄 Step 2: Mocking database responses...');
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);
      (createSession as jest.Mock).mockResolvedValue(undefined);

      // Step 3: Mock token generation
      logger.info('🔄 Step 3: Mocking token generation...');
      (generateToken as jest.Mock).mockReturnValue('mock_access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'mock_refresh_token',
        hash: 'mock_token_hash',
      });

      // Step 4: Execute login
      logger.info('🔄 Step 4: Executing login request...');
      mockReq.body = { username: testEmail, password: testPassword };
      await handleLogin(mockReq, mockRes);

      // Step 5: Verify response
      logger.info('✅ Step 5: Verifying success response...');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          data: expect.objectContaining({
            token: 'mock_access_token',
            tokenType: 'Bearer',
            subject: expect.objectContaining({
              id: 'user-123',
              type: 'employee',
              role: 'ADMIN',
            }),
          }),
        })
      );

      // Step 6: Verify database operations
      logger.info('✅ Step 6: Verifying database operations...');
      expect(findEmployeeByOfficialEmail).toHaveBeenCalledWith(testEmail);
      expect(findUserByEmployeeUuid).toHaveBeenCalledWith('emp-123');
      expect(comparePasswords).toHaveBeenCalledWith(testPassword, 'hashed_password');
      expect(updateUserLastLogin).toHaveBeenCalledWith('user-123');
      expect(upsertEmployeeOnlineStatus).toHaveBeenCalledWith('emp-123', 'ONLINE');

      // Step 7: Verify session creation
      logger.info('✅ Step 7: Verifying session creation...');
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId: 'emp-123',
          subjectType: 'employee',
          tokenHash: 'mock_token_hash',
        })
      );

      // Step 8: Verify refresh token cookie
      logger.info('✅ Step 8: Verifying refresh token cookie...');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock_refresh_token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/api/auth',
        })
      );

      // Step 9: Verify logging
      logger.info('✅ Step 9: Verifying audit logging...');
      expect(infoSpy).toHaveBeenCalled();
      expect(wasLogged(infoSpy, 'Login attempt')).toBe(true);

      logger.info('✅ Employee login flow completed successfully');
    });

    /**
     * Test Case: Employee Login with Inactive Account
     * ------------------------------------------------
     * Verifies that inactive employee accounts cannot login.
     */
    it('should reject login for inactive employee account', async () => {
      logger.info('🧪 Test: Inactive employee account rejection');

      // Step 1: Setup inactive employee
      logger.info('🔄 Step 1: Setting up inactive employee...');
      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'inactive@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'INACTIVE', password: 'hash', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);

      // Step 2: Attempt login
      logger.info('🔄 Step 2: Attempting login with inactive account...');
      mockReq.body = { username: 'inactive@vodichron.com', password: 'Password123!' };
      await handleLogin(mockReq, mockRes);

      // Step 3: Verify rejection
      logger.info('✅ Step 3: Verifying rejection response...');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Incorrect email or password.',
          }),
        })
      );

      // Step 4: Verify no session created
      logger.info('✅ Step 4: Verifying no session was created...');
      expect(createSession).not.toHaveBeenCalled();
      expect(mockRes.cookie).not.toHaveBeenCalled();

      // Step 5: Verify warning logged
      logger.info('✅ Step 5: Verifying warning logged...');
      expect(warnSpy).toHaveBeenCalled();
      expect(wasLogged(warnSpy, 'Login failed')).toBe(true);

      logger.info('✅ Inactive account properly rejected');
    });

    /**
     * Test Case: Employee Login with Wrong Password
     * ----------------------------------------------
     * Verifies password validation works correctly.
     */
    it('should reject login with incorrect password', async () => {
      logger.info('🧪 Test: Incorrect password rejection');

      // Step 1: Setup valid employee with wrong password attempt
      logger.info('🔄 Step 1: Setting up employee with wrong password...');
      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'employee@vodichron.com' };
      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        password: 'correct_hash',
        role: 'EMPLOYEE',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (comparePasswords as jest.Mock).mockResolvedValue(false); // Password mismatch

      // Step 2: Attempt login
      logger.info('🔄 Step 2: Attempting login with wrong password...');
      mockReq.body = { username: 'employee@vodichron.com', password: 'WrongPassword!' };
      await handleLogin(mockReq, mockRes);

      // Step 3: Verify rejection
      logger.info('✅ Step 3: Verifying rejection...');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Incorrect email or password.',
          }),
        })
      );

      // Step 4: Verify no tokens issued
      logger.info('✅ Step 4: Verifying no tokens issued...');
      expect(createSession).not.toHaveBeenCalled();
      expect(updateUserLastLogin).not.toHaveBeenCalled();

      logger.info('✅ Wrong password properly rejected');
    });
  });

  // =============================================================================
  // handleLogin - Customer Flow Tests
  // =============================================================================

  describe('handleLogin - Customer Flow', () => {
    /**
     * Test Case: Successful Customer Login
     * -------------------------------------
     * Verifies complete customer login flow.
     */
    it('should successfully login customer with valid credentials', async () => {
      logger.info('🧪 Test: Successful customer login');

      // Step 1: Setup customer test data
      logger.info('🔄 Step 1: Setting up customer test data...');
      const testEmail = 'customer@example.com';
      const testPassword = 'CustomerPass123!';

      const mockCustomer = {
        uuid: 'cust-456',
        email: testEmail,
        name: 'Jane Customer',
      };

      const mockAccess = {
        customerId: 'cust-456',
        password: 'hashed_password',
        status: 'ACTIVE',
      };

      // Step 2: Mock database responses
      logger.info('🔄 Step 2: Mocking database responses...');
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null); // Not employee
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (updateCustomerLastLoginByCustomerId as jest.Mock).mockResolvedValue(undefined);
      (createSession as jest.Mock).mockResolvedValue(undefined);

      // Step 3: Mock tokens
      logger.info('🔄 Step 3: Mocking token generation...');
      (generateToken as jest.Mock).mockReturnValue('customer_access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'customer_refresh_token',
        hash: 'customer_token_hash',
      });

      // Step 4: Execute login
      logger.info('🔄 Step 4: Executing customer login...');
      mockReq.body = { username: testEmail, password: testPassword };
      await handleLogin(mockReq, mockRes);

      // Step 5: Verify response
      logger.info('✅ Step 5: Verifying success response...');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          data: expect.objectContaining({
            token: 'customer_access_token',
            subject: expect.objectContaining({
              id: 'cust-456',
              type: 'customer',
              role: 'customer',
            }),
          }),
        })
      );

      // Step 6: Verify database operations
      logger.info('✅ Step 6: Verifying database operations...');
      expect(findCustomerByEmail).toHaveBeenCalledWith(testEmail);
      expect(findCustomerAccessByCustomerId).toHaveBeenCalledWith('cust-456');
      expect(updateCustomerLastLoginByCustomerId).toHaveBeenCalledWith('cust-456');

      // Step 7: Verify session creation
      logger.info('✅ Step 7: Verifying session creation...');
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId: 'cust-456',
          subjectType: 'customer',
          tokenHash: 'customer_token_hash',
        })
      );

      logger.info('✅ Customer login flow completed successfully');
    });

    /**
     * Test Case: Customer Login with Inactive Access
     * -----------------------------------------------
     * Verifies inactive customer accounts are rejected.
     */
    it('should reject login for inactive customer account', async () => {
      logger.info('🧪 Test: Inactive customer account rejection');

      // Setup inactive customer
      const mockCustomer = { uuid: 'cust-456', email: 'inactive-customer@example.com' };
      const mockAccess = { customerId: 'cust-456', status: 'INACTIVE', password: 'hash' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);

      // Attempt login
      mockReq.body = { username: 'inactive-customer@example.com', password: 'Password123!' };
      await handleLogin(mockReq, mockRes);

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(createSession).not.toHaveBeenCalled();

      logger.info('✅ Inactive customer properly rejected');
    });
  });

  // =============================================================================
  // handleLogin - Validation Tests
  // =============================================================================

  describe('handleLogin - Validation', () => {
    /**
     * Test Case: Missing Credentials
     * -------------------------------
     * Verifies that login requests require both username and password.
     */
    it('should reject login with missing username', async () => {
      logger.info('🧪 Test: Missing username validation');

      // Attempt login without username
      mockReq.body = { password: 'Password123!' };
      await handleLogin(mockReq, mockRes);

      // Verify validation error
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'username and password are required',
          code: 'AUTH_MISSING_CREDENTIALS',
        })
      );

      // Verify warning logged
      expect(warnSpy).toHaveBeenCalled();
      expect(wasLogged(warnSpy, 'Login missing credentials')).toBe(true);

      logger.info('✅ Missing username properly validated');
    });

    it('should reject login with missing password', async () => {
      logger.info('🧪 Test: Missing password validation');

      // Attempt login without password
      mockReq.body = { username: 'user@example.com' };
      await handleLogin(mockReq, mockRes);

      // Verify validation error
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'AUTH_MISSING_CREDENTIALS',
        })
      );

      logger.info('✅ Missing password properly validated');
    });

    /**
     * Test Case: Non-existent User
     * -----------------------------
     * Verifies consistent error message for non-existent users (prevents enumeration).
     */
    it('should reject login for non-existent user without revealing user existence', async () => {
      logger.info('🧪 Test: Non-existent user handling (anti-enumeration)');

      // Mock no user found
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);

      // Attempt login
      mockReq.body = { username: 'nonexistent@example.com', password: 'Password123!' };
      await handleLogin(mockReq, mockRes);

      // Verify generic error message (doesn't reveal user doesn't exist)
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Incorrect email or password.',
          code: 'AUTH_INVALID_CREDENTIALS',
        })
      );

      logger.info('✅ User enumeration prevented with generic error');
    });
  });

  // =============================================================================
  // handleExtendSession Tests
  // =============================================================================

  describe('handleExtendSession', () => {
    /**
     * Test Case: Successful Employee Session Extension
     * -------------------------------------------------
     * Verifies refresh token rotation and new access token issuance.
     */
    it('should successfully extend employee session with valid refresh token', async () => {
      logger.info('🧪 Test: Successful employee session extension');

      // Step 1: Setup existing session
      logger.info('🔄 Step 1: Setting up existing session...');
      const refreshToken = 'existing_refresh_token';
      const tokenHash = 'existing_token_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      const mockUser = {
        uuid: 'user-123',
        role: 'ADMIN',
      };

      // Step 2: Mock database and helpers
      logger.info('🔄 Step 2: Mocking session lookup...');
      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (generateToken as jest.Mock).mockReturnValue('new_access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'new_refresh_token',
        hash: 'new_token_hash',
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      // Step 3: Execute session extension
      logger.info('🔄 Step 3: Extending session...');
      await handleExtendSession(mockReq, mockRes);

      // Step 4: Verify new tokens issued
      logger.info('✅ Step 4: Verifying new tokens issued...');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Session extended',
          data: expect.objectContaining({
            token: 'new_access_token',
          }),
        })
      );

      // Step 5: Verify token rotation
      logger.info('✅ Step 5: Verifying token rotation...');
      expect(updateSessionToken).toHaveBeenCalledWith(
        tokenHash,
        'new_token_hash',
        expect.any(Date)
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new_refresh_token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/api/auth',
        })
      );

      logger.info('✅ Session extension completed with token rotation');
    });

    /**
     * Test Case: Successful Customer Session Extension
     * -------------------------------------------------
     * Verifies customer session extension works correctly.
     */
    it('should successfully extend customer session', async () => {
      logger.info('🧪 Test: Customer session extension');

      // Setup customer session
      const refreshToken = 'customer_refresh_token';
      const tokenHash = 'customer_token_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'cust-456',
        subjectType: 'customer',
        tokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (generateToken as jest.Mock).mockReturnValue('new_customer_access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'new_customer_refresh_token',
        hash: 'new_customer_hash',
      });
      (updateSessionToken as jest.Mock).mockResolvedValue(undefined);

      // Execute extension
      await handleExtendSession(mockReq, mockRes);

      // Verify success
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(updateSessionToken).toHaveBeenCalled();

      logger.info('✅ Customer session extended successfully');
    });

    /**
     * Test Case: Missing Refresh Token
     * ---------------------------------
     * Verifies rejection when no refresh token provided.
     */
    it('should reject session extension with missing refresh token', async () => {
      logger.info('🧪 Test: Missing refresh token rejection');

      // No refresh token in cookies
      mockReq.cookies = {};

      await handleExtendSession(mockReq, mockRes);

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Missing refresh token',
          code: 'AUTH_REFRESH_MISSING',
        })
      );

      logger.info('✅ Missing token properly rejected');
    });

    /**
     * Test Case: Expired Refresh Token
     * ---------------------------------
     * Verifies rejection of expired sessions.
     */
    it('should reject session extension with expired refresh token', async () => {
      logger.info('🧪 Test: Expired refresh token rejection');

      // Setup expired session
      const refreshToken = 'expired_refresh_token';
      const tokenHash = 'expired_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);

      // Execute extension
      await handleExtendSession(mockReq, mockRes);

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid or expired refresh token',
          code: 'AUTH_REFRESH_INVALID',
        })
      );

      logger.info('✅ Expired token properly rejected');
    });

    /**
     * Test Case: Revoked Refresh Token
     * ---------------------------------
     * Verifies rejection of revoked sessions.
     */
    it('should reject session extension with revoked refresh token', async () => {
      logger.info('🧪 Test: Revoked refresh token rejection');

      // Setup revoked session
      const refreshToken = 'revoked_refresh_token';
      const tokenHash = 'revoked_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: new Date(), // Revoked
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);

      // Execute extension
      await handleExtendSession(mockReq, mockRes);

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_REFRESH_INVALID',
        })
      );

      logger.info('✅ Revoked token properly rejected');
    });
  });

  // =============================================================================
  // handleLogout Tests
  // =============================================================================

  describe('handleLogout', () => {
    /**
     * Test Case: Successful Employee Logout
     * --------------------------------------
     * Verifies complete logout flow: session revocation, online status update.
     */
    it('should successfully logout employee', async () => {
      logger.info('🧪 Test: Successful employee logout');

      // Step 1: Setup active session
      logger.info('🔄 Step 1: Setting up active employee session...');
      const refreshToken = 'employee_refresh_token';
      const tokenHash = 'employee_token_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: tokenHash,
        revokedAt: null,
      };

      const mockUser = { uuid: 'user-123' };

      // Step 2: Mock database operations
      logger.info('🔄 Step 2: Mocking database operations...');
      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);

      // Step 3: Execute logout
      logger.info('🔄 Step 3: Executing logout...');
      await handleLogout(mockReq, mockRes);

      // Step 4: Verify session revocation
      logger.info('✅ Step 4: Verifying session revocation...');
      expect(revokeSessionByTokenHash).toHaveBeenCalledWith(tokenHash);

      // Step 5: Verify online status update
      logger.info('✅ Step 5: Verifying online status update...');
      expect(upsertEmployeeOnlineStatus).toHaveBeenCalledWith('emp-123', 'OFFLINE');

      // Step 6: Verify cookie cleared
      logger.info('✅ Step 6: Verifying cookie cleared...');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));

      // Step 7: Verify success response
      logger.info('✅ Step 7: Verifying success response...');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout successful',
          data: { cleared: true },
        })
      );

      logger.info('✅ Employee logout completed successfully');
    });

    /**
     * Test Case: Successful Customer Logout
     * --------------------------------------
     * Verifies customer logout flow.
     */
    it('should successfully logout customer', async () => {
      logger.info('🧪 Test: Successful customer logout');

      // Setup customer session
      const refreshToken = 'customer_refresh_token';
      const tokenHash = 'customer_token_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'cust-456',
        subjectType: 'customer',
        tokenHash: tokenHash,
        revokedAt: null,
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);
      (revokeSessionByTokenHash as jest.Mock).mockResolvedValue(undefined);
      (updateCustomerLastLoginByCustomerId as jest.Mock).mockResolvedValue(undefined);

      // Execute logout
      await handleLogout(mockReq, mockRes);

      // Verify customer-specific operations
      expect(revokeSessionByTokenHash).toHaveBeenCalledWith(tokenHash);
      expect(updateCustomerLastLoginByCustomerId).toHaveBeenCalledWith('cust-456');
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);

      logger.info('✅ Customer logout completed successfully');
    });

    /**
     * Test Case: Logout without Refresh Token
     * ----------------------------------------
     * Verifies graceful handling when no token present.
     */
    it('should handle logout without refresh token gracefully', async () => {
      logger.info('🧪 Test: Logout without refresh token');

      // No refresh token
      mockReq.cookies = {};

      // Execute logout
      await handleLogout(mockReq, mockRes);

      // Verify graceful handling
      expect(revokeSessionByTokenHash).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout successful',
        })
      );

      logger.info('✅ Logout without token handled gracefully');
    });

    /**
     * Test Case: Logout with Already Revoked Session
     * -----------------------------------------------
     * Verifies handling of already revoked sessions.
     */
    it('should handle logout with already revoked session', async () => {
      logger.info('🧪 Test: Logout with already revoked session');

      // Setup revoked session
      const refreshToken = 'revoked_refresh_token';
      const tokenHash = 'revoked_hash';

      mockReq.cookies = { refreshToken };

      const mockSession = {
        subjectId: 'emp-123',
        subjectType: 'employee',
        tokenHash: tokenHash,
        revokedAt: new Date(), // Already revoked
      };

      (hashRefreshToken as jest.Mock).mockReturnValue(tokenHash);
      (findSessionByTokenHash as jest.Mock).mockResolvedValue(mockSession);

      // Execute logout
      await handleLogout(mockReq, mockRes);

      // Verify no additional revocation attempt
      expect(revokeSessionByTokenHash).not.toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);

      logger.info('✅ Already revoked session handled properly');
    });
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  describe('Security Features', () => {
    /**
     * Test Case: Client Metadata Logging
     * -----------------------------------
     * Verifies IP and user agent are captured for audit trails.
     */
    it('should capture and use client metadata for audit logging', async () => {
      logger.info('🧪 Test: Client metadata capture');

      // Setup login with specific headers
      mockReq.headers = {
        'user-agent': 'Mozilla/5.0 Test Browser',
        'x-forwarded-for': '192.168.1.100',
      };
      mockReq.ip = '10.0.0.1';

      (getClientMetadata as jest.Mock).mockReturnValue({
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
      });

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = {
        uuid: 'user-123',
        status: 'ACTIVE',
        password: 'hash',
        role: 'EMPLOYEE',
      };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (comparePasswords as jest.Mock).mockResolvedValue(true);
      (updateUserLastLogin as jest.Mock).mockResolvedValue(undefined);
      (upsertEmployeeOnlineStatus as jest.Mock).mockResolvedValue(undefined);
      (createSession as jest.Mock).mockResolvedValue(undefined);
      (generateToken as jest.Mock).mockReturnValue('token');
      (generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh',
        hash: 'hash',
      });

      // Execute login
      mockReq.body = { username: 'user@vodichron.com', password: 'Password123!' };
      await handleLogin(mockReq, mockRes);

      // Verify metadata was extracted
      expect(getClientMetadata).toHaveBeenCalledWith(
        mockReq.headers,
        mockReq.ip
      );

      // Verify session created with metadata
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'Mozilla/5.0 Test Browser',
          ipAddress: '192.168.1.100',
        })
      );

      logger.info('✅ Client metadata properly captured and logged');
    });

    /**
     * Test Case: Consistent Error Messages
     * -------------------------------------
     * Verifies error messages don't leak information.
     */
    it('should return consistent error messages to prevent user enumeration', async () => {
      logger.info('🧪 Test: Consistent error messages (anti-enumeration)');

      // Test 1: Non-existent user
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);

      mockReq.body = { username: 'nonexistent@example.com', password: 'Password123!' };
      await handleLogin(mockReq, mockRes);

      const errorResponse1 = mockRes.json.mock.calls[0][0];

      // Test 2: Wrong password
      jest.clearAllMocks();
      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'real@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', password: 'hash', role: 'ADMIN' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (comparePasswords as jest.Mock).mockResolvedValue(false);

      mockReq.body = { username: 'real@vodichron.com', password: 'WrongPassword!' };
      await handleLogin(mockReq, mockRes);

      const errorResponse2 = mockRes.json.mock.calls[0][0];

      // Extract error messages from both responses (handles both {message} and {error: {message}} formats)
      const error1Message = errorResponse1.message || errorResponse1.error?.message;
      const error2Message = errorResponse2.message || errorResponse2.error?.message;

      // Both errors should have same message
      expect(error1Message).toBe(error2Message);
      expect(error1Message).toBe('Incorrect email or password.');
      expect(error2Message).toBe('Incorrect email or password.');

      logger.info('✅ Error messages are consistent (prevents enumeration)');
    });
  });
});
