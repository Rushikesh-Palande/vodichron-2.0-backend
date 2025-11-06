/**
 * Create Customer App Access Schema
 * ==================================
 * Zod validation schema for creating customer application access.
 * 
 * Based on old backend: userController.createCustomerAppAccess (lines 207-236)
 * 
 * Endpoint: POST /user/customer-access
 * Request body: { id: customerId }
 * Authorization: Admin/HR/SuperUser only
 * 
 * Process:
 * 1. Validate customer exists
 * 2. Generate random 7-character password
 * 3. Create or regenerate customer app user
 * 4. Send activation email with credentials
 */

import { z } from 'zod';

/**
 * Create Customer App Access Input Schema
 * ========================================
 * Validates customer ID for access creation
 */
export const createCustomerAppAccessInputSchema = z.object({
  id: z.string()
    .uuid('Invalid customer ID format')
    .min(1, 'Customer ID is required')
});

export type CreateCustomerAppAccessInput = z.infer<typeof createCustomerAppAccessInputSchema>;
