/**
 * Get Employee Leaves Schema
 * ==========================
 * Zod validation schema for fetching employee leave records
 * 
 * Validates:
 * - Employee ID parameter
 * - Pagination options
 * - Filter criteria
 */

import { z } from 'zod';
import { LeaveApprovalStatus } from '../constants/leave.constants';

/**
 * Get Employee Leaves Input Schema
 * ================================
 * Validates request for fetching employee leaves
 */
export const getEmployeeLeavesInputSchema = z.object({
  employeeId: z
    .string()
    .uuid('Employee ID must be a valid UUID'),
  
  pagination: z.object({
    page: z
      .number()
      .int()
      .min(0, 'Page must be 0 or greater')
      .default(0),
    
    pageLimit: z
      .number()
      .int()
      .min(1, 'Page limit must be at least 1')
      .max(100, 'Page limit cannot exceed 100')
      .default(10),
  }),
  
  filters: z.object({
    leaveType: z.string().optional(),
    year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits').optional(),
    leaveApprovalStatus: z.nativeEnum(LeaveApprovalStatus).optional(),
  }).optional(),
});

/**
 * TypeScript Type
 * ===============
 */
export type GetEmployeeLeavesInput = z.infer<typeof getEmployeeLeavesInputSchema>;
