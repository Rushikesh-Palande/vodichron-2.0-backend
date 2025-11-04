/**
 * Get Employee Image Schemas
 * ==========================
 * 
 * Zod validation schemas for employee image retrieval.
 * Based on: old vodichron getEmployeeImage controller (lines 457-471)
 * 
 * Flow:
 * 1. Fetch employee by UUID
 * 2. Check if employee has uploaded photo
 * 3. Return photo file or default nouser.png
 * 
 * Authorization:
 * - No explicit authorization in old code (public endpoint)
 * - Any authenticated user can view any employee's photo
 */

import { z } from 'zod';

/**
 * Get Employee Image Input Schema
 * ===============================
 * 
 * Validates URL parameter (employee UUID).
 * Old code (line 458): const { params } = req;
 */
export const getImageInputSchema = z.object({
  id: z
    .string()
    .uuid('Invalid employee ID format')
    .describe('Employee UUID'),
});

export type GetImageInput = z.infer<typeof getImageInputSchema>;
