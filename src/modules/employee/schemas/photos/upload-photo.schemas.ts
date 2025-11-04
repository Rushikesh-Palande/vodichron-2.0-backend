/**
 * Upload Photo Schemas
 * ====================
 * 
 * Zod validation schemas for employee photo upload operation.
 * Based on: old vodichron uploadEmployeePhoto controller (lines 417-455)
 * 
 * Flow:
 * 1. Employee uploads photo via multer (file + form fields)
 * 2. File is saved to filesystem with UUID filename
 * 3. Employee's recentPhotograph field updated in database
 * 
 * Authorization:
 * - Employees can only upload photos for themselves
 * - userId in request must match logged-in user UUID
 */

import { z } from 'zod';

/**
 * Upload Photo Input Schema
 * =========================
 * 
 * Validates form fields sent with file upload.
 * Note: File itself is handled by multer middleware (req.file)
 * 
 * Old code (line 427):
 * - const { userId } = req.body;
 * - if (userId !== req.user.uuid) throw ForbiddenError
 */
export const uploadPhotoInputSchema = z.object({
  userId: z
    .string()
    .uuid('Invalid user ID format')
    .describe('Employee UUID - must match logged-in user for security'),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoInputSchema>;

/**
 * Upload Photo Output Schema
 * ==========================
 * 
 * Success response structure.
 * Old code returns: res.status(201).send(`File uploaded with name ${newFilePath}`)
 */
export const uploadPhotoOutputSchema = z.object({
  message: z.string(),
  fileName: z.string(),
});

export type UploadPhotoOutput = z.infer<typeof uploadPhotoOutputSchema>;
