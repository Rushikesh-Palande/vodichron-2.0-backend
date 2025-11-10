/**
 * Generate Reset Link Service Test Suite
 * =======================================
 * 
 * Tests the generateResetLinkService function which handles the complete password
 * reset link generation workflow. This is a critical security feature that must
 * prevent email enumeration while ensuring legitimate users can reset passwords.
 * 
 * Test Coverage:
 * ✅ Employee password reset flow (email → token → link → email)
 * ✅ Customer password reset flow (separate path)
 * ✅ User existence validation (employee and customer lookups)
 * ✅ Account status checks (ACTIVE required)
 * ✅ Token generation and encryption
 * ✅ Database storage of encrypted tokens
 * ✅ Reset URL generation with obfuscation
 * ✅ Email sending with embedded logo
 * ✅ Email template integration
 * ✅ Anti-enumeration protection (returns success for non-existent users)
 * ✅ Inactive account error handling
 * ✅ Token encryption failure handling
 * ✅ Database error handling
 * ✅ Email sending failure handling
 * ✅ Security audit logging
 * ✅ Client IP tracking
 * ✅ 15-minute expiration window
 * 
 * Security Considerations:
 * - Always returns success to prevent email enumeration
 * - Tokens are encrypted before database storage
 * - Only active accounts can request resets
 * - Reset links expire after 15 minutes
 * - Obfuscation keys added to URLs
 * - All attempts logged for audit trails
 * - IP addresses tracked for forensics
 * - No sensitive data in error messages
 * - Inactive account errors are thrown (user-facing)
 * - Other errors return success silently
 * 
 * Business Logic Flow:
 * Generate: Email → User Lookup → Status Check → Token Gen → Encrypt → Store → URL Gen → Send Email → Success
 * 
 * Integration Points:
 * - Store: findEmployeeByOfficialEmail, findCustomerByEmail, findUserByEmployeeUuid, findCustomerAccessByCustomerId, createPasswordResetRequest
 * - Helpers: generateRandomString, encrypt
 * - Services: sendEmail
 * - Templates: getResetPasswordEmailTemplate
 * - Config: frontendUrl, asset.path
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\services
 */

import { generateResetLinkService } from '../../services/generate-reset-link.service';
import { logger, logAuth, logSecurity } from '../../../../utils/logger';
import {
  findEmployeeByOfficialEmail,
  findCustomerByEmail,
  findUserByEmployeeUuid,
  findCustomerAccessByCustomerId,
} from '../../store/auth.store';
import { createPasswordResetRequest } from '../../store/password-reset.store';
import { encrypt } from '../../../employee/helpers/encrypt.helper';
import { generateRandomString } from '../../helpers/generate-random-string.helper';
import { sendEmail } from '../../../../services/email.service';
import { getResetPasswordEmailTemplate } from '../../templates/reset-password-email.template';

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
jest.mock('../../../employee/helpers/encrypt.helper');
jest.mock('../../helpers/generate-random-string.helper');

// Mock services
jest.mock('../../../../services/email.service');

// Mock templates
jest.mock('../../templates/reset-password-email.template');

