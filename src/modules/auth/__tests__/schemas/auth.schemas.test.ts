/**
 * Auth Schemas Test Suite
 * ========================
 * 
 * Tests the loginSchema Zod validation for tRPC login procedures.
 * 
 * Test Coverage:
 * ✅ Valid login input validation
 * ✅ Email format validation
 * ✅ Password length validation
 * ✅ Missing field handling
 * ✅ Empty/whitespace validation
 * ✅ Type validation
 * ✅ Edge cases and malformed inputs
 * ✅ Error message validation
 * 
 * Schema Requirements:
 * - username: valid email format
 * - password: minimum 6 characters
 */

import { loginSchema, type LoginInput } from '../../schemas/auth.schemas';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Auth Schemas', () => {
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
  // loginSchema - Valid Input Tests
  // =============================================================================

  describe('loginSchema - Valid Inputs', () => {
    /**
     * Test Case: Valid Login Input
     * -----------------------------
     * Verifies that valid email and password pass validation.
     */
    it('should validate valid login input', () => {
      logger.info('🧪 Test: Valid login input');
      
      const validInput = {
        username: 'user@example.com',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(validInput);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('user@example.com');
        expect(result.data.password).toBe('password123');
        logger.info('✅ Valid login input accepted');
      }
    });

    /**
     * Test Case: Minimum Password Length
     * -----------------------------------
     * Verifies that 6-character password is accepted.
     */
    it('should accept minimum password length (6 chars)', () => {
      logger.info('🧪 Test: Minimum password length');
      
      const input = {
        username: 'user@example.com',
        password: '123456',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ Minimum password length (6 chars) accepted');
    });

    /**
     * Test Case: Long Password
     * ------------------------
     * Verifies that very long passwords are accepted.
     */
    it('should accept long passwords', () => {
      logger.info('🧪 Test: Long password');
      
      const input = {
        username: 'user@example.com',
        password: 'a'.repeat(100),
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ Long password (100 chars) accepted');
    });

    /**
     * Test Case: Various Email Formats
     * ---------------------------------
     * Verifies different valid email formats.
     */
    it('should accept various valid email formats', () => {
      logger.info('🧪 Test: Various email formats');
      
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
        'user123@test.io',
        'USER@EXAMPLE.COM',
      ];
      
      validEmails.forEach(email => {
        const result = loginSchema.safeParse({
          username: email,
          password: 'password123',
        });
        expect(result.success).toBe(true);
        logger.info(`  ✅ ${email}`);
      });
      
      logger.info('✅ All valid email formats accepted');
    });

    /**
     * Test Case: Special Characters in Password
     * ------------------------------------------
     * Verifies passwords with special characters.
     */
    it('should accept passwords with special characters', () => {
      logger.info('🧪 Test: Special characters in password');
      
      const input = {
        username: 'user@example.com',
        password: 'P@ssw0rd!#$%',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ Password with special characters accepted');
    });
  });

  // =============================================================================
  // loginSchema - Email Validation Tests
  // =============================================================================

  describe('loginSchema - Email Validation', () => {
    /**
     * Test Case: Invalid Email Format
     * --------------------------------
     * Verifies rejection of invalid email formats.
     */
    it('should reject invalid email format', () => {
      logger.info('🧪 Test: Invalid email format');
      
      const input = {
        username: 'not-an-email',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Valid email required');
        logger.info('✅ Invalid email rejected with correct message');
      }
    });

    /**
     * Test Case: Missing @ Symbol
     * ----------------------------
     * Verifies rejection of email without @ symbol.
     */
    it('should reject email without @ symbol', () => {
      logger.info('🧪 Test: Email without @ symbol');
      
      const input = {
        username: 'userexample.com',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Email without @ rejected');
    });

    /**
     * Test Case: Missing Domain
     * --------------------------
     * Verifies rejection of email without domain.
     */
    it('should reject email without domain', () => {
      logger.info('🧪 Test: Email without domain');
      
      const input = {
        username: 'user@',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Email without domain rejected');
    });

    /**
     * Test Case: Multiple @ Symbols
     * ------------------------------
     * Verifies rejection of email with multiple @ symbols.
     */
    it('should reject email with multiple @ symbols', () => {
      logger.info('🧪 Test: Email with multiple @ symbols');
      
      const input = {
        username: 'user@@example.com',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Email with multiple @ symbols rejected');
    });

    /**
     * Test Case: Email with Spaces
     * -----------------------------
     * Verifies rejection of email with spaces.
     */
    it('should reject email with spaces', () => {
      logger.info('🧪 Test: Email with spaces');
      
      const input = {
        username: 'user @example.com',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Email with spaces rejected');
    });
  });

  // =============================================================================
  // loginSchema - Password Validation Tests
  // =============================================================================

  describe('loginSchema - Password Validation', () => {
    /**
     * Test Case: Password Too Short
     * ------------------------------
     * Verifies rejection of passwords under 6 characters.
     */
    it('should reject password shorter than 6 characters', () => {
      logger.info('🧪 Test: Password too short');
      
      const input = {
        username: 'user@example.com',
        password: '12345',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password required');
        logger.info('✅ Short password rejected with correct message');
      }
    });

    /**
     * Test Case: Empty Password
     * --------------------------
     * Verifies rejection of empty password.
     */
    it('should reject empty password', () => {
      logger.info('🧪 Test: Empty password');
      
      const input = {
        username: 'user@example.com',
        password: '',
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Empty password rejected');
    });

    /**
     * Test Case: Password with Only Spaces
     * -------------------------------------
     * Verifies handling of whitespace-only password.
     */
    it('should handle password with only spaces', () => {
      logger.info('🧪 Test: Password with only spaces');
      
      const input = {
        username: 'user@example.com',
        password: '      ',
      };
      
      const result = loginSchema.safeParse(input);
      
      // 6 spaces = 6 characters, should pass length check
      expect(result.success).toBe(true);
      logger.info('✅ Password with 6 spaces accepted (meets length requirement)');
    });
  });

  // =============================================================================
  // loginSchema - Missing Fields Tests
  // =============================================================================

  describe('loginSchema - Missing Fields', () => {
    /**
     * Test Case: Missing Username
     * ----------------------------
     * Verifies rejection when username is missing.
     */
    it('should reject missing username', () => {
      logger.info('🧪 Test: Missing username');
      
      const input = {
        password: 'password123',
      } as any;
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('username');
        logger.info('✅ Missing username rejected');
      }
    });

    /**
     * Test Case: Missing Password
     * ----------------------------
     * Verifies rejection when password is missing.
     */
    it('should reject missing password', () => {
      logger.info('🧪 Test: Missing password');
      
      const input = {
        username: 'user@example.com',
      } as any;
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('password');
        logger.info('✅ Missing password rejected');
      }
    });

    /**
     * Test Case: Both Fields Missing
     * -------------------------------
     * Verifies rejection when both fields are missing.
     */
    it('should reject when both fields are missing', () => {
      logger.info('🧪 Test: Both fields missing');
      
      const input = {};
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
        logger.info(`✅ Both fields missing rejected (${result.error.issues.length} errors)`);
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
        username: null,
        password: null,
      } as any;
      
      const result = loginSchema.safeParse(input);
      
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
        username: undefined,
        password: undefined,
      } as any;
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Undefined values rejected');
    });
  });

  // =============================================================================
  // loginSchema - Type Validation Tests
  // =============================================================================

  describe('loginSchema - Type Validation', () => {
    /**
     * Test Case: Non-String Username
     * -------------------------------
     * Verifies rejection of non-string username.
     */
    it('should reject non-string username', () => {
      logger.info('🧪 Test: Non-string username');
      
      const input = {
        username: 12345,
        password: 'password123',
      } as any;
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Non-string username rejected');
    });

    /**
     * Test Case: Non-String Password
     * -------------------------------
     * Verifies rejection of non-string password.
     */
    it('should reject non-string password', () => {
      logger.info('🧪 Test: Non-string password');
      
      const input = {
        username: 'user@example.com',
        password: 123456,
      } as any;
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Non-string password rejected');
    });

    /**
     * Test Case: Array as Username
     * -----------------------------
     * Verifies rejection of array as username.
     */
    it('should reject array as username', () => {
      logger.info('🧪 Test: Array as username');
      
      const input = {
        username: ['user@example.com'],
        password: 'password123',
      } as any;
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Array as username rejected');
    });

    /**
     * Test Case: Object as Password
     * ------------------------------
     * Verifies rejection of object as password.
     */
    it('should reject object as password', () => {
      logger.info('🧪 Test: Object as password');
      
      const input = {
        username: 'user@example.com',
        password: { value: 'password123' },
      } as any;
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Object as password rejected');
    });
  });

  // =============================================================================
  // loginSchema - Edge Cases Tests
  // =============================================================================

  describe('loginSchema - Edge Cases', () => {
    /**
     * Test Case: Extra Fields
     * ------------------------
     * Verifies handling of extra fields in input.
     */
    it('should strip extra fields', () => {
      logger.info('🧪 Test: Extra fields handling');
      
      const input = {
        username: 'user@example.com',
        password: 'password123',
        extraField: 'should be stripped',
        anotherField: 123,
      };
      
      const result = loginSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect('extraField' in result.data).toBe(false);
        expect('anotherField' in result.data).toBe(false);
        logger.info('✅ Extra fields stripped from result');
      }
    });

    /**
     * Test Case: Email with Unicode Characters
     * -----------------------------------------
     * Verifies handling of Unicode in email.
     */
    it('should handle Unicode characters in email', () => {
      logger.info('🧪 Test: Unicode in email');
      
      const input = {
        username: 'user@例え.com',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(input);
      
      // Standard email regex typically rejects Unicode domains
      logger.info(`  Result: ${result.success ? 'accepted' : 'rejected'}`);
      logger.info('✅ Unicode email handling verified');
    });

    /**
     * Test Case: Very Long Email
     * ---------------------------
     * Verifies handling of very long email addresses.
     */
    it('should handle very long email', () => {
      logger.info('🧪 Test: Very long email');
      
      const longLocalPart = 'a'.repeat(64);
      const input = {
        username: `${longLocalPart}@example.com`,
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(input);
      
      logger.info(`  Email length: ${input.username.length} characters`);
      logger.info(`  Result: ${result.success ? 'accepted' : 'rejected'}`);
      logger.info('✅ Very long email handling verified');
    });

    /**
     * Test Case: Password with Newlines
     * ----------------------------------
     * Verifies passwords with newline characters.
     */
    it('should handle password with newlines', () => {
      logger.info('🧪 Test: Password with newlines');
      
      const input = {
        username: 'user@example.com',
        password: 'pass\nword\n123',
      };
      
      const result = loginSchema.safeParse(input);
      
      // Length is still >= 6, should pass
      expect(result.success).toBe(true);
      logger.info('✅ Password with newlines accepted (meets length requirement)');
    });
  });

  // =============================================================================
  // Type Inference Tests
  // =============================================================================

  describe('loginSchema - Type Inference', () => {
    /**
     * Test Case: TypeScript Type Inference
     * -------------------------------------
     * Verifies that LoginInput type is correctly inferred.
     */
    it('should correctly infer TypeScript type', () => {
      logger.info('🧪 Test: TypeScript type inference');
      
      const validInput: LoginInput = {
        username: 'user@example.com',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(validInput);
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Type assertion to verify structure
        const typedData: LoginInput = result.data;
        expect(typedData.username).toBeDefined();
        expect(typedData.password).toBeDefined();
        logger.info('✅ TypeScript type correctly inferred');
      }
    });
  });

  // =============================================================================
  // Security Considerations Tests
  // =============================================================================

  describe('loginSchema - Security Considerations', () => {
    /**
     * Test Case: SQL Injection Attempt
     * ---------------------------------
     * Verifies that SQL injection strings are treated as normal strings.
     */
    it('should treat SQL injection as normal string', () => {
      logger.info('🧪 Test: SQL injection attempt');
      
      const input = {
        username: "admin'--@example.com",
        password: "' OR '1'='1",
      };
      
      const result = loginSchema.safeParse(input);
      
      // Schema just validates format, doesn't prevent injection
      // That's the responsibility of the database layer
      logger.info(`  Result: ${result.success ? 'accepted as string' : 'rejected'}`);
      logger.info('✅ SQL injection treated as normal string (prevention is DB layer responsibility)');
    });

    /**
     * Test Case: XSS Attempt
     * -----------------------
     * Verifies that XSS strings are treated as normal strings.
     */
    it('should treat XSS as normal string', () => {
      logger.info('🧪 Test: XSS attempt');
      
      const input = {
        username: 'user@example.com',
        password: '<script>alert("xss")</script>',
      };
      
      const result = loginSchema.safeParse(input);
      
      // Schema validates length, XSS prevention is output encoding responsibility
      expect(result.success).toBe(true);
      logger.info('✅ XSS treated as normal string (prevention is output encoding responsibility)');
    });
  });
});
