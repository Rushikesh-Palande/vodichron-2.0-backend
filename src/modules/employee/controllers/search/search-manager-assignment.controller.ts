/**
 * Search Manager Assignment Controller (Express)
 * ==============================================
 * Express REST API controller for searching employees for manager/director assignment
 * 
 * Based on: old vodichron searchEmployeeForReportingManagerAssigment
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { searchManagerAssignmentSchema } from '../../schemas/search/search-manager-assignment.schemas';
import { searchForManagerAssignment } from '../../services/search/search-manager-assignment.service';

/**
 * Search Manager Assignment Express Controller
 * ============================================
 * 
 * Handles GET /api/employees/search/manager-assignment/:keyword
 * Searches employees suitable for manager/director assignment
 * 
 * URL Parameters:
 * - keyword: Search term (min 2 chars)
 * 
 * Query Parameters (optional):
 * - exclude: Comma-separated list of user UUIDs to exclude
 * 
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 *   data: Array<{
 *     uuid: string;
 *     name: string;
 *     officialEmailId: string;
 *   }>;
 *   timestamp: string;
 * }
 */
export async function searchManagerAssignmentExpressController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    logger.info('📥 Search manager assignment request received (Express)', {
      keyword: req.params.keyword,
      excludeParam: req.query.exclude,
      userId: (req as any).user?.uuid,
      endpoint: '/employees/search/manager-assignment/:keyword'
    });

    // Parse excluded users from query parameter
    let excludedUsers: string[] = [];
    if (typeof req.query.exclude === 'string' && req.query.exclude.trim() !== '') {
      excludedUsers = req.query.exclude.split(',').map(id => id.trim());
    }

    // Build input object
    const input = {
      keyword: req.params.keyword,
      excludedUsers
    };

    // Validate input using Zod schema
    const validatedInput = searchManagerAssignmentSchema.parse(input);

    // Call service layer
    const results = await searchForManagerAssignment(validatedInput);

    logger.info('✅ Search manager assignment completed (Express)', {
      keyword: validatedInput.keyword,
      resultsCount: results.length,
      userId: (req as any).user?.uuid
    });

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Employee search completed successfully',
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Search manager assignment controller error', {
      type: 'MANAGER_SEARCH_CONTROLLER_ERROR',
      keyword: req.params.keyword,
      error: error.message,
      stack: error.stack
    });

    // Determine status code based on error type
    let statusCode = 500;
    let errorMessage = 'Failed to search employees';

    if (error.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid search parameters';
    }

    // Send error response
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: [],
      timestamp: new Date().toISOString()
    });
  }
}
