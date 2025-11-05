/**
 * File Upload Middleware (Multer)
 * ===============================
 * 
 * Multer configuration for handling file uploads in employee module.
 * Based on: old vodichron employeeRoutes.ts (lines 18-27)
 * 
 * Storage Strategy:
 * - Files temporarily stored in upload directory
 * - Service layer moves them to permanent storage
 * - UUID-based filenames prevent collisions
 * 
 * Usage:
 * - router.post('/upload', upload.single('fileupload'), controller)
 */

import multer from 'multer';
import { mkdirSync, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import config from '../config';
import { logger } from '../utils/logger';

/**
 * Multer Storage Configuration
 * ============================
 * 
 * Configures where and how uploaded files are stored temporarily.
 * Matches old code diskStorage setup (lines 19-26)
 */
const uploadPath = config.asset.path;

// Ensure upload directory exists
if (!existsSync(uploadPath)) {
  mkdirSync(uploadPath, { recursive: true });
  logger.info('📁 Created upload directory', { path: uploadPath });
}

const fileStorage = multer.diskStorage({
  // Destination: Where to store uploaded files temporarily
  destination(_req, _file, cb) {
    logger.debug('📁 Setting upload destination', { path: uploadPath });
    cb(null, uploadPath);
  },
  
  // Filename: Use UUID to prevent race conditions when same file uploaded multiple times
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${ext}`;
    
    logger.debug('📄 Setting upload filename', { 
      original: file.originalname,
      unique: uniqueFilename
    });
    cb(null, uniqueFilename);
  },
});

/**
 * Multer Upload Instance
 * ======================
 * 
 * Configured multer instance for file uploads.
 * Export this to use in routes.
 */
export const upload = multer({ 
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

logger.info('✅ File upload middleware configured', {
  uploadPath,
  maxFileSize: '10MB'
});
