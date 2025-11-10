/**
 * Validate Reset Link Schema Test Suite
 * =======================================
 * 
 * Tests the validateResetLinkSchema Zod validation for verifying
 * password reset link validity before allowing password change.
 * 
 * Test Coverage:
 * ✅ Valid validation input
 * ✅ Reset token (sec) validation (required)
 * ✅ Optional key parameter validation
 * ✅ Missing field handling
 * ✅ Type validation
 * ✅ Edge cases and security
 * ✅ URL obfuscation scenarios
 * 
 * Schema Requirements:
 * - key: optional string (for URL obfuscation)
 * - sec: required reset token string (min 1 char, encrypted)
 */

import { validateResetLinkSchema, type ValidateResetLinkInput } from '../../schemas/validate-reset-link.schema';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Validate Reset Link Schema', () => {
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
     * Test Case: Valid Input with Both Fields
     * ----------------------------------------
     * Verifies validation with both key and sec.
     */
    it('should validate with both key and sec', () => {
      logger.info('🧪 Test: Valid input with both fields');
      
      const input = {
        key: 'random-obfuscation-string-123',
        sec: 'encrypted-reset-token-abc',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('random-obfuscation-string-123');
        expect(result.data.sec).toBe('encrypted-reset-token-abc');
        logger.info('✅ Both fields validated');
      }
    });

    /**
     * Test Case: Valid Input with Only Required Field (sec)
     * ------------------------------------------------------
     * Verifies validation with only the required sec field.
     */
    it('should validate with only required sec field', () => {
      logger.info('🧪 Test: Valid input with only sec');
      
      const input = {
        sec: 'encrypted-reset-token-xyz',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sec).toBe('encrypted-reset-token-xyz');
        expect(result.data.key).toBeUndefined();
        logger.info('✅ Only required field validated (key optional)');
      }
    });

    /**
     * Test Case: Various Token Formats
     * ---------------------------------
     * Verifies different valid token formats.
     */
    it('should accept various token formats', () => {
      logger.info('🧪 Test: Various token formats');
      
      const validTokens = [
        'a',                                  // Single character
        'short-token',                        // Short token
        'long-encrypted-token-with-many-hyphens-and-numbers-123456789',
        'TOKEN_WITH_UNDERSCORES',
        'MixedCaseToken123',
        'token.with.dots',
        'token+with+plus',
      ];
      
      validTokens.forEach(token => {
        const result = validateResetLinkSchema.safeParse({ sec: token });
        expect(result.success).toBe(true);
        logger.info(`  ✅ Token length: ${token.length}`);
      });
      
      logger.info('✅ All valid token formats accepted');
    });

    /**
     * Test Case: Various Key Formats
     * -------------------------------
     * Verifies different valid key formats (optional obfuscation).
     */
    it('should accept various key formats', () => {
      logger.info('🧪 Test: Various key formats');
      
      const validKeys = [
        'simple',
        'random-string-123',
        'UPPERCASE_KEY',
        'key.with.dots',
        'very-long-obfuscation-key-with-many-characters',
      ];
      
      validKeys.forEach(key => {
        const result = validateResetLinkSchema.safeParse({
          key,
          sec: 'token123',
        });
        expect(result.success).toBe(true);
        logger.info(`  ✅ ${key}`);
      });
      
      logger.info('✅ All valid key formats accepted');
    });

    /**
     * Test Case: Empty Optional Key
     * ------------------------------
     * Verifies that empty key string is accepted (it's optional).
     */
    it('should accept empty optional key string', () => {
      logger.info('🧪 Test: Empty optional key');
      
      const input = {
        key: '',
        sec: 'token123',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ Empty optional key accepted');
    });
  });

  // =============================================================================
  // Reset Token (sec) Validation Tests
  // =============================================================================

  describe('Reset Token (sec) Validation', () => {
    /**
     * Test Case: Missing sec Field
     * -----------------------------
     * Verifies rejection when required sec is missing.
     */
    it('should reject missing sec field', () => {
      logger.info('🧪 Test: Missing sec field');
      
      const input = {
        key: 'optional-key',
      } as any;
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('sec');
        logger.info('✅ Missing sec field rejected');
      }
    });

    /**
     * Test Case: Empty sec String
     * ----------------------------
     * Verifies rejection of empty sec (required, min 1).
     */
    it('should reject empty sec string', () => {
      logger.info('🧪 Test: Empty sec string');
      
      const input = {
        sec: '',
        key: 'optional-key',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Reset token is required');
        logger.info('✅ Empty sec rejected with correct message');
      }
    });

    /**
     * Test Case: Whitespace-Only sec
     * -------------------------------
     * Verifies handling of whitespace-only token.
     */
    it('should handle whitespace-only sec', () => {
      logger.info('🧪 Test: Whitespace-only sec');
      
      const input = {
        sec: '   ',
        key: 'optional-key',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      // 3 spaces = 3 characters, passes min(1) check
      expect(result.success).toBe(true);
      logger.info('✅ Whitespace-only sec accepted (meets length requirement)');
    });

    /**
     * Test Case: Very Long Token
     * ---------------------------
     * Verifies handling of very long tokens.
     */
    it('should accept very long tokens', () => {
      logger.info('🧪 Test: Very long token');
      
      const longToken = 'a'.repeat(1000);
      const input = {
        sec: longToken,
        key: 'optional-key',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info(`✅ Very long token (${longToken.length} chars) accepted`);
    });
  });

  // =============================================================================
  // Optional Key Validation Tests
  // =============================================================================

  describe('Optional Key Validation', () => {
    /**
     * Test Case: Missing key Field (Optional)
     * ----------------------------------------
     * Verifies that key is truly optional.
     */
    it('should accept missing key field', () => {
      logger.info('🧪 Test: Missing optional key');
      
      const input = {
        sec: 'token123',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBeUndefined();
        logger.info('✅ Missing key accepted (optional field)');
      }
    });

    /**
     * Test Case: Undefined key
     * -------------------------
     * Verifies explicit undefined is accepted.
     */
    it('should accept undefined key', () => {
      logger.info('🧪 Test: Undefined key');
      
      const input = {
        sec: 'token123',
        key: undefined,
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ Undefined key accepted');
    });

    /**
     * Test Case: Null key
     * --------------------
     * Verifies that null key is rejected (must be string or undefined).
     */
    it('should reject null key', () => {
      logger.info('🧪 Test: Null key');
      
      const input = {
        sec: 'token123',
        key: null,
      } as any;
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Null key rejected (must be string or undefined)');
    });
  });

  // =============================================================================
  // Missing/Null Fields Tests
  // =============================================================================

  describe('Missing/Null Fields', () => {
    /**
     * Test Case: Both Fields Missing
     * -------------------------------
     * Verifies rejection when required sec is missing.
     */
    it('should reject when both fields are missing', () => {
      logger.info('🧪 Test: Both fields missing');
      
      const input = {};
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // Only sec is required
        expect(result.error.issues[0].path[0]).toBe('sec');
        logger.info('✅ Both fields missing rejected (sec required)');
      }
    });

    /**
     * Test Case: Null sec Value
     * --------------------------
     * Verifies rejection of null sec.
     */
    it('should reject null sec value', () => {
      logger.info('🧪 Test: Null sec value');
      
      const input = {
        sec: null,
        key: 'optional-key',
      } as any;
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Null sec rejected');
    });

    /**
     * Test Case: Undefined sec Value
     * -------------------------------
     * Verifies rejection of undefined sec.
     */
    it('should reject undefined sec value', () => {
      logger.info('🧪 Test: Undefined sec value');
      
      const input = {
        sec: undefined,
        key: 'optional-key',
      } as any;
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(false);
      logger.info('✅ Undefined sec rejected');
    });
  });

  // =============================================================================
  // Type Validation Tests
  // =============================================================================

  describe('Type Validation', () => {
    /**
     * Test Case: Non-String sec Type
     * -------------------------------
     * Verifies rejection of non-string sec.
     */
    it('should reject non-string sec types', () => {
      logger.info('🧪 Test: Non-string sec types');
      
      const invalidTypes = [
        { value: 12345, type: 'number' },
        { value: true, type: 'boolean' },
        { value: ['token'], type: 'array' },
        { value: { token: 'value' }, type: 'object' },
      ];
      
      invalidTypes.forEach(({ value, type }) => {
        const result = validateResetLinkSchema.safeParse({
          sec: value,
          key: 'optional-key',
        } as any);
        expect(result.success).toBe(false);
        logger.info(`  ✅ Rejected ${type} type`);
      });
      
      logger.info('✅ All non-string sec types rejected');
    });

    /**
     * Test Case: Non-String key Type
     * -------------------------------
     * Verifies rejection of non-string key.
     */
    it('should reject non-string key types', () => {
      logger.info('🧪 Test: Non-string key types');
      
      const invalidTypes = [
        { value: 12345, type: 'number' },
        { value: true, type: 'boolean' },
        { value: ['key'], type: 'array' },
        { value: { key: 'value' }, type: 'object' },
      ];
      
      invalidTypes.forEach(({ value, type }) => {
        const result = validateResetLinkSchema.safeParse({
          sec: 'token123',
          key: value,
        } as any);
        expect(result.success).toBe(false);
        logger.info(`  ✅ Rejected ${type} type`);
      });
      
      logger.info('✅ All non-string key types rejected');
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
        sec: 'token123',
        key: 'optional-key',
        extraField: 'should be removed',
        anotherField: 123,
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect('extraField' in result.data).toBe(false);
        expect('anotherField' in result.data).toBe(false);
        logger.info('✅ Extra fields stripped');
      }
    });

    /**
     * Test Case: Special Characters in Token
     * ---------------------------------------
     * Verifies handling of special characters.
     */
    it('should handle special characters in token', () => {
      logger.info('🧪 Test: Special characters in token');
      
      const specialTokens = [
        'token-with-hyphens',
        'token_with_underscores',
        'token.with.dots',
        'token+with+plus',
        'token=with=equals',
        'token/with/slashes',
      ];
      
      specialTokens.forEach(token => {
        const result = validateResetLinkSchema.safeParse({ sec: token });
        expect(result.success).toBe(true);
        logger.info(`  ✅ ${token}`);
      });
      
      logger.info('✅ All special character tokens accepted');
    });

    /**
     * Test Case: URL-Encoded Token
     * -----------------------------
     * Verifies handling of URL-encoded tokens.
     */
    it('should handle URL-encoded tokens', () => {
      logger.info('🧪 Test: URL-encoded token');
      
      const input = {
        sec: 'token%20with%20encoded%20spaces',
        key: 'key%2Bwith%2Bplus',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ URL-encoded tokens accepted');
    });

    /**
     * Test Case: Unicode Characters
     * ------------------------------
     * Verifies handling of Unicode in tokens.
     */
    it('should handle Unicode characters', () => {
      logger.info('🧪 Test: Unicode characters');
      
      const input = {
        sec: 'token-with-émojis-🔐',
        key: 'key-测试',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      logger.info('✅ Unicode characters accepted');
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
      
      const input: ValidateResetLinkInput = {
        sec: 'token123',
        key: 'optional-key',
      };
      
      const result = validateResetLinkSchema.safeParse(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const typedData: ValidateResetLinkInput = result.data;
        expect(typedData.sec).toBeDefined();
        logger.info('✅ TypeScript type correctly inferred');
      }
    });

    /**
     * Test Case: Optional Key Type
     * -----------------------------
     * Verifies that key is typed as optional.
     */
    it('should type key as optional', () => {
      logger.info('🧪 Test: Optional key type');
      
      // TypeScript should allow this without key
      const input1: ValidateResetLinkInput = {
        sec: 'token123',
      };
      
      // TypeScript should also allow this with key
      const input2: ValidateResetLinkInput = {
        sec: 'token123',
        key: 'optional-key',
      };
      
      const result1 = validateResetLinkSchema.safeParse(input1);
      const result2 = validateResetLinkSchema.safeParse(input2);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      logger.info('✅ Optional key type correctly inferred');
    });
  });

  // =============================================================================
  // Real-World Scenarios Tests
  // =============================================================================

  describe('Real-World Scenarios', () => {
    /**
     * Test Case: URL with Obfuscation Key
     * ------------------------------------
     * Simulates URL: /reset?key=random123&sec=encrypted-token
     */
    it('should handle URL with obfuscation key', () => {
      logger.info('🧪 Test: URL with obfuscation key');
      
      // Simulate parsing query params from URL
      logger.info('🔄 Step 1: User clicks link...');
      logger.info('  URL: https://app.com/reset?key=abc123&sec=xyz789');
      
      const urlParams = {
        key: 'abc123',
        sec: 'xyz789',
      };
      
      logger.info('🔄 Step 2: Validating URL parameters...');
      const result = validateResetLinkSchema.safeParse(urlParams);
      
      expect(result.success).toBe(true);
      logger.info('✅ Step 2: URL parameters validated');
      
      if (result.success) {
        logger.info('🔄 Step 3: Token would be verified (simulated)...');
        logger.info(`  Obfuscation key: ${result.data.key}`);
        logger.info(`  Reset token: ${result.data.sec}`);
        logger.info('✅ Step 3: Link validation complete');
      }
      
      logger.info('✅ URL with obfuscation flow validated');
    });

    /**
     * Test Case: URL without Obfuscation Key
     * ---------------------------------------
     * Simulates simpler URL: /reset?sec=encrypted-token
     */
    it('should handle URL without obfuscation key', () => {
      logger.info('🧪 Test: URL without obfuscation key');
      
      logger.info('🔄 Step 1: User clicks simple reset link...');
      logger.info('  URL: https://app.com/reset?sec=xyz789');
      
      const urlParams = {
        sec: 'xyz789',
      };
      
      logger.info('🔄 Step 2: Validating URL parameters...');
      const result = validateResetLinkSchema.safeParse(urlParams);
      
      expect(result.success).toBe(true);
      logger.info('✅ Step 2: URL parameters validated');
      
      if (result.success) {
        logger.info('🔄 Step 3: Token would be verified (simulated)...');
        logger.info(`  Reset token: ${result.data.sec}`);
        logger.info('✅ Step 3: Link validation complete');
      }
      
      logger.info('✅ Simple URL flow validated');
    });

    /**
     * Test Case: Expired/Invalid Link
     * --------------------------------
     * Simulates handling of invalid link.
     */
    it('should handle expired or invalid link', () => {
      logger.info('🧪 Test: Expired/invalid link');
      
      logger.info('🔄 Step 1: User clicks old/invalid link...');
      logger.info('  URL: https://app.com/reset?sec=');
      
      const urlParams = {
        sec: '', // Empty token from malformed URL
      };
      
      logger.info('🔄 Step 2: Validating URL parameters...');
      const result = validateResetLinkSchema.safeParse(urlParams);
      
      expect(result.success).toBe(false);
      logger.info('✅ Step 2: Invalid link rejected');
      logger.info('   User would see "Invalid or expired link" message');
      
      logger.info('✅ Invalid link handling validated');
    });

    /**
     * Test Case: Tampered URL
     * ------------------------
     * Simulates detection of tampered parameters.
     */
    it('should detect tampered URL parameters', () => {
      logger.info('🧪 Test: Tampered URL parameters');
      
      const tamperedInputs = [
        { sec: null, description: 'Null sec' },
        { sec: undefined, description: 'Missing sec' },
        { description: 'No parameters' },
      ];
      
      tamperedInputs.forEach(({ sec, description }) => {
        const result = validateResetLinkSchema.safeParse({ sec } as any);
        expect(result.success).toBe(false);
        logger.info(`  ✅ Rejected: ${description}`);
      });
      
      logger.info('✅ All tampered URLs rejected');
    });
  });

  // =============================================================================
  // Security Considerations Tests
  // =============================================================================

  describe('Security Considerations', () => {
    /**
     * Test Case: Obfuscation Key Purpose
     * -----------------------------------
     * Documents the purpose of the optional key.
     */
    it('should document obfuscation key purpose', () => {
      logger.info('🧪 Test: Obfuscation key purpose');
      
      logger.info('📋 Obfuscation Key (optional):');
      logger.info('   Purpose: Makes URLs less predictable');
      logger.info('   Security: NOT for authentication (sec token is)');
      logger.info('   Usage: Can be random string in URL');
      logger.info('   Benefit: Prevents token enumeration from URL patterns');
      logger.info('   Note: Schema validates format, not security');
      
      expect(true).toBe(true); // Documentation test
      logger.info('✅ Obfuscation key purpose documented');
    });

    /**
     * Test Case: Token Security Requirements
     * ---------------------------------------
     * Documents reset token security.
     */
    it('should document token security requirements', () => {
      logger.info('🧪 Test: Token security requirements');
      
      logger.info('📋 Reset Token Security:');
      logger.info('   1. sec is the actual authentication token');
      logger.info('   2. Token should be encrypted/signed');
      logger.info('   3. Token should have expiration');
      logger.info('   4. Token should be single-use');
      logger.info('   5. Verification happens in service layer');
      logger.info('   6. Schema only validates presence/format');
      
      expect(true).toBe(true); // Documentation test
      logger.info('✅ Token security requirements documented');
    });

    /**
     * Test Case: URL Safety
     * ----------------------
     * Documents URL parameter safety.
     */
    it('should document URL parameter safety', () => {
      logger.info('🧪 Test: URL parameter safety');
      
      logger.info('📋 URL Parameter Safety:');
      logger.info('   1. Never trust client-provided parameters');
      logger.info('   2. Always verify token signature/encryption');
      logger.info('   3. Check token expiration server-side');
      logger.info('   4. Validate against database records');
      logger.info('   5. Schema validation is first line of defense');
      logger.info('   6. Service layer provides security enforcement');
      
      expect(true).toBe(true); // Documentation test
      logger.info('✅ URL parameter safety documented');
    });
  });
});
