/**
 * Update User Schema
 * ===================
 * Zod validation schema for updating user data (PATCH).
 * 
 * Based on old backend: userController.patch (lines 129-163)
 * 
 * Endpoint: PATCH /user
 * Request body: { uuid?, employeeId, password?, role, status? }
 * Authorization: 
 * - Employees can only update themselves
 * - Only SuperUsers can assign SuperUser role
 * - Admin/HR/SuperUser can update any user
 */

import { z } from 'zod';

/**
 * Application User Role Enum
 * ===========================
 * Must match database ENUM values exactly
 */
export enum ApplicationUserRole {
  superUser = 'super_user',
  hr = 'hr',
  employee = 'employee',
  manager = 'manager',
  director = 'director',
  customer = 'customer'
}

export type ApplicationUserRoleType = `${ApplicationUserRole}`;

/**
 * User Status Enum
 * ================
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

/**
 * Password Validation Regex
 * ==========================
 * Minimum 8 characters, at least one letter and one number
 */
export const PasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

/**
 * Update User Input Schema
 * =========================
 * Validates user update data (role, password, status)
 */
export const updateUserInputSchema = z.object({
  uuid: z.string()
    .uuid('Invalid user UUID format')
    .optional(),
  employeeId: z.string()
    .uuid('Invalid employee ID format')
    .min(1, 'Employee ID is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PasswordRegex, 'Password must contain at least one letter and one number')
    .optional(),
  role: z.nativeEnum(ApplicationUserRole, {
    message: 'Invalid role. Must be one of: super_user, hr, employee, manager, director, customer'
  }),
  status: z.nativeEnum(UserStatus, {
    message: 'Invalid status. Must be ACTIVE or INACTIVE'
  }).optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
