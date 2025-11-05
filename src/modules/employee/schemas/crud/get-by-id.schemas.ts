import { z } from "zod";

/**
 * Get Employee By ID Schema
 * -------------------------
 * Validates the employee ID parameter for fetching employee profile
 */
export const getEmployeeByIdSchema = z.object({
  employeeId: z
    .string()
    .uuid({
      message: "Employee ID must be a valid UUID",
    })
    .min(1, {
      message: "Employee ID is required",
    }),
});

export type GetEmployeeByIdInput = z.infer<typeof getEmployeeByIdSchema>;
