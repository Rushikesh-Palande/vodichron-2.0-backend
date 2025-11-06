/**
 * Get User By ID Schema
 * ======================
 * Zod validation schema for getting user by employeeId.
 * 
 * Based on old backend: userController.get (lines 165-185)
 * 
 * Endpoint: GET /user/:id
 * Params: { id: employeeId (UUID) }
 * Authorization: Employees can only view themselves
 * Response: User data with password blanked out
 */

import { z } from 'zod';

/**
 * Get User By ID Params Schema
 * =============================
 * Validates employeeId from URL params
 */
export const getUserByIdParamsSchema = z.object({
  id: z.string()
    .uuid('Invalid employee ID format')
    .min(1, 'Employee ID is required')
});

export type GetUserByIdParams = z.infer<typeof getUserByIdParamsSchema>;
