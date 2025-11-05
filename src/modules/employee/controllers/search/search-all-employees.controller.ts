/**
 * Search All Employees Controller (Express REST API)
 * ==================================================
 * 
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Based on: old vodichron searchEmployeeByKeyword controller (lines 173-186)
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic) → Store (database)
 * 
 * Endpoint: GET /api/employees/search/:keyword
 * 
 * Request:
 * - URL Parameter: keyword (search term)
 * - Query Parameter: exclude (comma-separated UUIDs, optional)
 * - Headers: Authorization (JWT token)
 * 
 * Response (Success - 200):
 * {
 *   success: true,
 *   data: [
 *     { uuid: "...", name: "...", officialEmailId: "..." },
 *     ...
 *   ],
 *   timestamp: "2024-01-01T00:00:00.000Z"
 * }
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { searchAllEmployees } from '../../services/search/search-all-employees.service';
import { searchAllEmployeesSchema } from '../../schemas/search/search-all-employees.schemas';

/**
 * Search All Employees - Express Controller
 * =========================================
 * 
 * Thin wrapper that delegates to the service layer.
 * Matches the employee module pattern.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - No role restrictions (all authenticated users can search)
 * 
 * @param req - Express request with params.keyword and query.exclude
 * @param res - Express response
 */
export async function searchAllEmployeesExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Search all employees request received (Express)', {
      keyword: req.params.keyword,
      exclude: req.query.exclude,
      userId: (req as any).user?.uuid,
      endpoint: 'GET /employees/search/:keyword'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated search attempt', {
        keyword: req.params.keyword
      });

      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // ==========================================================================
    // STEP 3: Parse Query Parameters
    // ==========================================================================
    // Parse exclude query param (comma-separated UUIDs)
    // Matches old controller lines 177-179
    let excludedUsers: string[] = [];
    if (typeof req.query.exclude === 'string' && req.query.exclude.trim() !== '') {
      excludedUsers = req.query.exclude.split(',').map(id => id.trim());
    }

    // ==========================================================================
    // STEP 4: Validate Input
    // ==========================================================================
    const validatedInput = searchAllEmployeesSchema.parse({
      keyword: req.params.keyword,
      excludedUsers
    });

    // ==========================================================================
    // STEP 5: Call Service Layer
    // ==========================================================================
    const results = await searchAllEmployees(validatedInput, {
      uuid: user.uuid,
      role: user.role,
      email: user.email || ''
    });

    // ==========================================================================
    // STEP 6: Send Success Response
    // ==========================================================================
    logger.info('✅ Employee search completed successfully (Express)', {
      keyword: req.params.keyword,
      resultCount: results.length,
      userId: user.uuid
    });

    // Match old response format: { data: [...] }
    return res.status(200).json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    logger.error('💥 Search all employees controller error', {
      type: 'EMPLOYEE_SEARCH_CONTROLLER_ERROR',
      keyword: req.params.keyword,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to search employees';

    if (error?.name === 'ZodError') {
      statusCode = 400;
      errorMessage = 'Invalid search parameters';
    }

    // Send error response
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      data: [],
      timestamp: new Date().toISOString()
    });
  }
}
