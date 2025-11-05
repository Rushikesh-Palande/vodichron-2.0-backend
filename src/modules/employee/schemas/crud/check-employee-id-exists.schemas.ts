import { z } from 'zod';

/**
 * Check Employee ID Exists Schema
 * ================================
 * Validates input for checking if an employee ID already exists
 * Used for real-time form validation on the frontend
 */

/**
 * Check Employee ID Exists Input Schema
 * --------------------------------------
 * Validates employee ID for existence check
 */
export const checkEmployeeIdExistsSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
});

/**
 * TypeScript Type for Check Employee ID Exists Input
 * ---------------------------------------------------
 * Inferred from Zod schema for type safety
 */
export type CheckEmployeeIdExistsInput = z.infer<typeof checkEmployeeIdExistsSchema>;
