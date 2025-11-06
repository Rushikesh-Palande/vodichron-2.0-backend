/**
 * Update Password Schema
 * =======================
 * Zod validation schema for updating user password.
 * 
 * Based on old backend: userController.updatePassword (lines 112-127)
 * 
 * Endpoint: POST /user/update-password
 * Request body: { id: employeeId, oldPassword: string, newPassword: string }
 * Authorization: User can only update their own password
 */

import { z } from 'zod';

/**
 * Password Validation Regex
 * ==========================
 * Minimum 8 characters, at least one letter and one number
 * Matches old backend: src/controllers/validations/validation.ts
 */
export const PasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

/**
 * Update Password Input Schema
 * =============================
 * Validates old and new passwords for password update
 */
export const updatePasswordInputSchema = z.object({
  id: z.string()
    .uuid('Invalid employee ID format')
    .min(1, 'Employee ID is required'),
  oldPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(PasswordRegex, 'New password must contain at least one letter and one number')
});

export type UpdatePasswordInput = z.infer<typeof updatePasswordInputSchema>;
