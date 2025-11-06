/**
 * Delete User Schema
 * ===================
 * Zod validation schema for deleting user by employeeId.
 * 
 * Based on old backend: userController.deleteUser (lines 74-83)
 * 
 * Endpoint: DELETE /user/:id
 * Params: { id: employeeId (UUID) }
 * Authorization: Admin/HR/SuperUser only
 */

import { z } from 'zod';

/**
 * Delete User Params Schema
 * ==========================
 * Validates employeeId from URL params
 */
export const deleteUserParamsSchema = z.object({
  id: z.string()
    .uuid('Invalid employee ID format')
    .min(1, 'Employee ID is required')
});

export type DeleteUserParams = z.infer<typeof deleteUserParamsSchema>;
