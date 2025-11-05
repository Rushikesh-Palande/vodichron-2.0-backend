import { z } from 'zod';

/**
 * Get Master Data Schemas
 * ========================
 * Zod validation schemas for master data operations
 * 
 * Master data is system-wide configuration that doesn't change frequently:
 * - Employee designations (Software Engineer, Manager, etc.)
 * - Departments (Engineering, HR, Finance, etc.)
 * - Leave types (Casual Leave, Sick Leave, etc.)
 * - Other dropdown options used across the application
 */

/**
 * Get Master Data Input Schema
 * -----------------------------
 * No input required for getting master data - it's a simple GET operation
 * This is exported for consistency with other modules
 */
export const getMasterDataSchema = z.object({
  // Empty object - no input parameters needed
  // Master data endpoint returns all configuration data
});

/**
 * TypeScript Type for Get Master Data Input
 * ------------------------------------------
 * Inferred from Zod schema for type safety
 */
export type GetMasterDataInput = z.infer<typeof getMasterDataSchema>;

/**
 * Master Field Schema
 * -------------------
 * Validates individual master data field structure
 */
export const masterFieldSchema = z.object({
  name: z.string().min(1, 'Master field name is required'),
  value: z.array(z.string()).min(1, 'Master field must have at least one value'),
});

/**
 * Master Field Type
 * -----------------
 * TypeScript type for a single master data field
 */
export type MasterFieldType = z.infer<typeof masterFieldSchema>;
