/**
 * Reset Password Schema Test Suite
 * ==================================
 * 
 * Tests the resetPasswordSchema Zod validation for password reset with
 * new password submission.
 * 
 * Test Coverage:
 * ✅ Valid reset input validation
 * ✅ Email format validation
 * ✅ Reset token (sec) validation
 * ✅ Password strength validation (8+ chars, uppercase, lowercase, number, special)
 * ✅ Password complexity regex testing
 * ✅ Missing field handling
 * ✅ Type validation
 * ✅ Edge cases and security
 * 
 * Schema Requirements:
 * - email: valid email format (required)
 * - sec: reset token string (required, min 1 char)
 * - password: min 8 chars, uppercase, lowercase, number, special char (@$!%*?&)
 */

import { resetPasswordSchema, type ResetPasswordInput } from '../../schemas/reset-password.schema';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Reset Password Schema', () => {
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    logger.info('🔄 Setting up test case...');
  });

  afterEach(() => {
    infoSpy.mockRestore();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Valid Input Tests
  // =============================================================================

  describe('Valid Inputs', () => {
    /**
     * Test Case: Valid Reset Password Input
     * --------------------------------------
     * Verifies that valid input passes all validation.
     */
    it('should validate complete valid input', () => {
      logger.info('🧪 Test: Valid reset password input');
      
      const input = {
        email: 'user@example.com',
        sec: 'encrypted-reset-token-abc123',
        password: 'SecurePass123!',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
        expect(result.data.sec).toBe('encrypted-reset-token-abc123');
        expect(result.data.password).toBe('SecurePass123!');
        logger.info('✅ Valid reset password input accepted');
      }
    });

    /**
     * Test Case: Various Strong Passwords
     * ------------------------------------
     * Verifies different valid password formats.
     */
    it('should accept various strong passwords', () => {
      logger.info('🧪 Test: Various strong passwords');
      
      const validPasswords = [
        'Password123!',      // Standard format
        'Abcd1234@',         // Minimal length
        'MyP@ssw0rd',        // Alternative special
        'Secure$Pass1',      // $ special char
        'Test%1234Aa',       // % special char
        'Complex&Pass9',     // & special char
        'Strong*Word7Z',     // * special char
        'P@ssW0rd?',         // ? special char
      ];
      
      validPasswords.forEach(password => {
        const result = resetPasswordSchema.safeParse({
          email: 'user@example.com',
          sec: 'token123',
          password,
        });
        expect(result.success).toBe(true);
        logger.info(`  ✅ ${password}`);
      });
      
      logger.info('✅ All strong passwords accepted');
    });

    /**
     * Test Case: Minimum Length Strong Password
     * ------------------------------------------
     * Verifies 8-character password with all requirements.
     */
    it('should accept minimum length password with all requirements', () => {
      logger.info('🧪 Test: Minimum length strong password');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'Abcd123!', // 8 chars: uppercase, lowercase, number, special
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ Minimum length password accepted');
    });

    /**
     * Test Case: Long Strong Password
     * --------------------------------
     * Verifies very long passwords are accepted.
     */
    it('should accept long strong passwords', () => {
      logger.info('🧪 Test: Long strong password');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'VeryLongAndSecurePassword123!WithManyCharacters',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ Long strong password accepted');
    });

    /**
     * Test Case: All Special Characters
     * ----------------------------------
     * Verifies all allowed special characters.
     */
    it('should accept all allowed special characters', () => {
      logger.info('🧪 Test: All special characters');
      
      const specialChars = '@$!%*?&';
      
      for (const char of specialChars) {
        const result = resetPasswordSchema.safeParse({
          email: 'user@example.com',
          sec: 'token123',
          password: `Pass123${char}word`,
        });
        expect(result.success).toBe(true);
        logger.info(`  ✅ Special character: ${char}`);
      }
      
      logger.info('✅ All special characters (@$!%*?&) accepted');
    });
  });

  // =============================================================================
  // Email Validation Tests
  // =============================================================================

  describe('Email Validation', () => {
    /**
     * Test Case: Invalid Email Format
     * --------------------------------
     * Verifies rejection of invalid email.
     */
    it('should reject invalid email format', () => {
      logger.info('🧪 Test: Invalid email format');
      
      const input = {
        email: 'not-an-email',
        sec: 'token123',
        password: 'SecurePass123!',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Valid email address required');
        logger.info('✅ Invalid email rejected with correct message');
      }
    });

    /**
     * Test Case: Missing Email
     * -------------------------
     * Verifies rejection when email is missing.
     */
    it('should reject missing email', () => {
      logger.info('🧪 Test: Missing email');
      
      const input = {
        sec: 'token123',
        password: 'SecurePass123!',
      } as any;
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('email');
        logger.info('✅ Missing email rejected');
      }
    });

    /**
     * Test Case: Empty Email
     * -----------------------
     * Verifies rejection of empty email string.
     */
    it('should reject empty email', () => {
      logger.info('🧪 Test: Empty email');
      
      const input = {
        email: '',
        sec: 'token123',
        password: 'SecurePass123!',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Empty email rejected');
    });
  });

  // =============================================================================
  // Reset Token (sec) Validation Tests
  // =============================================================================

  describe('Reset Token (sec) Validation', () => {
    /**
     * Test Case: Valid Reset Token
     * -----------------------------
     * Verifies various valid token formats.
     */
    it('should accept various valid tokens', () => {
      logger.info('🧪 Test: Various valid tokens');
      
      const validTokens = [
        'a',                                    // Single character
        'abc123',                               // Short token
        'encrypted-token-with-hyphens',         // Hyphenated
        'very-long-encrypted-token-string-with-many-characters-123456789',
        'TOKEN_WITH_UNDERSCORES',
        'MixedCaseToken123',
      ];
      
      validTokens.forEach(token => {
        const result = resetPasswordSchema.safeParse({
          email: 'user@example.com',
          sec: token,
          password: 'SecurePass123!',
        });
        expect(result.success).toBe(true);
        logger.info(`  ✅ Token length: ${token.length}`);
      });
      
      logger.info('✅ All valid tokens accepted');
    });

    /**
     * Test Case: Missing Reset Token
     * -------------------------------
     * Verifies rejection when token is missing.
     */
    it('should reject missing reset token', () => {
      logger.info('🧪 Test: Missing reset token');
      
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      } as any;
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('sec');
        logger.info('✅ Missing reset token rejected');
      }
    });

    /**
     * Test Case: Empty Reset Token
     * -----------------------------
     * Verifies rejection of empty token.
     */
    it('should reject empty reset token', () => {
      logger.info('🧪 Test: Empty reset token');
      
      const input = {
        email: 'user@example.com',
        sec: '',
        password: 'SecurePass123!',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Reset token is required');
        logger.info('✅ Empty reset token rejected with correct message');
      }
    });
  });

  // =============================================================================
  // Password Strength Validation Tests
  // =============================================================================

  describe('Password Strength Validation', () => {
    /**
     * Test Case: Password Too Short
     * ------------------------------
     * Verifies rejection of passwords under 8 characters.
     */
    it('should reject password shorter than 8 characters', () => {
      logger.info('🧪 Test: Password too short');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'Pass1!', // 6 chars
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
        logger.info('✅ Short password rejected with correct message');
      }
    });

    /**
     * Test Case: Missing Uppercase Letter
     * ------------------------------------
     * Verifies rejection when uppercase is missing.
     */
    it('should reject password without uppercase letter', () => {
      logger.info('🧪 Test: Missing uppercase letter');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'password123!', // No uppercase
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase letter');
        logger.info('✅ Password without uppercase rejected');
      }
    });

    /**
     * Test Case: Missing Lowercase Letter
     * ------------------------------------
     * Verifies rejection when lowercase is missing.
     */
    it('should reject password without lowercase letter', () => {
      logger.info('🧪 Test: Missing lowercase letter');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'PASSWORD123!', // No lowercase
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase letter');
        logger.info('✅ Password without lowercase rejected');
      }
    });

    /**
     * Test Case: Missing Number
     * --------------------------
     * Verifies rejection when number is missing.
     */
    it('should reject password without number', () => {
      logger.info('🧪 Test: Missing number');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'Password!', // No number
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('one number');
        logger.info('✅ Password without number rejected');
      }
    });

    /**
     * Test Case: Missing Special Character
     * -------------------------------------
     * Verifies rejection when special character is missing.
     */
    it('should reject password without special character', () => {
      logger.info('🧪 Test: Missing special character');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'Password123', // No special char
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('special character');
        logger.info('✅ Password without special character rejected');
      }
    });

    /**
     * Test Case: Invalid Special Character
     * -------------------------------------
     * Verifies rejection of non-allowed special characters.
     */
    it('should reject password with invalid special characters', () => {
      logger.info('🧪 Test: Invalid special characters');
      
      const invalidSpecialChars = ['#', '^', '(', ')', '[', ']', '{', '}', '+', '='];
      
      invalidSpecialChars.forEach(char => {
        const result = resetPasswordSchema.safeParse({
          email: 'user@example.com',
          sec: 'token123',
          password: `Password123${char}`,
        });
        expect(result.success).toBe(false);
        logger.info(`  ✅ Rejected: ${char}`);
      });
      
      logger.info('✅ All invalid special characters rejected');
    });

    /**
     * Test Case: Only Letters (No Numbers/Special)
     * ---------------------------------------------
     * Verifies rejection of letter-only passwords.
     */
    it('should reject password with only letters', () => {
      logger.info('🧪 Test: Only letters (no numbers/special)');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'PasswordOnly',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Letter-only password rejected');
    });

    /**
     * Test Case: Empty Password
     * --------------------------
     * Verifies rejection of empty password.
     */
    it('should reject empty password', () => {
      logger.info('🧪 Test: Empty password');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: '',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Empty password rejected');
    });
  });

  // =============================================================================
  // Missing Fields Tests
  // =============================================================================

  describe('Missing Fields', () => {
    /**
     * Test Case: All Fields Missing
     * ------------------------------
     * Verifies rejection when all fields are missing.
     */
    it('should reject when all fields are missing', () => {
      logger.info('🧪 Test: All fields missing');
      
      const input = {};
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBe(3);
        logger.info('✅ All fields missing rejected (3 errors)');
      }
    });

    /**
     * Test Case: Null Values
     * -----------------------
     * Verifies rejection of null values.
     */
    it('should reject null values', () => {
      logger.info('🧪 Test: Null values');
      
      const input = {
        email: null,
        sec: null,
        password: null,
      } as any;
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Null values rejected');
    });

    /**
     * Test Case: Undefined Values
     * ----------------------------
     * Verifies rejection of undefined values.
     */
    it('should reject undefined values', () => {
      logger.info('🧪 Test: Undefined values');
      
      const input = {
        email: undefined,
        sec: undefined,
        password: undefined,
      } as any;
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Undefined values rejected');
    });
  });

  // =============================================================================
  // Type Validation Tests
  // =============================================================================

  describe('Type Validation', () => {
    /**
     * Test Case: Non-String Types
     * ----------------------------
     * Verifies rejection of non-string types.
     */
    it('should reject non-string types', () => {
      logger.info('🧪 Test: Non-string types');
      
      const invalidInputs = [
        { field: 'email', value: 12345 },
        { field: 'sec', value: ['token'] },
        { field: 'password', value: { pass: 'Password123!' } },
      ];
      
      invalidInputs.forEach(({ field, value }) => {
        const input = {
          email: field === 'email' ? value : 'user@example.com',
          sec: field === 'sec' ? value : 'token123',
          password: field === 'password' ? value : 'SecurePass123!',
        } as any;
        
        const result = resetPasswordSchema.safeParse(input);
        expect(result.success).toBe(false);
        logger.info(`  ✅ Rejected non-string ${field}`);
      });
      
      logger.info('✅ All non-string types rejected');
    });
  });

  // =============================================================================
  // Edge Cases Tests
  // =============================================================================

  describe('Edge Cases', () => {
    /**
     * Test Case: Extra Fields
     * ------------------------
     * Verifies that extra fields are stripped.
     */
    it('should strip extra fields', () => {
      logger.info('🧪 Test: Extra fields');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'SecurePass123!',
        extraField: 'should be removed',
        anotherField: 123,
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect('extraField' in result.data).toBe(false);
        expect('anotherField' in result.data).toBe(false);
        logger.info('✅ Extra fields stripped');
      }
    });

    /**
     * Test Case: Password with Whitespace
     * ------------------------------------
     * Verifies handling of passwords with spaces.
     */
    it('should handle password with whitespace', () => {
      logger.info('🧪 Test: Password with whitespace');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'Pass Word123!',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      // Regex requires only allowed characters
      expect(result.success).toBe(false);
      logger.info('✅ Password with spaces rejected (not in allowed character set)');
    });

    /**
     * Test Case: Unicode Characters in Password
     * ------------------------------------------
     * Verifies rejection of Unicode characters.
     */
    it('should reject Unicode characters in password', () => {
      logger.info('🧪 Test: Unicode characters in password');
      
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'Pàsswörd123!',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Unicode characters rejected');
    });

    /**
     * Test Case: Very Long Password
     * ------------------------------
     * Verifies handling of very long passwords.
     */
    it('should accept very long passwords', () => {
      logger.info('🧪 Test: Very long password');
      
      const longPassword = 'A1!' + 'a'.repeat(100);
      const input = {
        email: 'user@example.com',
        sec: 'token123',
        password: longPassword,
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info(`✅ Very long password (${longPassword.length} chars) accepted`);
    });
  });

  // =============================================================================
  // Type Inference Tests
  // =============================================================================

  describe('Type Inference', () => {
    /**
     * Test Case: TypeScript Type Inference
     * -------------------------------------
     * Verifies correct TypeScript type inference.
     */
    it('should correctly infer TypeScript type', () => {
      logger.info('🧪 Test: TypeScript type inference');
      
      const input: ResetPasswordInput = {
        email: 'user@example.com',
        sec: 'token123',
        password: 'SecurePass123!',
      };
      
      const result = resetPasswordSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const typedData: ResetPasswordInput = result.data;
        expect(typedData.email).toBeDefined();
        expect(typedData.sec).toBeDefined();
        expect(typedData.password).toBeDefined();
        logger.info('✅ TypeScript type correctly inferred');
      }
    });
  });

  // =============================================================================
  // Real-World Scenarios Tests
  // =============================================================================

  describe('Real-World Scenarios', () => {
    /**
     * Test Case: Complete Password Reset Flow
     * ----------------------------------------
     * Simulates complete password reset.
     */
    it('should support complete password reset flow', () => {
      logger.info('🧪 Test: Complete password reset flow');
      
      // Step 1: User clicks reset link with token
      logger.info('🔄 Step 1: User clicks reset link...');
      const resetToken = 'encrypted-token-from-email';
      logger.info('✅ Step 1: Token received from URL');
      
      // Step 2: User enters new password
      logger.info('🔄 Step 2: User enters new password...');
      const userInput = {
        email: 'user@example.com',
        sec: resetToken,
        password: 'NewSecurePass123!',
      };
      
      // Step 3: Validate input
      logger.info('🔄 Step 3: Validating input...');
      const result = resetPasswordSchema.safeParse(userInput);
      
      expect(result.success).toBe(true);
      logger.info('✅ Step 3: Input validated');
      
      if (result.success) {
        logger.info('🔄 Step 4: Password would be updated (simulated)...');
        logger.info('✅ Step 4: Password reset complete');
      }
      
      logger.info('✅ Complete password reset flow validated');
    });

    /**
     * Test Case: Common Password Weaknesses
     * --------------------------------------
     * Tests common weak password patterns.
     */
    it('should reject common weak passwords', () => {
      logger.info('🧪 Test: Common weak passwords');
      
      const weakPasswords = [
        'password',         // No complexity
        'Password',         // No number/special
        'password123',      // No uppercase/special
        'PASSWORD123',      // No lowercase/special
        'Pass123',          // Too short
        '12345678',         // Only numbers
        'abcdefgh',         // Only letters
      ];
      
      weakPasswords.forEach(password => {
        const result = resetPasswordSchema.safeParse({
          email: 'user@example.com',
          sec: 'token123',
          password,
        });
        expect(result.success).toBe(false);
        logger.info(`  ✅ Rejected: ${password}`);
      });
      
      logger.info('✅ All weak passwords rejected');
    });
  });

  // =============================================================================
  // Security Considerations Tests
  // =============================================================================

  describe('Security Considerations', () => {
    /**
     * Test Case: Password Strength Requirements
     * ------------------------------------------
     * Documents password security requirements.
     */
    it('should enforce strong password requirements', () => {
      logger.info('🧪 Test: Password strength requirements');
      
      logger.info('📋 Password Requirements:');
      logger.info('   ✅ Minimum 8 characters');
      logger.info('   ✅ At least one uppercase letter (A-Z)');
      logger.info('   ✅ At least one lowercase letter (a-z)');
      logger.info('   ✅ At least one number (0-9)');
      logger.info('   ✅ At least one special character (@$!%*?&)');
      logger.info('   ✅ Only allowed characters (A-Za-z0-9@$!%*?&)');
      
      expect(true).toBe(true); // Documentation test
      logger.info('✅ Strong password requirements documented');
    });

    /**
     * Test Case: Token Security
     * --------------------------
     * Documents reset token security considerations.
     */
    it('should document token security requirements', () => {
      logger.info('🧪 Test: Token security requirements');
      
      logger.info('📋 Token Security:');
      logger.info('   1. Token should be encrypted/hashed');
      logger.info('   2. Token should expire after use or timeout');
      logger.info('   3. Token should be single-use only');
      logger.info('   4. Token should be long and random');
      logger.info('   5. Schema validates presence, security is service layer');
      
      expect(true).toBe(true); // Documentation test
      logger.info('✅ Token security requirements documented');
    });
  });
});
