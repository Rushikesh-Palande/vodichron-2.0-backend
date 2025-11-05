/**
 * Apply Leave Schema
 * ==================
 * Zod validation schema for applying leave
 * 
 * Validates:
 * - Employee ID
 * - Leave type and reason
 * - Date range (start and end)
 * - Half-day flag
 * - Optional secondary approver
 */

import { z } from 'zod';

/**
 * Apply Leave Input Schema
 * ========================
 * Validates leave application input
 * 
 * Validation Rules:
 * - Employee ID: Required UUID
 * - Leave Type: Required string (min 2 chars)
 * - Reason: Required string (min 3 chars, max 200 chars)
 * - Leave Start Date: Required ISO date string
 * - Leave End Date: Required ISO date string
 * - Is Half Day: Boolean (default false)
 * - Secondary Approver ID: Optional UUID
 */
export const applyLeaveInputSchema = z.object({
  employeeId: z
    .string()
    .uuid('Employee ID must be a valid UUID')
    .min(1, 'Employee ID is required'),
  
  leaveType: z
    .string()
    .min(2, 'Leave type must be at least 2 characters')
    .max(100, 'Leave type must not exceed 100 characters'),
  
  reason: z
    .string()
    .min(3, 'Reason must be at least 3 characters')
    .max(200, 'Reason must not exceed 200 characters'),
  
  leaveStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  
  leaveEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  
  isHalfDay: z
    .boolean()
    .default(false),
  
  secondaryApproverId: z
    .string()
    .uuid('Secondary Approver ID must be a valid UUID')
    .optional(),
}).refine(
  (data) => {
    // Validate that end date is not before start date
    const startDate = new Date(data.leaveStartDate);
    const endDate = new Date(data.leaveEndDate);
    return endDate >= startDate;
  },
  {
    message: 'End date must be on or after start date',
    path: ['leaveEndDate'],
  }
).refine(
  (data) => {
    // If half day, start and end date must be the same
    if (data.isHalfDay) {
      return data.leaveStartDate === data.leaveEndDate;
    }
    return true;
  },
  {
    message: 'For half-day leave, start date and end date must be the same',
    path: ['isHalfDay'],
  }
);

/**
 * Apply Leave Output Schema
 * =========================
 * Schema for apply leave response
 */
export const applyLeaveOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    leaveUuid: z.string().uuid(),
    requestNumber: z.number(),
  }),
  timestamp: z.string(),
});

/**
 * TypeScript Types
 * ================
 * Inferred from Zod schemas for type safety
 */
export type ApplyLeaveInput = z.infer<typeof applyLeaveInputSchema>;
export type ApplyLeaveOutput = z.infer<typeof applyLeaveOutputSchema>;
