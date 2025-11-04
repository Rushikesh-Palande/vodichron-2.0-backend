import { z } from 'zod';

/**
 * Application User List Schemas
 * ==============================
 * 
 * Zod validation schemas for application user list endpoint.
 * Application users are employees who have been granted system access.
 * 
 * Based on old vodichron: POST /user/list
 * 
 * Schemas:
 * - userListInputSchema: Request input validation (pagination + filters)
 * - applicationUserSchema: Individual user object structure
 * - userListOutputSchema: Complete response structure
 * 
 * Security:
 * - Role filtering validated against enum
 * - Pagination limits enforced (max 100 records per page)
 * - All UUIDs validated
 */

/**
 * Get Application Users List Input Schema
 * ========================================
 * 
 * Validates pagination and filter parameters for application user list.
 * 
 * Pagination:
 * - page: 1-indexed page number (default: 1)
 * - pageLimit: Records per page, max 100 (default: 20)
 * 
 * Filters:
 * - role: Optional role filter (super_user, hr, employee, manager, director, customer)
 * 
 * Example:
 * ```
 * {
 *   pagination: { page: 1, pageLimit: 20 },
 *   filters: { role: 'hr' }
 * }
 * ```
 */
export const userListInputSchema = z.object({
  // Pagination parameters
  pagination: z.object({
    page: z.number().int().positive().optional().default(1),
    pageLimit: z.number().int().positive().max(100).optional().default(20)
  }).optional().default({ page: 1, pageLimit: 20 }),
  
  // Filter parameters
  filters: z.object({
    role: z.enum(['super_user', 'hr', 'employee', 'manager', 'director', 'customer']).optional()
  }).optional()
});

export type UserListInput = z.infer<typeof userListInputSchema>;

/**
 * Application User Schema
 * =======================
 * 
 * Schema for individual application user in the response.
 * Represents an employee with application access.
 * 
 * Fields:
 * - uuid: Employee UUID (primary key)
 * - name: Full employee name
 * - designation: Job designation (nullable)
 * - department: Department name (nullable)
 * - officialEmailId: Official work email
 * - role: Application role (enum)
 * - status: Account status (ACTIVE/INACTIVE)
 * - lastLogin: Last login timestamp (nullable)
 */
export const applicationUserSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  designation: z.string().nullable(),
  department: z.string().nullable(),
  officialEmailId: z.string().email(),
  role: z.enum(['super_user', 'hr', 'employee', 'manager', 'director', 'customer']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  lastLogin: z.date().nullable(),
});

export type ApplicationUser = z.infer<typeof applicationUserSchema>;

/**
 * Application User List Output Schema
 * ===================================
 * 
 * Complete response structure for user list endpoint.
 * 
 * Response Structure:
 * - success: Boolean indicating request success
 * - message: Human-readable message
 * - data: Array of application users
 * - pagination: Current pagination state
 * - timestamp: ISO 8601 timestamp of response
 */
export const userListOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(applicationUserSchema),
  pagination: z.object({
    page: z.number(),
    pageLimit: z.number(),
    totalRecords: z.number(),
  }),
  timestamp: z.string(),
});

export type UserListOutput = z.infer<typeof userListOutputSchema>;
