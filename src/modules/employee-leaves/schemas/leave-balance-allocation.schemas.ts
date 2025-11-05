/**
 * Leave Balance and Allocation Schemas
 * ====================================
 * Zod validation schemas for:
 * - Get Leave Balance
 * - Get Leave Allocation
 * - Update Leave Allocation
 */

import { z } from 'zod';

/**
 * Get Leave Balance Input Schema
 * ==============================
 * Validates request for fetching employee leave balance
 */
export const getLeaveBalanceInputSchema = z.object({
  employeeId: z
    .string()
    .uuid('Employee ID must be a valid UUID'),
  
  filters: z.object({
    year: z
      .string()
      .regex(/^\d{4}$/, 'Year must be 4 digits')
      .default(new Date().getFullYear().toString()),
  }).optional(),
});

/**
 * Get Leave Allocation Input Schema
 * =================================
 * Validates request for fetching employee leave allocation
 */
export const getLeaveAllocationInputSchema = z.object({
  employeeId: z
    .string()
    .uuid('Employee ID must be a valid UUID'),
  
  filters: z.object({
    year: z
      .string()
      .regex(/^\d{4}$/, 'Year must be 4 digits')
      .default(new Date().getFullYear().toString()),
  }).optional(),
});

/**
 * Update Leave Allocation Input Schema
 * ====================================
 * Validates request for updating employee leave allocations
 * Only admins and HR can update allocations
 */
export const updateLeaveAllocationInputSchema = z.object({
  leaveAllocation: z.array(
    z.object({
      uuid: z
        .string()
        .uuid('Allocation UUID must be valid'),
      
      leavesAllocated: z
        .number()
        .min(0, 'Allocated leaves cannot be negative')
        .max(365, 'Allocated leaves cannot exceed 365'),
      
      leavesCarryForwarded: z
        .number()
        .min(0, 'Carry forwarded leaves cannot be negative')
        .max(365, 'Carry forwarded leaves cannot exceed 365'),
    })
  ).min(1, 'At least one allocation must be provided'),
});

/**
 * TypeScript Types
 * ================
 */
export type GetLeaveBalanceInput = z.infer<typeof getLeaveBalanceInputSchema>;
export type GetLeaveAllocationInput = z.infer<typeof getLeaveAllocationInputSchema>;
export type UpdateLeaveAllocationInput = z.infer<typeof updateLeaveAllocationInputSchema>;
