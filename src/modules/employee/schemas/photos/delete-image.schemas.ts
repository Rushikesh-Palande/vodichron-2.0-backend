/**
 * Delete Employee Image Schemas
 * ==============================
 * 
 * Zod validation schemas for employee image deletion.
 * Based on: old vodichron deleteEmployeeImage controller (lines 473-488)
 * 
 * Flow:
 * 1. Fetch employee by UUID
 * 2. If employee has photo, delete file from filesystem
 * 3. Set recentPhotograph field to empty string in database
 * 
 * Authorization:
 * - No explicit authorization check in old code
 * - Typically should be self or HR/Admin only (to be implemented in service)
 */

import { z } from 'zod';

/**
 * Delete Employee Image Input Schema
 * ==================================
 * 
 * Validates URL parameter (employee UUID).
 * Old code (line 474): const { params } = req;
 */
export const deleteImageInputSchema = z.object({
  id: z
    .string()
    .uuid('Invalid employee ID format')
    .describe('Employee UUID'),
});

export type DeleteImageInput = z.infer<typeof deleteImageInputSchema>;

/**
 * Delete Employee Image Output Schema
 * ===================================
 * 
 * Success response structure.
 * Old code returns: res.status(200).send('OK')
 */
export const deleteImageOutputSchema = z.object({
  success: z.boolean().describe('Whether deletion was successful'),
  message: z.string().describe('Success message'),
});

export type DeleteImageOutput = z.infer<typeof deleteImageOutputSchema>;
