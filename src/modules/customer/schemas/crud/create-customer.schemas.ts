/**
 * Customer Create Schemas
 * =======================
 * 
 * Zod validation schemas for customer creation and related operations.
 * These schemas ensure data integrity and provide type safety.
 */

import { z } from 'zod';

/**
 * Customer Create Input Schema
 * ============================
 * Validates input data for creating a new customer
 */
export const CreateCustomerSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name must not exceed 100 characters' })
    .trim(),
  
  email: z
    .string()
    .email({ message: 'Invalid email address' })
    .toLowerCase(),
  
  primaryContact: z
    .string()
    .regex(/^[\d\-+()]+$/, { message: 'Invalid phone number format' })
    .min(10, { message: 'Phone number must be at least 10 digits' }),
  
  secondaryContact: z
    .string()
    .regex(/^[\d\-+()]+$/, { message: 'Invalid phone number format' })
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .optional()
    .nullable(),
  
  country: z
    .string()
    .min(2, { message: 'Country is required' })
    .max(50, { message: 'Country name too long' }),
  
  timezone: z
    .string()
    .min(3, { message: 'Timezone is required' })
    .max(50, { message: 'Timezone format invalid' }),
  
  status: z
    .enum(['ACTIVE', 'INACTIVE'])
    .optional()
    .default('ACTIVE'),
});

/**
 * Inferred TypeScript type from schema
 */
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

/**
 * Customer Update Input Schema
 * ============================
 * Validates input data for updating a customer
 */
export const UpdateCustomerSchema = z.object({
  uuid: z
    .string()
    .uuid({ message: 'Invalid customer UUID' }),
  
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name must not exceed 100 characters' })
    .trim()
    .optional(),
  
  email: z
    .string()
    .email({ message: 'Invalid email address' })
    .toLowerCase()
    .optional(),
  
  primaryContact: z
    .string()
    .regex(/^[\d\-+()]+$/, { message: 'Invalid phone number format' })
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .optional(),
  
  secondaryContact: z
    .string()
    .regex(/^[\d\-+()]+$/, { message: 'Invalid phone number format' })
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .optional(),
  
  country: z
    .string()
    .min(2, { message: 'Country is required' })
    .max(50, { message: 'Country name too long' })
    .optional(),
  
  timezone: z
    .string()
    .min(3, { message: 'Timezone is required' })
    .max(50, { message: 'Timezone format invalid' })
    .optional(),
  
  status: z
    .enum(['ACTIVE', 'INACTIVE'])
    .optional(),
  
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .optional(),
  
  confirmPassword: z
    .string()
    .optional(),
}).required({ uuid: true }).refine(
  (data) => {
    // If password is provided, confirmPassword must match
    if (data.password && !data.confirmPassword) {
      return false;
    }
    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
      return false;
    }
    return true;
  },
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

/**
 * Inferred TypeScript type from update schema
 */
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

/**
 * Customer List Filter Schema
 * ===========================
 * Validates filter parameters for customer list queries
 */
export const CustomerListFilterSchema = z.object({
  page: z
    .number()
    .int()
    .positive({ message: 'Page must be a positive integer' })
    .optional()
    .default(1),
  
  pageLimit: z
    .number()
    .int()
    .positive({ message: 'Page limit must be a positive integer' })
    .max(100, { message: 'Page limit cannot exceed 100' })
    .optional()
    .default(10),
  
  country: z
    .string()
    .optional()
    .nullable(),
  
  status: z
    .enum(['ACTIVE', 'INACTIVE'])
    .optional()
    .nullable(),
});

/**
 * Inferred TypeScript type from filter schema
 */
export type CustomerListFilterInput = z.infer<typeof CustomerListFilterSchema>;

/**
 * Customer Search Schema
 * ======================
 * Validates input for customer keyword search
 */
export const CustomerSearchSchema = z.object({
  keyword: z
    .string()
    .min(1, { message: 'Search keyword is required' })
    .max(100, { message: 'Search keyword too long' })
    .trim(),
  
  exclude: z
    .array(z.string().uuid())
    .optional()
    .default([]),
});

/**
 * Inferred TypeScript type from search schema
 */
export type CustomerSearchInput = z.infer<typeof CustomerSearchSchema>;

/**
 * Check Email Exists Schema
 * =========================
 * Validates input for checking if customer email already exists
 */
export const CheckCustomerEmailSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email address' })
    .toLowerCase(),
});

/**
 * Inferred TypeScript type from email check schema
 */
export type CheckCustomerEmailInput = z.infer<typeof CheckCustomerEmailSchema>;
