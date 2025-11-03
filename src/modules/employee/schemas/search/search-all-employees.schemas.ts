/**
 * Search All Employees Schemas
 * ============================
 * 
 * Zod schemas for general employee search functionality.
 * Based on: old vodichron searchEmployeeByKeyword controller (lines 173-186)
 * Store function: searchAllEmployeesByKeyword (lines 247-264)
 * 
 * Validation Rules:
 * - keyword: Required string, min 2 characters
 * - excludedUsers: Optional array of UUIDs to exclude from results
 */

import { z } from 'zod';

/**
 * Search All Employees Input Schema
 * =================================
 * 
 * Validates search parameters for general employee search.
 * 
 * Features:
 * - Keyword search on name and email
 * - Exclude specific users from results
 * - Auto-excludes logged-in user (handled in controller)
 * - Returns max 10 results (LIMIT 10 from old code)
 * 
 * Example:
 * {
 *   keyword: "john",
 *   excludedUsers: ["uuid1", "uuid2"]
 * }
 */
export const searchAllEmployeesSchema = z.object({
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
export type SearchAllEmployeesInput = z.infer<typeof searchAllEmployeesSchema>;

/**
 * Search Result Schema
 * ===================
 * 
 * Schema for individual search result item.
 * Matches SQL SELECT from old code: uuid, officialEmailId, name
 */
export const searchEmployeeResultSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  officialEmailId: z.string().email(),
});

export type SearchEmployeeResult = z.infer<typeof searchEmployeeResultSchema>;

/**
 * Search All Employees Output Schema
 * ==================================
 * 
 * Array of employee search results (max 10 as per old code LIMIT 10)
 */
export const searchAllEmployeesOutputSchema = z.array(searchEmployeeResultSchema);

export type SearchAllEmployeesOutput = z.infer<typeof searchAllEmployeesOutputSchema>;
