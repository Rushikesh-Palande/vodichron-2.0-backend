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

const fileStorage = multer.diskStorage({
  // Destination: Where to store uploaded files temporarily
  destination(_req, _file, cb) {
    logger.debug('📁 Setting upload destination', { path: uploadPath });
    cb(null, uploadPath);
  },
  
  // Filename: Use original filename (service layer will rename with UUID)
  filename(_req, file, cb) {
    logger.debug('📄 Setting upload filename', { 
      original: file.originalname 
    });
    cb(null, file.originalname);
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
