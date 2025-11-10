/**
 * Reset Password Service Test Suite
 * ===================================
 * 
 * Tests the resetPasswordService function which handles the complete password
 * reset workflow after a user clicks the reset link. This is the final step
 * in the password recovery process that actually updates the user's password.
 * 
 * Test Coverage:
 * ✅ Employee password reset flow (token → validation → update → cleanup)
 * ✅ Customer password reset flow (separate path)
 * ✅ Token validation and expiration checks
 * ✅ Email-token matching verification
 * ✅ User existence validation
 * ✅ Account status checks (ACTIVE required)
 * ✅ Password hashing before storage
 * ✅ Database password update operations
 * ✅ Single-use token enforcement (deletion after use)
 * ✅ Invalid token error handling
 * ✅ Email mismatch detection (security)
 * ✅ Inactive account error handling
 * ✅ Password update failure handling
 * ✅ Database error handling
 * ✅ Security audit logging
 * ✅ Client IP tracking
 * 
 * Security Considerations:
 * - Token validated before any password changes
 * - Email must match token email (prevents token hijacking)
 * - Only ACTIVE accounts can reset passwords
 * - Passwords hashed with bcrypt before storage
 * - Tokens deleted after use (single-use enforcement)
 * - All attempts logged with IP for audit trails
 * - Failed attempts logged at appropriate severity
 * - No plaintext passwords in logs
 * - User-facing errors for validation failures
 * - Technical errors re-thrown for controller handling
 * 
 * Business Logic Flow:
 * Reset: Email + Token + NewPassword → Validate Token → Check Email Match → Verify User → Check Status → Hash Password → Update DB → Delete Token → Success
 * 
 * Integration Points:
 * - Store: findPasswordResetByToken, deletePasswordResetRequest, findEmployeeByOfficialEmail, findCustomerByEmail, findUserByEmployeeUuid, findCustomerAccessByCustomerId, updateUserPasswordByEmail, updateCustomerPasswordByEmail
 * - Helpers: hashPassword
 * - Logger: logger, logAuth, logSecurity
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\services
 */

import { resetPasswordService } from '../../services/reset-password.service';
import { logger, logAuth, logSecurity } from '../../../../utils/logger';
import {
  findEmployeeByOfficialEmail,
  findCustomerByEmail,
  findUserByEmployeeUuid,
  findCustomerAccessByCustomerId,
} from '../../store/auth.store';
import {
  findPasswordResetByToken,
  deletePasswordResetRequest,
  updateUserPasswordByEmail,
  updateCustomerPasswordByEmail,
} from '../../store/password-reset.store';
import { hashPassword } from '../../helpers/hash-password.helper';

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

// Mock store functions
jest.mock('../../store/auth.store');
jest.mock('../../store/password-reset.store');

// Mock helpers
jest.mock('../../helpers/hash-password.helper');

