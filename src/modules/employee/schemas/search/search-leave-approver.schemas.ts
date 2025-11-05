/**
 * Search Leave Approver Schemas
 * =============================
 * 
 * Zod schemas for searching employees for leave approver assignment.
 * Based on: old vodichron searchEmployeeForLeaveApproverAssigment controller (lines 217-230)
 * Store function: searchEmployeeForLeaveApproverAssigmentByKeyword (lines 312-330)
 * 
 * Special Feature:
 * - Only returns employees with designation='Director'
 * - Used for assigning leave approvers (only Directors can approve leaves)
 * 
 * Validation Rules:
 * - keyword: Required string, min 2 characters
 * - excludedUsers: Optional array of UUIDs to exclude from results
 */

import { z } from 'zod';

/**
 * Search Leave Approver Input Schema
 * ==================================
 * 
 * Validates search parameters for leave approver search.
 * 
 * Features:
 * - Keyword search on name and email
 * - Only returns Directors (designation='Director')
 * - Exclude specific users from results
 * - Auto-excludes logged-in user (handled in controller)
 * - Returns max 10 results (LIMIT 10 from old code)
 * - Sorted by name (ORDER BY e.name ASC)
 * 
 * Example:
 * {
 *   keyword: "john",
 *   excludedUsers: ["uuid1", "uuid2"]
 * }
 */
export const searchLeaveApproverSchema = z.object({
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
export type SearchLeaveApproverInput = z.infer<typeof searchLeaveApproverSchema>;

/**
 * Search Result Schema
 * ===================
 * 
 * Schema for individual search result item.
 * Matches SQL SELECT from old code: uuid, officialEmailId, name
 */
export const searchLeaveApproverResultSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  officialEmailId: z.string().email(),
});

export type SearchLeaveApproverResult = z.infer<typeof searchLeaveApproverResultSchema>;

/**
 * Search Leave Approver Output Schema
 * ===================================
 * 
 * Array of employee search results (max 10 as per old code LIMIT 10)
 * All results will have designation='Director'
 */
export const searchLeaveApproverOutputSchema = z.array(searchLeaveApproverResultSchema);

export type SearchLeaveApproverOutput = z.infer<typeof searchLeaveApproverOutputSchema>;
