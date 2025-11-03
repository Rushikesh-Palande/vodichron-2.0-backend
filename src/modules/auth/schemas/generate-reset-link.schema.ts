import { z } from 'zod';

/**
 * Generate Reset Link Schema
 * ==========================
 * Validation schema for password reset link generation request.
 * 
 * Validates:
 * - Email address format
 * - Required field presence
 */

/**
 * Generate Reset Link Schema
 * -------------------------
 * Validates email for password reset request
 */
export const generateResetLinkSchema = z.object({
  username: z.string().email('Valid email address required'),
});

export type GenerateResetLinkInput = z.infer<typeof generateResetLinkSchema>;