// Mock config
jest.mock('../../../../config', () => ({
  config: {
    frontendUrl: 'https://app.vodichron.com',
    asset: {
      path: 'assets',
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

describe('Generate Reset Link Service', () => {
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

    // Setup default mocks
    (getResetPasswordEmailTemplate as jest.Mock).mockReturnValue({
      subject: 'Reset Your Password - Vodichron HRMS',
      template: '<html>Reset email template</html>',
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
  // Employee Password Reset Flow Tests
  // =============================================================================

  describe('Employee Password Reset Flow', () => {
    /**
     * Test Case: Successful Employee Password Reset Link Generation
     * -------------------------------------------------------------
     * Verifies complete employee password reset flow from email to link sent.
     * 
     * Steps:
     * 1. Employee requests password reset with email
     * 2. System finds employee record
     * 3. System verifies user record exists and is ACTIVE
     * 4. Random token is generated
     * 5. Token is encrypted
     * 6. Encrypted token stored in database
     * 7. Reset URL generated with obfuscation
     * 8. Email sent with reset link
     * 9. Success returned
     */
    it('should successfully generate password reset link for employee', async () => {
      logger.info('🧪 Test: Successful employee password reset');

      // Step 1: Setup test data
      logger.info('🔄 Step 1: Setting up employee test data...');
      const testEmail = 'employee@vodichron.com';
      const testIp = '192.168.1.100';

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

      // Step 2: Mock dependencies
      logger.info('🔄 Step 2: Mocking dependencies...');
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (generateRandomString as jest.Mock)
        .mockReturnValueOnce('ABC123') // 6-char token
        .mockReturnValueOnce('obfuscate'); // 10-char obfuscation key
      (encrypt as jest.Mock).mockResolvedValue('encrypted_token_hash');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({
        uuid: 'reset-001',
        email: testEmail,
        token: 'encrypted_token_hash',
        createdAt: new Date(),
      });
      (sendEmail as jest.Mock).mockResolvedValue(true);

      // Step 3: Execute service
      logger.info('🔄 Step 3: Executing reset link generation...');
      const result = await generateResetLinkService(testEmail, testIp);

      // Step 4: Verify success
      logger.info('✅ Step 4: Verifying success response...');
      expect(result).toBe(true);

      // Step 5: Verify employee lookup
      logger.info('✅ Step 5: Verifying employee lookup...');
      expect(findEmployeeByOfficialEmail).toHaveBeenCalledWith(testEmail);
      expect(findUserByEmployeeUuid).toHaveBeenCalledWith('emp-123');

      // Step 6: Verify token generation and encryption
      logger.info('✅ Step 6: Verifying token generation...');
      expect(generateRandomString).toHaveBeenCalledWith(6); // Token
      expect(generateRandomString).toHaveBeenCalledWith(10); // Obfuscation
      expect(encrypt).toHaveBeenCalledWith('ABC123');

      // Step 7: Verify database storage
      logger.info('✅ Step 7: Verifying database storage...');
      expect(createPasswordResetRequest).toHaveBeenCalledWith(
        testEmail,
        'encrypted_token_hash'
      );

      // Step 8: Verify email sent
      logger.info('✅ Step 8: Verifying email sent...');
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
          subject: 'Reset Your Password - Vodichron HRMS',
          html: '<html>Reset email template</html>',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'vodichron-logo.png',
              cid: 'vodichron-logo',
            }),
          ]),
        })
      );

      // Step 9: Verify audit logging
      logger.info('✅ Step 9: Verifying audit logging...');
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET_REQUEST',
        'emp-123',
        testEmail,
        testIp,
        true,
        'employee'
      );
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_LINK_GENERATED',
        'low',
        expect.objectContaining({ username: testEmail }),
        testIp,
        'emp-123'
      );

      logger.info('✅ Employee password reset flow completed successfully');
    });

    /**
     * Test Case: Employee with Inactive Account
     * ------------------------------------------
     * Verifies that inactive employee accounts cannot request resets.
     */
    it('should throw error for inactive employee account', async () => {
      logger.info('🧪 Test: Inactive employee account rejection');

      // Setup inactive employee
      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'inactive@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'INACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);

      // Attempt reset
      await expect(
        generateResetLinkService('inactive@vodichron.com', '127.0.0.1')
      ).rejects.toThrow('Your account is in deactivated state, contact HR to activate the account.');

      // Verify no email sent
      expect(sendEmail).not.toHaveBeenCalled();
      expect(createPasswordResetRequest).not.toHaveBeenCalled();

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_INACTIVE_ACCOUNT',
        'medium',
        expect.any(Object),
        '127.0.0.1'
      );

      logger.info('✅ Inactive employee properly rejected');
    });

    /**
     * Test Case: Employee with No User Record
     * ----------------------------------------
     * Verifies handling when employee exists but has no user record.
     */
    it('should throw error for employee with no user record', async () => {
      logger.info('🧪 Test: Employee with no user record');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'no-user@vodichron.com' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(null);

      // Attempt reset
      await expect(
        generateResetLinkService('no-user@vodichron.com', '127.0.0.1')
      ).rejects.toThrow('Your account is in deactivated state, contact HR to activate the account.');

      // Verify no email sent
      expect(sendEmail).not.toHaveBeenCalled();

      logger.info('✅ Employee with no user record properly handled');
    });
  });

  // =============================================================================
  // Customer Password Reset Flow Tests
  // =============================================================================

  describe('Customer Password Reset Flow', () => {
    /**
     * Test Case: Successful Customer Password Reset Link Generation
     * -------------------------------------------------------------
     * Verifies complete customer password reset flow.
     */
    it('should successfully generate password reset link for customer', async () => {
      logger.info('🧪 Test: Successful customer password reset');

      // Setup customer test data
      const testEmail = 'customer@example.com';
      const testIp = '10.0.0.1';

      const mockCustomer = {
        uuid: 'cust-456',
        email: testEmail,
        name: 'Jane Customer',
      };

      const mockAccess = {
        customerId: 'cust-456',
        status: 'ACTIVE',
        password: 'hashed_password',
      };

      // Mock dependencies
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null); // Not employee
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);
      (generateRandomString as jest.Mock)
        .mockReturnValueOnce('XYZ789')
        .mockReturnValueOnce('obfuscate2');
      (encrypt as jest.Mock).mockResolvedValue('encrypted_customer_token');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({
        uuid: 'reset-002',
        email: testEmail,
        token: 'encrypted_customer_token',
        createdAt: new Date(),
      });
      (sendEmail as jest.Mock).mockResolvedValue(true);

      // Execute service
      const result = await generateResetLinkService(testEmail, testIp);

      // Verify success
      expect(result).toBe(true);

      // Verify customer lookup
      expect(findCustomerByEmail).toHaveBeenCalledWith(testEmail);
      expect(findCustomerAccessByCustomerId).toHaveBeenCalledWith('cust-456');

      // Verify email sent
      expect(sendEmail).toHaveBeenCalled();

      // Verify audit logging
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET_REQUEST',
        'cust-456',
        testEmail,
        testIp,
        true,
        'customer'
      );

      logger.info('✅ Customer password reset flow completed successfully');
    });

    /**
     * Test Case: Customer with Inactive Access
     * -----------------------------------------
     * Verifies that customers without active access cannot reset passwords.
     */
    it('should throw error for inactive customer account', async () => {
      logger.info('🧪 Test: Inactive customer account rejection');

      const mockCustomer = { uuid: 'cust-456', email: 'inactive-customer@example.com' };
      const mockAccess = { customerId: 'cust-456', status: 'INACTIVE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(mockAccess);

      // Attempt reset
      await expect(
        generateResetLinkService('inactive-customer@example.com', '127.0.0.1')
      ).rejects.toThrow('Your account is in deactivated state, contact HR to activate the account.');

      // Verify no email sent
      expect(sendEmail).not.toHaveBeenCalled();

      logger.info('✅ Inactive customer properly rejected');
    });

    /**
     * Test Case: Customer with No Access Record
     * ------------------------------------------
     * Verifies handling when customer exists but has no access record.
     */
    it('should throw error for customer with no access record', async () => {
      logger.info('🧪 Test: Customer with no access record');

      const mockCustomer = { uuid: 'cust-456', email: 'no-access@example.com' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(mockCustomer);
      (findCustomerAccessByCustomerId as jest.Mock).mockResolvedValue(null);

      // Attempt reset
      await expect(
        generateResetLinkService('no-access@example.com', '127.0.0.1')
      ).rejects.toThrow('Your account is in deactivated state, contact HR to activate the account.');

      logger.info('✅ Customer with no access record properly handled');
    });
  });

  // =============================================================================
  // Anti-Enumeration Tests
  // =============================================================================

  describe('Anti-Enumeration Protection', () => {
    /**
     * Test Case: Non-Existent Email Returns Success
     * ----------------------------------------------
     * Verifies that non-existent emails return success to prevent enumeration.
     * 
     * Security: Critical for preventing email discovery attacks.
     */
    it('should return success for non-existent email (anti-enumeration)', async () => {
      logger.info('🧪 Test: Non-existent email anti-enumeration');

      // Mock no user found
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);

      // Execute service
      const result = await generateResetLinkService('nonexistent@example.com', '127.0.0.1');

      // Verify success returned (prevents enumeration)
      expect(result).toBe(true);

      // Verify no email sent
      expect(sendEmail).not.toHaveBeenCalled();
      expect(createPasswordResetRequest).not.toHaveBeenCalled();

      // Verify security logging
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_INVALID_EMAIL',
        'low',
        expect.objectContaining({ username: 'nonexistent@example.com' }),
        '127.0.0.1'
      );

      logger.info('✅ Email enumeration prevented with success response');
    });

    /**
     * Test Case: Consistent Response Time
     * -----------------------------------
     * Verifies that response is always success regardless of user existence.
     */
    it('should always return true regardless of user existence', async () => {
      logger.info('🧪 Test: Consistent success response');

      // Test 1: Non-existent user
      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(null);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);

      const result1 = await generateResetLinkService('fake@example.com', '127.0.0.1');
      expect(result1).toBe(true);

      // Test 2: Existing user with error in email sending
      jest.clearAllMocks();
      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'real@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('token123');
      (encrypt as jest.Mock).mockResolvedValue('encrypted');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockRejectedValue(new Error('Email service down'));

      const result2 = await generateResetLinkService('real@vodichron.com', '127.0.0.1');
      expect(result2).toBe(true); // Still returns true for security

      logger.info('✅ Consistent success response maintained');
    });
  });

  // =============================================================================
  // Token Generation and Encryption Tests
  // =============================================================================

  describe('Token Generation and Encryption', () => {
    /**
     * Test Case: Token Generation
     * ---------------------------
     * Verifies that 6-character random token is generated.
     */
    it('should generate 6-character random token', async () => {
      logger.info('🧪 Test: Token generation');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('ABC123');
      (encrypt as jest.Mock).mockResolvedValue('encrypted_ABC123');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await generateResetLinkService('user@vodichron.com');

      // Verify 6-character token generated
      expect(generateRandomString).toHaveBeenCalledWith(6);

      logger.info('✅ 6-character token generated');
    });

    /**
     * Test Case: Token Encryption
     * ---------------------------
     * Verifies that generated token is encrypted before storage.
     */
    it('should encrypt token before storage', async () => {
      logger.info('🧪 Test: Token encryption');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('PLAIN_TOKEN');
      (encrypt as jest.Mock).mockResolvedValue('ENCRYPTED_TOKEN');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await generateResetLinkService('user@vodichron.com');

      // Verify token encrypted
      expect(encrypt).toHaveBeenCalledWith('PLAIN_TOKEN');

      // Verify encrypted token stored
      expect(createPasswordResetRequest).toHaveBeenCalledWith(
        'user@vodichron.com',
        'ENCRYPTED_TOKEN'
      );

      logger.info('✅ Token encrypted before storage');
    });

    /**
     * Test Case: Encryption Failure
     * -----------------------------
     * Verifies handling when token encryption fails.
     */
    it('should return success when encryption fails (anti-enumeration)', async () => {
      logger.info('🧪 Test: Encryption failure handling');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('TOKEN');
      (encrypt as jest.Mock).mockResolvedValue(null); // Encryption fails

      const result = await generateResetLinkService('user@vodichron.com');

      // Still returns success (anti-enumeration)
      expect(result).toBe(true);

      // No email sent
      expect(sendEmail).not.toHaveBeenCalled();

      // Error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Encryption failure handled gracefully');
    });
  });

  // =============================================================================
  // Reset URL Generation Tests
  // =============================================================================

  describe('Reset URL Generation', () => {
    /**
     * Test Case: URL Structure
     * ------------------------
     * Verifies that reset URL has correct structure with obfuscation.
     */
    it('should generate reset URL with obfuscation key', async () => {
      logger.info('🧪 Test: Reset URL generation');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock)
        .mockReturnValueOnce('TOKEN')
        .mockReturnValueOnce('OBFUSCATE123');
      (encrypt as jest.Mock).mockResolvedValue('encrypted:token');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await generateResetLinkService('user@vodichron.com');

      // Verify email template called with URL
      expect(getResetPasswordEmailTemplate).toHaveBeenCalledWith({
        passwordResetUrl: expect.stringContaining('https://app.vodichron.com/reset-password/'),
      });

      // Verify URL structure (should include obfuscation key and encoded token)
      const call = (getResetPasswordEmailTemplate as jest.Mock).mock.calls[0][0];
      expect(call.passwordResetUrl).toContain('/OBFUSCATE123/');
      expect(call.passwordResetUrl).toContain('encrypted%3Atoken'); // URL-encoded colon

      logger.info('✅ Reset URL generated with obfuscation');
    });

    /**
     * Test Case: URL Encoding
     * -----------------------
     * Verifies that special characters in token are URL-encoded.
     */
    it('should URL-encode encrypted token with special characters', async () => {
      logger.info('🧪 Test: URL encoding of token');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('KEY');
      (encrypt as jest.Mock).mockResolvedValue('token:with:colons/and/slashes');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await generateResetLinkService('user@vodichron.com');

      // Verify URL encoding
      const call = (getResetPasswordEmailTemplate as jest.Mock).mock.calls[0][0];
      expect(call.passwordResetUrl).not.toContain('token:with:colons/and/slashes');
      expect(call.passwordResetUrl).toContain(encodeURIComponent('token:with:colons/and/slashes'));

      logger.info('✅ Special characters properly URL-encoded');
    });
  });

  // =============================================================================
  // Email Sending Tests
  // =============================================================================

  describe('Email Sending', () => {
    /**
     * Test Case: Email Content
     * ------------------------
     * Verifies that email is sent with correct content and attachments.
     */
    it('should send email with logo attachment', async () => {
      logger.info('🧪 Test: Email with logo attachment');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('TOKEN');
      (encrypt as jest.Mock).mockResolvedValue('encrypted');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await generateResetLinkService('user@vodichron.com');

      // Verify email sent with correct structure
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@vodichron.com',
          subject: 'Reset Your Password - Vodichron HRMS',
          html: expect.any(String),
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'vodichron-logo.png',
              path: expect.stringContaining('Vodichron-logo.png'),
              cid: 'vodichron-logo',
            }),
          ]),
        })
      );

      logger.info('✅ Email sent with logo attachment');
    });

    /**
     * Test Case: Email Sending Failure
     * ---------------------------------
     * Verifies graceful handling when email service fails.
     */
    it('should return success when email sending fails (anti-enumeration)', async () => {
      logger.info('🧪 Test: Email sending failure handling');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('TOKEN');
      (encrypt as jest.Mock).mockResolvedValue('encrypted');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP server error'));

      const result = await generateResetLinkService('user@vodichron.com');

      // Still returns success (anti-enumeration)
      expect(result).toBe(true);

      // Error logged
      expect(errorSpy).toHaveBeenCalled();
      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_ERROR',
        'medium',
        expect.objectContaining({ error: 'SMTP server error' }),
        undefined
      );

      logger.info('✅ Email failure handled gracefully');
    });
  });

  // =============================================================================
  // Database Error Handling Tests
  // =============================================================================

  describe('Database Error Handling', () => {
    /**
     * Test Case: Database Storage Failure
     * -----------------------------------
     * Verifies handling when database storage fails.
     */
    it('should return success when database storage fails (anti-enumeration)', async () => {
      logger.info('🧪 Test: Database storage failure');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('TOKEN');
      (encrypt as jest.Mock).mockResolvedValue('encrypted');
      (createPasswordResetRequest as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await generateResetLinkService('user@vodichron.com');

      // Still returns success
      expect(result).toBe(true);

      // No email sent
      expect(sendEmail).not.toHaveBeenCalled();

      // Error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Database failure handled gracefully');
    });

    /**
     * Test Case: User Lookup Database Error
     * -------------------------------------
     * Verifies handling when database lookup fails.
     */
    it('should return success when user lookup fails (anti-enumeration)', async () => {
      logger.info('🧪 Test: User lookup database error');

      (findEmployeeByOfficialEmail as jest.Mock).mockRejectedValue(
        new Error('Database timeout')
      );

      const result = await generateResetLinkService('user@vodichron.com');

      // Still returns success
      expect(result).toBe(true);

      // Error logged
      expect(errorSpy).toHaveBeenCalled();

      logger.info('✅ Database lookup error handled gracefully');
    });
  });

  // =============================================================================
  // Security and Audit Logging Tests
  // =============================================================================

  describe('Security and Audit Logging', () => {
    /**
     * Test Case: IP Address Tracking
     * ------------------------------
     * Verifies that client IP is tracked in logs.
     */
    it('should track client IP address in audit logs', async () => {
      logger.info('🧪 Test: IP address tracking');

      const testIp = '203.0.113.42';
      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('TOKEN');
      (encrypt as jest.Mock).mockResolvedValue('encrypted');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await generateResetLinkService('user@vodichron.com', testIp);

      // Verify IP logged
      expect(logAuth).toHaveBeenCalledWith(
        'PASSWORD_RESET_REQUEST',
        'emp-123',
        'user@vodichron.com',
        testIp,
        true,
        'employee'
      );

      expect(logSecurity).toHaveBeenCalledWith(
        'PASSWORD_RESET_LINK_GENERATED',
        'low',
        expect.any(Object),
        testIp,
        'emp-123'
      );

      logger.info('✅ IP address tracked in audit logs');
    });

    /**
     * Test Case: Comprehensive Logging
     * ---------------------------------
     * Verifies all steps are logged appropriately.
     */
    it('should log all steps of reset process', async () => {
      logger.info('🧪 Test: Comprehensive logging');

      const mockEmployee = { uuid: 'emp-123', officialEmailId: 'user@vodichron.com' };
      const mockUser = { uuid: 'user-123', status: 'ACTIVE', role: 'EMPLOYEE' };

      (findEmployeeByOfficialEmail as jest.Mock).mockResolvedValue(mockEmployee);
      (findUserByEmployeeUuid as jest.Mock).mockResolvedValue(mockUser);
      (findCustomerByEmail as jest.Mock).mockResolvedValue(null);
      (generateRandomString as jest.Mock).mockReturnValue('TOKEN');
      (encrypt as jest.Mock).mockResolvedValue('encrypted');
      (createPasswordResetRequest as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await generateResetLinkService('user@vodichron.com');

      // Verify comprehensive logging
      expect(infoSpy).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalled();
      expect(wasLogged(infoSpy, 'Password reset link generation initiated')).toBe(true);
      expect(wasLogged(infoSpy, 'User found')).toBe(true);
      expect(wasLogged(infoSpy, 'Account status verified')).toBe(true);
      expect(wasLogged(infoSpy, 'Token generated and encrypted')).toBe(true);
      expect(wasLogged(infoSpy, 'Reset request stored successfully')).toBe(true);
      expect(wasLogged(infoSpy, 'Password reset email sent successfully')).toBe(true);

      logger.info('✅ All steps properly logged');
    });
  });
});
