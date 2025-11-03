/**
 * Search Role Assignment Schemas
 * ==============================
 * 
 * Zod schemas for searching employees for role assignment.
 * Based on: old vodichron searchEmployeeForRoleAssignment controller (lines 188-202)
 * Store function: searchEmployeeForRoleAssigmentByKeyword (lines 266-291)
 * 
 * Special Feature:
 * - Only returns employees WITHOUT an application_users record (no role assigned yet)
 * - Uses NOT EXISTS subquery to filter out employees with roles
 * 
 * Validation Rules:
 * - keyword: Required string, min 2 characters
 * - excludedUsers: Optional array of UUIDs to exclude from results
 */

import { z } from 'zod';

/**
 * Search Role Assignment Input Schema
 * ===================================
 * 
 * Validates search parameters for role assignment search.
 * 
 * Features:
 * - Keyword search on name and email
 * - Exclude specific users from results
 * - Returns only employees WITHOUT roles (NOT EXISTS check)
 * - Returns max 10 results (LIMIT 10 from old code)
 * 
 * Example:
 * {
 *   keyword: "john",
 *   excludedUsers: ["uuid1", "uuid2"]
 * }
 */
export const searchRoleAssignmentSchema = z.object({
  keyword: z
    .string()
    .min(2, 'Search keyword must be at least 2 characters')
    .describe('Search keyword for employee name or email'),
  
  excludedUsers: z
    .array(z.string().uuid('Invalid UUID format'))
    .optional()
    .default([])
    .describe('Array of user UUIDs to exclude from search results'),
});

/**
 * Type Inference
 * ==============
 */
export type SearchRoleAssignmentInput = z.infer<typeof searchRoleAssignmentSchema>;

/**
 * Search Result Schema
 * ===================
 * 
 * Schema for individual search result item.
 * Matches SQL SELECT from old code: uuid, officialEmailId, name
 */
export const searchRoleAssignmentResultSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  officialEmailId: z.string().email(),
});

export type SearchRoleAssignmentResult = z.infer<typeof searchRoleAssignmentResultSchema>;

/**
 * Search Role Assignment Output Schema
 * ====================================
 * 
 * Array of employee search results (max 10 as per old code LIMIT 10)
 */
export const searchRoleAssignmentOutputSchema = z.array(searchRoleAssignmentResultSchema);

export type SearchRoleAssignmentOutput = z.infer<typeof searchRoleAssignmentOutputSchema>;