// Mock config for database
jest.mock('../../../../config', () => ({
  config: {
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

describe('Reset Password Service', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Mocks
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    // Setup logger spies
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

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
  // Employee Password Reset Flow Tests
  // =============================================================================

  describe('Employee Password Reset Flow', () => {
    /**
     * Test Case: Successful Employee Password Reset
     * ---------------------------------------------
     * Verifies complete employee password reset from token to completion.
     * 
     * Steps:
     * 1. Valid reset token exists
     * 2. Email matches token
     * 3. Employee exists
     * 4. User account is ACTIVE
     * 5. Password is hashed
     * 6. Password updated in database
     * 7. Token deleted (single-use)
     * 8. Success returned
     */
    it('should successfully reset password for employee', async () => {
      logger.info('🧪 Test: Successful employee password reset');

      // Step 1: Setup test data
      logger.info('🔄 Step 1: Setting up test data...');
      const testEmail = 'employee@vodichron.com';
      const testToken = 'encrypted_valid_token';
      const testPassword = 'NewSecurePassword123!';
      const testIp = '192.168.1.100';

      const mockResetRequest = {
        uuid: 'reset-001',
        email: testEmail,
        token: testToken,
        createdAt: new Date(),
      };

      const mockEmployee = {
        uuid: 'emp-123',
        officialEmailId: testEmail,
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        uuid: 'user-123',
        employeeId: 'emp-123',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
      };

      // Step 2: Mock all dependencies
      logger.info('🔄 Step 2: Mocking dependencies...');
      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed_new_password');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(1); // 1 row affected
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      // Step 3: Execute password reset
      logger.info('🔄 Step 3: Executing password reset...');
      const result = await resetPasswordService(testEmail, testToken, testPassword, testIp);

      // Step 4: Verify success
      logger.info('✅ Step 4: Verifying success...');
      expect(result).toBe(true);

      // Step 5: Verify token validation
      logger.info('✅ Step 5: Verifying token validation...');
      expect(findPasswordResetByToken).toHaveBeenCalledWith(testToken);

      // Step 6: Verify employee lookup
      logger.info('✅ Step 6: Verifying employee lookup...');
      expect(findEmployeeByOfficialEmail).toHaveBeenCalledWith(testEmail);
      expect(findUserByEmployeeUuid).toHaveBeenCalledWith('emp-123');

      // Step 7: Verify password hashing
      logger.info('✅ Step 7: Verifying password hashing...');
      expect(hashPassword).toHaveBeenCalledWith(testPassword);

      // Step 8: Verify password update
      logger.info('✅ Step 8: Verifying password update...');
      expect(updateUserPasswordByEmail).toHaveBeenCalledWith(testEmail, 'hashed_new_password');

      // Step 9: Verify token deletion
      logger.info('✅ Step 9: Verifying token deletion...');
      expect(deletePasswordResetRequest).toHaveBeenCalledWith(testEmail);

      // Step 10: Verify audit logging
      logger.info('✅ Step 10: Verifying audit logging...');
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        'emp-123',
        testEmail,
        testIp,
        true,
        'EMPLOYEE'
      );
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_SUCCESS',
        'low',
        expect.objectContaining({ email: testEmail, userType: 'employee' }),
        testIp,
        'emp-123'
      );

      logger.info('✅ Employee password reset completed successfully');
    });

    /**
     * Test Case: Inactive Employee Account
     * ------------------------------------
     * Verifies that inactive employees cannot reset passwords.
     */
    it('should throw error for inactive employee account', async () => {
      logger.info('🧪 Test: Inactive employee account');

      const testEmail = 'inactive@vodichron.com';
      const testToken = 'valid_token';
      const mockResetRequest = { uuid: 'reset-002', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'INACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);

      // Attempt reset
      await expect(
        resetPasswordService(testEmail, testToken, 'NewPassword123!', '127.0.0.1')
      ).rejects.toThrow('Your account is in deactivated state, contact HR to activate the account.');

      // Verify no password update
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updateUserPasswordByEmail).not.toHaveBeenCalled();
      expect(deletePasswordResetRequest).not.toHaveBeenCalled();

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_INACTIVE_ACCOUNT',
        'medium',
        expect.any(Object),
        '127.0.0.1'
      );

      logger.info('✅ Inactive employee properly rejected');
    });
  });

  // =============================================================================
  // Customer Password Reset Flow Tests
  // =============================================================================

  describe('Customer Password Reset Flow', () => {
    /**
     * Test Case: Successful Customer Password Reset
     * ---------------------------------------------
     * Verifies complete customer password reset flow.
     */
    it('should successfully reset password for customer', async () => {
      logger.info('🧪 Test: Successful customer password reset');

      const testEmail = 'customer@example.com';
      const testToken = 'customer_token';
      const testPassword = 'NewPassword456!';
      const testIp = '10.0.0.1';

      const mockResetRequest = { uuid: 'reset-003', email: testEmail, token: testToken, createdAt: new Date() };
      const mockCustomer = { uuid: 'cust-456', email: testEmail, name: 'Jane Customer' };
      const mockAccess = { customerId: 'cust-456', status: 'ACTIVE', password: 'old_hash' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);
      (hashPassword as jest.Mock).mockResolvedValue('hashed_customer_password');
      (updateCustomerPasswordByEmail as jest.Mock).mockResolvedValue(1);
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      // Execute reset
      const result = await resetPasswordService(testEmail, testToken, testPassword, testIp);

      // Verify success
      expect(result).toBe(true);

      // Verify customer lookups
      expect(findCustomerByEmail).toHaveBeenCalledWith(testEmail);
      expect(findCustomerAccessByCustomerId).toHaveBeenCalledWith('cust-456');

      // Verify password update
      expect(updateCustomerPasswordByEmail).toHaveBeenCalledWith(testEmail, 'hashed_customer_password');

      // Verify token deleted
      expect(deletePasswordResetRequest).toHaveBeenCalledWith(testEmail);

      // Verify audit logging
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        'cust-456',
        testEmail,
        testIp,
        true,
        'customer'
      );

      logger.info('✅ Customer password reset completed successfully');
    });

    /**
     * Test Case: Inactive Customer Account
     * ------------------------------------
     * Verifies that customers without active access cannot reset passwords.
     */
    it('should throw error for inactive customer account', async () => {
      logger.info('🧪 Test: Inactive customer account');

      const testEmail = 'inactive-customer@example.com';
      const testToken = 'valid_token';
      const mockResetRequest = { uuid: 'reset-004', email: testEmail, token: testToken, createdAt: new Date() };
      const mockCustomer = { uuid: 'cust-456', email: testEmail };
      const mockAccess = { customerId: 'cust-456', status: 'INACTIVE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);

      // Attempt reset
      await expect(
        resetPasswordService(testEmail, testToken, 'NewPassword123!')
      ).rejects.toThrow('Your account is in deactivated state, contact HR to activate the account.');

      // Verify no password update
      expect(updateCustomerPasswordByEmail).not.toHaveBeenCalled();

      logger.info('✅ Inactive customer properly rejected');
    });
  });

  // =============================================================================
  // Token Validation Tests
  // =============================================================================

  describe('Token Validation', () => {
    /**
     * Test Case: Invalid/Expired Token
     * --------------------------------
     * Verifies that invalid or expired tokens are rejected.
     */
    it('should throw error for invalid or expired token', async () => {
      logger.info('🧪 Test: Invalid token rejection');

      const testEmail = 'user@example.com';
      const invalidToken = 'invalid_or_expired_token';

      // Mock no reset request found (expired/invalid)
      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);

      // Attempt reset
      await expect(
        resetPasswordService(testEmail, invalidToken, 'NewPassword123!', '127.0.0.1')
      ).rejects.toThrow('Looks like your reset link is expired.');

      // Verify no further processing
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updateUserPasswordByEmail).not.toHaveBeenCalled();
      expect(updateCustomerPasswordByEmail).not.toHaveBeenCalled();

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_INVALID_TOKEN',
        'medium',
        expect.objectContaining({ email: testEmail }),
        '127.0.0.1'
      );

      logger.info('✅ Invalid token properly rejected');
    });

    /**
     * Test Case: Email Mismatch with Token
     * ------------------------------------
     * Verifies that email must match the email in the token.
     * 
     * Security: Critical to prevent token hijacking.
     */
    it('should throw error when email does not match token', async () => {
      logger.info('🧪 Test: Email mismatch detection');

      const tokenEmail = 'correct@vodichron.com';
      const providedEmail = 'wrong@vodichron.com';
      const testToken = 'valid_token';

      const mockResetRequest = {
        uuid: 'reset-005',
        email: tokenEmail,
        token: testToken,
        createdAt: new Date(),
      };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);

      // Attempt reset with wrong email
      await expect(
        resetPasswordService(providedEmail, testToken, 'NewPassword123!', '127.0.0.1')
      ).rejects.toThrow('Invalid reset request.');

      // Verify high-severity security log
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_EMAIL_MISMATCH',
        'high', // High severity for potential attack
        expect.objectContaining({
          tokenEmail,
          providedEmail,
        }),
        '127.0.0.1'
      );

      // Verify no password update
      expect(hashPassword).not.toHaveBeenCalled();

      logger.info('✅ Email mismatch properly detected and rejected');
    });

    /**
     * Test Case: User Not Found After Token Validation
     * -----------------------------------------------
     * Verifies handling when token is valid but user doesn't exist.
     */
    it('should throw error when user not found', async () => {
      logger.info('🧪 Test: User not found after token validation');

      const testEmail = 'nonexistent@example.com';
      const testToken = 'valid_token';
      const mockResetRequest = { uuid: 'reset-006', email: testEmail, token: testToken, createdAt: new Date() };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);

      // Attempt reset
      await expect(
        resetPasswordService(testEmail, testToken, 'NewPassword123!')
      ).rejects.toThrow('User not found.');

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_USER_NOT_FOUND',
        'medium',
        expect.objectContaining({ email: testEmail }),
        undefined
      );

      logger.info('✅ User not found properly handled');
    });
  });

  // =============================================================================
  // Password Hashing Tests
  // =============================================================================

  describe('Password Hashing', () => {
    /**
     * Test Case: Password Hashed Before Storage
     * -----------------------------------------
     * Verifies that plaintext password is hashed before database update.
     */
    it('should hash password before storing in database', async () => {
      logger.info('🧪 Test: Password hashing before storage');

      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const plaintextPassword = 'PlainTextPassword123!';
      const hashedPassword = '$2b$10$hashed_password_value';

      const mockResetRequest = { uuid: 'reset-007', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(1);
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      await resetPasswordService(testEmail, testToken, plaintextPassword);

      // Verify plaintext password passed to hash function
      expect(hashPassword).toHaveBeenCalledWith(plaintextPassword);

      // Verify hashed password (not plaintext) stored in database
      expect(updateUserPasswordByEmail).toHaveBeenCalledWith(testEmail, hashedPassword);
      expect(updateUserPasswordByEmail).not.toHaveBeenCalledWith(testEmail, plaintextPassword);

      logger.info('✅ Password properly hashed before storage');
    });

    /**
     * Test Case: No Plaintext Password in Logs
     * ----------------------------------------
     * Verifies that plaintext passwords are never logged.
     * 
     * Security: Critical for GDPR and security compliance.
     */
    it('should never log plaintext password', async () => {
      logger.info('🧪 Test: Plaintext password not logged');

      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const secretPassword = 'SuperSecretPassword123!';

      const mockResetRequest = { uuid: 'reset-008', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(1);
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      await resetPasswordService(testEmail, testToken, secretPassword);

      // Check all log calls
      const allCalls = [
        ...infoSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...debugSpy.mock.calls,
      ];

      const passwordLogged = allCalls.some((call) =>
        call.some((arg: any) => JSON.stringify(arg).includes(secretPassword))
      );

      expect(passwordLogged).toBe(false);

      logger.info('✅ Plaintext password not logged');
    });
  });

  // =============================================================================
  // Database Update Tests
  // =============================================================================

  describe('Database Update Operations', () => {
    /**
     * Test Case: Password Update Failure
     * ----------------------------------
     * Verifies handling when database update affects 0 rows.
     */
    it('should throw error when password update fails', async () => {
      logger.info('🧪 Test: Password update failure');

      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const mockResetRequest = { uuid: 'reset-009', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(0); // 0 rows affected

      // Attempt reset
      await expect(
        resetPasswordService(testEmail, testToken, 'NewPassword123!')
      ).rejects.toThrow('Failed to update password.');

      // Verify token NOT deleted (update failed)
      expect(deletePasswordResetRequest).not.toHaveBeenCalled();

      logger.info('✅ Update failure properly handled');
    });

    /**
     * Test Case: Database Error During Update
     * ---------------------------------------
     * Verifies handling of database errors.
     */
    it('should throw error when database update throws error', async () => {
      logger.info('🧪 Test: Database update error');

      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const mockResetRequest = { uuid: 'reset-010', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (updateUserPasswordByEmail as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Attempt reset
      await expect(
        resetPasswordService(testEmail, testToken, 'NewPassword123!')
      ).rejects.toThrow('Database connection failed');

      // Verify error logged
      expect(errorSpy).toHaveBeenCalled();

      // Verify security event logged
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_FAILED',
        'medium',
        expect.objectContaining({ error: 'Database connection failed' }),
        undefined
      );

      logger.info('✅ Database error properly handled');
    });
  });

  // =============================================================================
  // Single-Use Token Tests
  // =============================================================================

  describe('Single-Use Token Enforcement', () => {
    /**
     * Test Case: Token Deleted After Successful Reset
     * -----------------------------------------------
     * Verifies that tokens are deleted after use (single-use).
     */
    it('should delete token after successful password reset', async () => {
      logger.info('🧪 Test: Token deletion after success');

      const testEmail = 'user@vodichron.com';
      const testToken = 'single_use_token';
      const mockResetRequest = { uuid: 'reset-011', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(1);
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      await resetPasswordService(testEmail, testToken, 'NewPassword123!');

      // Verify token deleted
      expect(deletePasswordResetRequest).toHaveBeenCalledWith(testEmail);

      // Verify logging mentions single-use
      expect(wasLogged(infoSpy, 'single-use')).toBe(true);

      logger.info('✅ Token properly deleted (single-use enforced)');
    });

    /**
     * Test Case: Token NOT Deleted on Failure
     * ---------------------------------------
     * Verifies tokens are preserved when reset fails.
     */
    it('should not delete token when password update fails', async () => {
      logger.info('🧪 Test: Token preserved on failure');

      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const mockResetRequest = { uuid: 'reset-012', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(0); // Fails

      try {
        await resetPasswordService(testEmail, testToken, 'NewPassword123!');
      } catch {
        // Expected to throw
      }

      // Verify token NOT deleted
      expect(deletePasswordResetRequest).not.toHaveBeenCalled();

      logger.info('✅ Token preserved when update fails');
    });
  });

  // =============================================================================
  // Security and Audit Logging Tests
  // =============================================================================

  describe('Security and Audit Logging', () => {
    /**
     * Test Case: Comprehensive Logging
     * --------------------------------
     * Verifies all password reset steps are logged.
     */
    it('should log all password reset steps', async () => {
      logger.info('🧪 Test: Comprehensive logging');

      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const mockResetRequest = { uuid: 'reset-013', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(1);
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      await resetPasswordService(testEmail, testToken, 'NewPassword123!');

      // Verify comprehensive logging
      expect(infoSpy).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalled();
      expect(wasLogged(infoSpy, 'Password reset initiated')).toBe(true);
      expect(wasLogged(debugSpy, 'Validating reset token')).toBe(true);
      expect(wasLogged(infoSpy, 'Reset token validated successfully')).toBe(true);
      expect(wasLogged(debugSpy, 'Hashing new password')).toBe(true);
      expect(wasLogged(infoSpy, 'Password hashed successfully')).toBe(true);
      expect(wasLogged(infoSpy, 'Password updated successfully')).toBe(true);
      expect(wasLogged(infoSpy, 'Password reset completed successfully')).toBe(true);

      logger.info('✅ All steps properly logged');
    });

    /**
     * Test Case: IP Address Tracking
     * ------------------------------
     * Verifies client IP is tracked in audit logs.
     */
    it('should track client IP in audit logs', async () => {
      logger.info('🧪 Test: IP address tracking');

      const testIp = '203.0.113.42';
      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const mockResetRequest = { uuid: 'reset-014', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(1);
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      await resetPasswordService(testEmail, testToken, 'NewPassword123!', testIp);

      // Verify IP logged
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        'emp-123',
        testEmail,
        testIp,
        true,
        'EMPLOYEE'
      );

      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_SUCCESS',
        'low',
        expect.any(Object),
        testIp,
        'emp-123'
      );

      logger.info('✅ IP address tracked in logs');
    });

    /**
     * Test Case: Failed Attempt Logging
     * ---------------------------------
     * Verifies failed attempts are logged with appropriate severity.
     */
    it('should log failed reset attempts appropriately', async () => {
      logger.info('🧪 Test: Failed attempt logging');

      const testEmail = 'user@example.com';
      const invalidToken = 'invalid_token';

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(null);

      try {
        await resetPasswordService(testEmail, invalidToken, 'NewPassword123!', '127.0.0.1');
      } catch {
        // Expected to throw
      }

      // Verify failure logged
      expect(errorSpy).toHaveBeenCalled();
      expect(wasLogged(errorSpy, 'Password reset failed')).toBe(true);

      // Verify security event
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_FAILED',
        'medium',
        expect.any(Object),
        '127.0.0.1'
      );

      logger.info('✅ Failed attempt properly logged');
    });
  });

  // =============================================================================
  // Edge Cases Tests
  // =============================================================================

  describe('Edge Cases', () => {
    /**
     * Test Case: Reset Without IP Address
     * -----------------------------------
     * Verifies service works when IP is not provided.
     */
    it('should work without client IP address', async () => {
      logger.info('🧪 Test: Reset without IP');

      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const mockResetRequest = { uuid: 'reset-015', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(1);
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      // Call without IP parameter
      const result = await resetPasswordService(testEmail, testToken, 'NewPassword123!');

      expect(result).toBe(true);

      // Logging should work with undefined IP
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        'emp-123',
        testEmail,
        undefined,
        true,
        'EMPLOYEE'
      );

      logger.info('✅ Works without IP address');
    });

    /**
     * Test Case: Very Long Password
     * -----------------------------
     * Verifies handling of long passwords.
     */
    it('should handle very long passwords', async () => {
      logger.info('🧪 Test: Very long password');

      const testEmail = 'user@vodichron.com';
      const testToken = 'token';
      const veryLongPassword = 'P@ssw0rd!' + 'a'.repeat(500);
      const mockResetRequest = { uuid: 'reset-016', email: testEmail, token: testToken, createdAt: new Date() };
      const mockEmployee = { uuid: 'emp-123', officialEmailId: testEmail };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findPasswordResetByToken as jest.Mock).mockResolvedValue(mockResetRequest);
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (hashPassword as jest.Mock).mockResolvedValue('hashed_long_password');
      (updateUserPasswordByEmail as jest.Mock).mockResolvedValue(1);
      (deletePasswordResetRequest as jest.Mock).mockResolvedValue(1);

      const result = await resetPasswordService(testEmail, testToken, veryLongPassword);

      expect(result).toBe(true);
      expect(hashPassword).toHaveBeenCalledWith(veryLongPassword);

      logger.info('✅ Very long password handled');
    });
  });
});
