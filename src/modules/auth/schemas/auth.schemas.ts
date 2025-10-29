import { z } from 'zod';

/**
 * Auth Schemas (zod)
 * ==================
 * Validation schemas for tRPC procedures
 */
export const loginSchema = z.object({
  username: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
