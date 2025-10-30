/**
 * Get Master Data Controller (Express)
 * ====================================
 * Express REST API controller for fetching master data configuration
 * 
 * Based on: old vodichron masterDataController.get
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { getMasterData } from '../services/get-master-data.service';

/**
 * Get Master Data Express Controller
 * ===================================
 * 
 * Handles GET /api/master-data
 * Returns all master data configuration for the application
 * 
 * No Input Required:
 * - Simple GET request, no parameters needed
 * 
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 *   data: Array<{
 *     name: string;        // e.g., 'designation', 'department'
 *     value: string[];     // e.g., ['Software Engineer', 'Manager', ...]
 *   }>;
 *   timestamp: string;
 * }
 * 
 * Use Cases:
 * - Employee registration form dropdowns
 * - Leave application form dropdowns
 * - Any system configuration data needed by frontend
 */
export async function getMasterDataExpressController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    logger.info('📥 Get master data request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      endpoint: '/master-data'
    });

    // Call service layer
    const masterFields = await getMasterData();

    logger.info('✅ Master data retrieved successfully (Express)', {
      fieldsCount: masterFields.length,
      userId: (req as any).user?.uuid
    });

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Master data retrieved successfully',
      data: masterFields,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Get master data controller error', {
      type: 'GET_MASTER_DATA_CONTROLLER_ERROR',
      error: error.message,
      stack: error.stack
    });

    // Send error response
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve master data',
      data: [],
      timestamp: new Date().toISOString()
    });
  }
}
