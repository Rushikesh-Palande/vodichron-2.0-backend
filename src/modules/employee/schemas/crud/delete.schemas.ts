/**
 * Delete Employee Schemas
 * =======================
 * 
 * Zod schemas for delete employee operation.
 * Validates employee UUID for deletion.
 * 
 * Based on: old vodichron deleteEmployee controller
 * Location: vodichron-backend-master/src/controllers/employeeController.ts (line 163-171)
 * 
 * Validation Rules:
 * - employeeUuid: Required string in UUID v4 format
 */

import { z } from 'zod';

/**
 * Delete Employee Input Schema
 * ============================
 * 
 * Validates the employee UUID to be deleted.
 * UUID v4 format validation ensures data integrity.
 * 
 * Example:
 * {
 *   employeeUuid: "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
export const deleteEmployeeSchema = z.object({
  employeeUuid: z
    .string()
    .uuid('Employee UUID must be a valid UUID v4')
    .describe('UUID of the employee to delete'),
});

/**
 * Type Inference
 * ==============
 * TypeScript type inferred from Zod schema
 */
export type DeleteEmployeeInput = z.infer<typeof deleteEmployeeSchema>;

/**
 * Delete Employee Output Schema
 * =============================
 * 
 * Success response for delete operation.
 * 
 * Example:
 * {
 *   success: true,
 *   message: "Employee deleted successfully"
 * }
 */
export const deleteEmployeeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteEmployeeOutput = z.infer<typeof deleteEmployeeOutputSchema>;
