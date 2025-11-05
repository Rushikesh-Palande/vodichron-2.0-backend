/**
 * Update Leave Status Schema
 * ==========================
 * Zod validation schema for approving/rejecting leave requests
 * 
 * Validates:
 * - Leave UUID
 * - Approval status (APPROVED/REJECTED)
 * - Optional comments from approver
 */

import { z } from 'zod';
import { LeaveApprovalStatus } from '../constants/leave.constants';

/**
 * Update Leave Status Input Schema
 * ================================
 * Validates leave approval/rejection input
 */
export const updateLeaveStatusInputSchema = z.object({
  leaveId: z
    .string()
    .uuid('Leave ID must be a valid UUID'),
  
  approvalStatus: z
    .enum([LeaveApprovalStatus.APPROVED, LeaveApprovalStatus.REJECTED], {
      message: 'Approval status must be either APPROVED or REJECTED',
    }),
  
  comment: z
    .string()
    .max(500, 'Comment must not exceed 500 characters')
    .optional(),
});

/**
 * Update Leave Status Output Schema
 * =================================
 * Schema for update leave status response
 */
export const updateLeaveStatusOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
});

/**
 * TypeScript Types
 * ================
 */
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusInputSchema>;
export type UpdateLeaveStatusOutput = z.infer<typeof updateLeaveStatusOutputSchema>;
