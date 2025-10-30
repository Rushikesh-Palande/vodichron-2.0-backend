import { z } from 'zod';

/**
 * User Schemas (Zod)
 * ===================
 * Validation schemas for user tRPC procedures and REST endpoints
 */

/**
 * Get User Profile Schema
 * -----------------------
 * No input required - returns current authenticated user's profile
 */
export const getUserProfileSchema = z.object({
  // No input needed - profile is based on JWT token
});

export type GetUserProfileInput = z.infer<typeof getUserProfileSchema>;
