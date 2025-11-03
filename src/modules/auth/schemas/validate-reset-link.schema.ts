import { z } from 'zod';

/**
 * Validate Reset Link Schema
 * ==========================
 * Validation schema for verifying password reset link validity.
 * 
 * Validates:
 * - Reset token presence
 * - Optional key parameter from URL
 */

/**
 * Validate Reset Link Schema
 * -------------------------
 * Validates reset token for link verification
 */
export const validateResetLinkSchema = z.object({
  key: z.string().optional(), // Optional random string from URL (for obfuscation)
  sec: z.string().min(1, 'Reset token is required'), // Encrypted token
});

export type ValidateResetLinkInput = z.infer<typeof validateResetLinkSchema>;
