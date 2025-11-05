/**
 * Get Reportee Leaves Schema
 * ==========================
 * Zod validation schema for fetching reportee/team leave records
 * Used by managers, directors, HR, and super users
 * 
 * Validates:
 * - Pagination options
 * - Filter criteria (leave type, year, status)
 */

import { z } from 'zod';
import { LeaveApprovalStatus } from '../constants/leave.constants';

/**
 * Get Reportee Leaves Input Schema
 * ================================
 * Validates request for fetching reportee leaves
 */
export const getReporteeLeavesInputSchema = z.object({
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
export type GetReporteeLeavesInput = z.infer<typeof getReporteeLeavesInputSchema>;
