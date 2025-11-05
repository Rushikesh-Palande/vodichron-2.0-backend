/**
 * Search Leave Approver Controller (Express REST API)
 * ==================================================
 * 
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Based on: old vodichron searchEmployeeForLeaveApproverAssigment controller (lines 217-230)
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic) → Store (database)
 * 
 * Endpoint: GET /api/employees/search/leave-approver/:keyword
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
 *     { uuid: "...", name: "...", officialEmailId: "..." }
 *   ],
 *   timestamp: "2024-01-01T00:00:00.000Z"
 * }
 * 
 * Note: Returns only employees with designation='Director'
 * Auto-excludes logged-in user from results
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { searchForLeaveApprover } from '../../services/search/search-leave-approver.service';
import { searchLeaveApproverSchema } from '../../schemas/search/search-leave-approver.schemas';

/**
 * Search Leave Approver - Express Controller
 * ==========================================
 * 
 * Thin wrapper that delegates to the service layer.
 * 
 * Authorization:
 * - User must be authenticated (middleware)
 * - No role restrictions (all authenticated users can search)
 * 
 * @param req - Express request with params.keyword and query.exclude
 * @param res - Express response
 */
export async function searchLeaveApproverExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Search leave approver request received (Express)', {
      keyword: req.params.keyword,
      exclude: req.query.exclude,
      userId: (req as any).user?.uuid,
      endpoint: 'GET /employees/search/leave-approver/:keyword'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated leave approver search attempt', {
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
    // Matches old controller lines 220-223
    let excludedUsers: string[] = [];
    if (typeof req.query.exclude === 'string' && req.query.exclude.trim() !== '') {
      excludedUsers = req.query.exclude.split(',').map(id => id.trim());
    }

    // ==========================================================================
    // STEP 4: Validate Input
    // ==========================================================================
    const validatedInput = searchLeaveApproverSchema.parse({
      keyword: req.params.keyword,
      excludedUsers
    });

    // ==========================================================================
    // STEP 5: Call Service Layer
    // ==========================================================================
    // Service layer will auto-add logged-in user to exclusion list (line 225)
    const results = await searchForLeaveApprover(validatedInput, {
      uuid: user.uuid,
      role: user.role,
      email: user.email || ''
    });

    // ==========================================================================
    // STEP 6: Send Success Response
    // ==========================================================================
    logger.info('✅ Leave approver search completed successfully (Express)', {
      keyword: req.params.keyword,
      resultCount: results.length,
      description: 'Directors only',
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
    logger.error('💥 Search leave approver controller error', {
      type: 'LEAVE_APPROVER_SEARCH_CONTROLLER_ERROR',
      keyword: req.params.keyword,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to search employees for leave approver';

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
