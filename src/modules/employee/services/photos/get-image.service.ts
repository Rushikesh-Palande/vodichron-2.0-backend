/**
 * Get Employee Image Service
 * ==========================
 * 
 * Service layer for employee image retrieval with file handling.
 * Based on: old vodichron getEmployeeImage controller (lines 457-471)
 * 
 * Process Flow:
 * 1. Fetch employee record from database
 * 2. Check if employee has uploaded photo
 * 3. Return file path (either employee photo or default nouser.png)
 * 
 * File Paths:
 * - Employee photo: {assetPath}/employee_documents/{filename}
 * - Default photo: {assetPath}/nouser.png
 */

import { Request, Response } from 'express';
import path from 'path';
import { logger } from '../../../../utils/logger';
import { getEmployeePhotoInfo } from '../../stores/photos/get-image.store';

/**
 * Service Configuration Interface
 * ===============================
 */
interface ServiceConfig {
  assetPath: string;
}

/**
 * Get Employee Image Service
 * ==========================
 * 
 * Main service function for image retrieval.
 * 
 * Old code logic (lines 457-471):
 * 1. Fetch employee by UUID
 * 2. If not found: throw NotFoundError
 * 3. If employee.recentPhotograph exists: return photo from employee_documents/
 * 4. Else: return default nouser.png
 * 
 * Authorization:
 * - No explicit authorization check in old code
 * - Any authenticated user can view any employee's photo
 * 
 * @param req - Express request with employee ID in params
 * @param res - Express response (will send file)
 * @param config - Service configuration (asset path)
 */
export async function getEmployeeImage(
  req: Request,
  res: Response,
  config: ServiceConfig
): Promise<void> {
  // ============================================================================
  // STEP 1: Log Incoming Request
  // ============================================================================
  const employeeId = req.params.id;
  const user = (req as any).user;

  logger.info('🖼️ Get employee image request received', {
    employeeId,
    requestedBy: user?.uuid,
    operation: 'getEmployeeImage'
  });

  try {
    // ==========================================================================
    // STEP 2: Fetch Employee Photo Information
    // ==========================================================================
    const employeeInfo = await getEmployeePhotoInfo(employeeId);

    // ==========================================================================
    // STEP 3: Check if Employee Exists
    // ==========================================================================
    // Matches old code lines 460-462
    if (!employeeInfo) {
      logger.warn('❌ Employee not found', {
        employeeId,
        requestedBy: user?.uuid
      });

      res.status(404).json({
        success: false,
        message: 'Unable to find the employee',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ==========================================================================
    // STEP 4: Determine File Path
    // ==========================================================================
    // Matches old code lines 464-468
    const fileName = employeeInfo.recentPhotograph;
    let filePath = path.join(config.assetPath, 'nouser.png'); // Default image

    if (fileName) {
      filePath = path.join(config.assetPath, 'employee_documents', fileName);
    }

    logger.info('📁 Serving employee image', {
      employeeId,
      employeeName: employeeInfo.name,
      hasCustomPhoto: !!fileName,
      filePath: fileName ? `employee_documents/${fileName}` : 'nouser.png',
      requestedBy: user?.uuid
    });

    // ==========================================================================
    // STEP 5: Send File Response
    // ==========================================================================
    // Matches old code lines 469-470
    res.contentType(path.basename(filePath));
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error('❌ Failed to send image file', {
          employeeId,
          filePath,
          error: err.message,
          requestedBy: user?.uuid
        });
        
        // If file not found and it was a custom photo, try sending default
        if (fileName && err.message.includes('ENOENT')) {
          logger.warn('⚠️ Custom photo not found, falling back to default', {
            employeeId,
            missingFile: fileName
          });
          
          const defaultPath = path.join(config.assetPath, 'nouser.png');
          res.contentType(path.basename(defaultPath));
          res.sendFile(defaultPath);
        } else if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to retrieve employee image',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        logger.info('✅ Employee image sent successfully', {
          employeeId,
          hasCustomPhoto: !!fileName,
          requestedBy: user?.uuid
        });
      }
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Get employee image service error', {
      type: 'GET_IMAGE_SERVICE_ERROR',
      employeeId,
      error: error?.message,
      stack: error?.stack,
      requestedBy: user?.uuid
    });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee image',
        timestamp: new Date().toISOString()
      });
    }
  }
}
