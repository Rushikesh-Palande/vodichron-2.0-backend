import { z } from 'zod';

/**
 * Get Next Task ID Schema
 * ========================
 * Zod validation schema for getting next task ID
 */

/**
 * Get Next Task ID Input Schema
 * ------------------------------
 * Validates input for getting the next available task ID
 */
export const getNextTaskIdSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
});

/**
 * TypeScript Type
 * ---------------
 */
export type GetNextTaskIdInput = z.infer<typeof getNextTaskIdSchema>;
