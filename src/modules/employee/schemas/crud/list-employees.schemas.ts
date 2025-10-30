import { z } from 'zod';

/**
 * Get Employees List Schema
 * -------------------------
 * Validates pagination and filter parameters for employee list
 */
export const getEmployeesListSchema = z.object({
  pagination: z.object({
    page: z.number().int().positive().optional().default(1),
    pageLimit: z.number().int().positive().max(100).optional().default(20)
  }).optional().default({ page: 1, pageLimit: 20 }),
  
  filters: z.object({
    designation: z.string().optional(),
    department: z.string().optional(),
    reportingManagerId: z.string().uuid().optional(),
    reportingManagerRole: z.enum(['manager', 'director']).optional()
  }).optional()
});

export type GetEmployeesListInput = z.infer<typeof getEmployeesListSchema>;