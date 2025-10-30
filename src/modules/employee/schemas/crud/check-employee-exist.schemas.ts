import { z } from 'zod';

/**
 * Check Employee Exist Schema
 * ============================
 * Validates input for checking if an employee email already exists
 * Used for form validation on the frontend
 */

/**
 * Check Employee Exist Input Schema
 * ----------------------------------
 * Validates email and email type for existence check
 */
export const checkEmployeeExistSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter valid email address'),
  emailType: z.enum(['personalEmail', 'officialEmailId'], {
    message: 'Email type must be either personalEmail or officialEmailId'
  })
});

/**
 * TypeScript Type for Check Employee Exist Input
 * -----------------------------------------------
 * Inferred from Zod schema for type safety
 */
export type CheckEmployeeExistInput = z.infer<typeof checkEmployeeExistSchema>;
