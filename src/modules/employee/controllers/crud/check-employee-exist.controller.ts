/**
 * Check Employee Exist Controller (Express)
 * =========================================
 * Express REST API controller for checking employee email existence
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { checkEmployeeExistSchema } from '../../schemas/crud/check-employee-exist.schemas';
import { checkEmployeeExist } from '../../services/crud/check-employee-exist.service';

/**
 * Check Employee Exist Express Controller
 * =======================================
 * 
 * Handles POST /api/employees/exists
 * Checks if an employee email already exists in the system
 * 
 * Request Body:
 * {
 *   email: string,
 *   emailType: 'personalEmail' | 'officialEmailId'
 * }
 * 
 * Response:
 * {
 *   exists: boolean
 * }
 */
export async function checkEmployeeExistExpressController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    logger.info('📥 Check employee exist request received (Express)', {
      email: req.body.email,
      emailType: req.body.emailType,
      endpoint: '/employee/exists'
    });

    // Validate input
    const validatedInput = checkEmployeeExistSchema.parse(req.body);

    // Call service layer
    const result = await checkEmployeeExist(validatedInput);

    logger.info('✅ Check employee exist completed (Express)', {
      email: validatedInput.email,
      exists: result.exists
    });

    res.status(200).json(result.exists);

  } catch (error: any) {
    logger.error('💥 Check employee exist controller error', {
      error: error.message,
      stack: error.stack
    });

    // On error, return true (assume exists) for safety
    res.status(200).json(true);
  }
}
