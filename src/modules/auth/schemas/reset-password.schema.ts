import { z } from 'zod';

/**
 * Reset Password Schema
 * =====================
 * Validation schema for password reset with new password.
 * 
 * Validates:
 * - Email address format
 * - Reset token presence
 * - Password strength and complexity
 * 
 * Password Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (@$!%*?&)
 */

/**
 * Reset Password Schema
 * --------------------
 * Validates new password and reset token for password reset
 */
export const resetPasswordSchema = z.object({
  email: z.string().email('Valid email address required'),
  sec: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
