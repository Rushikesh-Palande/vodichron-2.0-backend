import { z } from 'zod';

/**
 * User Registration Schemas (Zod)
 * ================================
 * Validation schemas for registering application users (grant access)
 * Based on old backend POST /user/register logic
 */

/**
 * Password validation regex from old backend
 * Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

/**
 * Application User Roles (matching old backend enum)
 */
export const ApplicationUserRole = {
  superUser: 'super_user',
  manager: 'manager',
  hr: 'hr',
  employee: 'employee',
  director: 'director',
} as const;

export type ApplicationUserRoleType = typeof ApplicationUserRole[keyof typeof ApplicationUserRole];

/**
 * Register User Input Schema
 * ---------------------------
 * POST /user/register body validation
 */
export const registerUserInputSchema = z.object({
  employeeId: z.string().uuid('Valid employee UUID required'),
  password: z
    .string()
    .min(8, 'Password must be minimum eight characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    ),
  confirmPassword: z.string().optional(),
  role: z.enum(
    [
      ApplicationUserRole.superUser,
      ApplicationUserRole.manager,
      ApplicationUserRole.hr,
      ApplicationUserRole.employee,
      ApplicationUserRole.director,
    ],
    { message: 'Select application user role' }
  ),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: 'Confirm password not matched',
  path: ['confirmPassword'],
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

/**
 * Register User Output Schema
 * ----------------------------
 * Response format
 */
export const registerUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
});

export type RegisterUserOutput = z.infer<typeof registerUserOutputSchema>;
