import { z } from 'zod';

/**
 * Search Manager Assignment Schema
 * =================================
 * Zod validation schema for searching employees for manager/director assignment
 * 
 * Used in:
 * - Employee registration (selecting reporting manager/director)
 * - Employee update (changing manager/director)
 * 
 * Validation Rules:
 * - Keyword must be at least 2 characters (to avoid too broad searches)
 * - ExcludedUsers must be valid UUIDs if provided
 */

/**
 * Search Manager Assignment Input Schema
 * ---------------------------------------
 * Validates search parameters for finding employees suitable for manager/director roles
 */
export const searchManagerAssignmentSchema = z.object({
  /**
   * Search keyword
   * Searches against employee name and official email
   * Will be sanitized to remove special characters (security)
   */
  keyword: z.string()
    .min(2, 'Search keyword must be at least 2 characters')
    .max(100, 'Search keyword must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9@._\s-]+$/, 'Search keyword contains invalid characters'),
  
  /**
   * Optional array of user UUIDs to exclude from search results
   * Useful when you don't want to show certain employees (e.g., self, already assigned)
   */
  excludedUsers: z.array(z.string().uuid('Each excluded user must be a valid UUID'))
    .optional()
    .nullable()
    .default([]),
});

/**
 * TypeScript Type for Search Manager Assignment Input
 * ----------------------------------------------------
 * Inferred from Zod schema for type safety
 */
export type SearchManagerAssignmentInput = z.infer<typeof searchManagerAssignmentSchema>;

/**
 * Search Result Item Type
 * -----------------------
 * Structure of each employee in search results
 */
export type SearchManagerAssignmentResult = {
  uuid: string;
  name: string;
  officialEmailId: string;
};
