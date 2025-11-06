/**
 * Check User Exists Schema
 * =========================
 * Zod validation schema for checking if user exists by email.
 * 
 * Based on old backend: userController.checkIfUserExists (lines 64-72)
 * 
 * Endpoint: POST /user/check-exists
 * Request body: { email: string }
 * Response: boolean (true if exists, false otherwise)
 */

import { z } from 'zod';

/**
 * Check User Exists Input Schema
 * ===============================
 * Validates email format for user existence check
 */
export const checkUserExistsInputSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .toLowerCase()
    .trim()
});

export type CheckUserExistsInput = z.infer<typeof checkUserExistsInputSchema>;
