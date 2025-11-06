/**
 * Update Master Data Controller (Express)
 * ========================================
 * Express REST API controller for updating master data configuration
 * 
 * Based on: old vodichron masterDataController.patch (lines 6-10)
 * Pattern: Thin controller layer that delegates to service
 */

import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { updateMasterData } from '../services/update-master-data.service';
import { updateMasterDataInputSchema } from '../schemas/update-master-data.schemas';

/**
 * Update Master Data Express Controller
 * ======================================
 * 
 * Handles PATCH /api/master-data/save
 * Updates master data configuration (HR/Admin only)
 * 
 * Request Body:
 * {
 *   masterFields: Array<{
 *     name: string;        // e.g., 'designation', 'department'
 *     value: string[];     // e.g., ['Software Engineer', 'Manager', ...]
 *   }>
 * }
 * 
 * Response (Success - 200):
 * {
 *   success: boolean;
 *   message: string;
 *   data: {
 *     count: number;
 *     updatedFields: string[];
 *   };
 *   timestamp: string;
 * }
 * 
 * Response (Error - 400/403/500):
 * {
 *   success: false;
 *   message: string;
 *   timestamp: string;
 * }
 * 
 * Authorization:
 * - Only HR, Admin, and Super User can update master data
 * - Service layer enforces authorization
 * - Managers/Directors can READ but NOT UPDATE
 * 
 * Use Cases:
 * - HR adding new designation options
 * - HR updating department list
 * - Admin modifying leave types
 * - HR removing outdated values
 * 
 * Old Code Reference:
 * ------------------
 * export const patch = async (req: AuthorizedRequest, res: Response) => {
 *     const masterFields = req.body as MasterField[];
 *     await Promise.all(masterFields.map((changedMasterField) => 
 *         updateMasterField(changedMasterField, req.user.uuid)
 *     ));
 *     res.send(masterFields);
 * };
 */
export async function updateMasterDataExpressController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Update master data request received (Express)', {
      userId: (req as any).user?.uuid,
      userRole: (req as any).user?.role,
      fieldsCount: req.body.masterFields?.length,
      fieldNames: req.body.masterFields?.map((f: any) => f.name),
      endpoint: 'PATCH /master-data/save'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated update attempt', {
        endpoint: 'PATCH /master-data/save'
      });

      res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ==========================================================================
    // STEP 3: Validate Input Schema
    // ==========================================================================
    let validatedInput;
    try {
      validatedInput = updateMasterDataInputSchema.parse(req.body);
    } catch (validationError: any) {
      logger.warn('❌ Validation error', {
        error: validationError.message,
        userId: user.uuid
      });

      res.status(400).json({
        success: false,
        message: 'Invalid input: ' + validationError.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ==========================================================================
    // STEP 4: Call Service Layer
    // ==========================================================================
    const result = await updateMasterData(validatedInput, {
      uuid: user.uuid,
      role: user.role,
      email: user.email || ''
    });

    // ==========================================================================
    // STEP 5: Send Success Response
    // ==========================================================================
    logger.info('✅ Master data updated successfully (Express)', {
      count: result.count,
      updatedFields: result.updatedFields,
      userId: user.uuid
    });

    // Match old response format: res.send(masterFields)
    // But enhanced with structured response
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        count: result.count,
        updatedFields: result.updatedFields
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    logger.error('💥 Update master data controller error', {
      type: 'UPDATE_MASTER_DATA_CONTROLLER_ERROR',
      error: error.message,
      stack: error.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = 'Failed to update master data';

    if (error.code === 'FORBIDDEN') {
      statusCode = 403;
      errorMessage = error.message || 'Access denied';
    } else if (error.code === 'BAD_REQUEST') {
      statusCode = 400;
      errorMessage = error.message || 'Invalid request';
    }

    // Send error response
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
