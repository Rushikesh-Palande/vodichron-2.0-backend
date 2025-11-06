/**
 * Update Master Data Schemas
 * ==========================
 * Zod validation schemas for updating master data configuration
 * 
 * Based on: old vodichron masterDataController.patch
 * Pattern: Input validation with Zod for type safety
 */

import { z } from 'zod';

/**
 * Single Master Field Schema
 * --------------------------
 * Represents a single master field to be updated
 * 
 * Fields:
 * - name: The key/name of the master field (e.g., 'designation', 'department')
 * - value: Array of string values for this field
 * 
 * Validation Rules:
 * - name: Required, non-empty string, min 2 characters
 * - value: Required array of strings, at least 1 item, each non-empty
 */
export const masterFieldSchema = z.object({
  name: z.string()
    .min(2, 'Master field name must be at least 2 characters')
    .max(100, 'Master field name must not exceed 100 characters'),
  
  value: z.array(
    z.string()
      .min(1, 'Each value must be a non-empty string')
      .max(200, 'Each value must not exceed 200 characters')
  )
    .min(1, 'Master field must have at least one value')
    .max(100, 'Master field cannot have more than 100 values')
});

/**
 * Update Master Data Input Schema
 * -------------------------------
 * Schema for batch updating multiple master fields
 * 
 * Old code receives: MasterField[] directly in req.body
 * New code wraps in: { masterFields: MasterField[] }
 * 
 * Validation:
 * - Must have at least 1 master field to update
 * - Maximum 50 fields per batch (performance limit)
 * - Each field must pass masterFieldSchema validation
 */
export const updateMasterDataInputSchema = z.object({
  masterFields: z.array(masterFieldSchema)
    .min(1, 'At least one master field is required for update')
    .max(50, 'Cannot update more than 50 master fields at once')
});

/**
 * Update Master Data Output Schema
 * --------------------------------
 * Response structure for successful update
 */
export const updateMasterDataOutputSchema = z.object({
  message: z.string(),
  count: z.number(),
  updatedFields: z.array(z.string())
});

/**
 * TypeScript Types
 * ----------------
 * Inferred types from Zod schemas for use in services
 */
export type MasterFieldInput = z.infer<typeof masterFieldSchema>;
export type UpdateMasterDataInput = z.infer<typeof updateMasterDataInputSchema>;
export type UpdateMasterDataOutput = z.infer<typeof updateMasterDataOutputSchema>;
