/**
 * Update User Activity Schema
 * ============================
 * Zod validation schema for tracking user activities.
 * 
 * Based on old backend: userController.updateUserActivity (lines 187-205)
 * 
 * Endpoint: POST /user/activity
 * Request body: { employeeId, activityName, value }
 * Authorization: User can only update their own activities
 * 
 * Used for tracking events like:
 * - FIRST_PASSWORD_CHANGE
 * - Other activity milestones
 */

import { z } from 'zod';

/**
 * Update User Activity Input Schema
 * ==================================
 * Validates activity tracking data
 */
export const updateUserActivityInputSchema = z.object({
  employeeId: z.string()
    .uuid('Invalid employee ID format')
    .min(1, 'Employee ID is required'),
  activityName: z.string()
    .min(1, 'Activity name is required')
    .trim(),
  value: z.string()
    .min(1, 'Activity value is required')
});

export type UpdateUserActivityInput = z.infer<typeof updateUserActivityInputSchema>;
