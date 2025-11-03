/**
 * Search Role Assignment Controller (Express REST API)
 * ===================================================
 * 
 * Thin wrapper controller for Express routes.
 * Delegates to the service layer for business logic.
 * 
 * Based on: old vodichron searchEmployeeForRoleAssignment controller (lines 188-202)
 * 
 * Pattern:
 * Controller (thin wrapper) → Service (business logic) → Store (database)
 * 
 * Endpoint: GET /api/employees/search/role-assignment/:keyword
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
 * Note: Returns only employees WITHOUT application_users record (no role)
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { searchForRoleAssignment } from '../../services/search/search-role-assignment.service';
import { searchRoleAssignmentSchema } from '../../schemas/search/search-role-assignment.schemas';

/**
 * Search Role Assignment - Express Controller
 * ===========================================
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
export async function searchRoleAssignmentExpressController(req: Request, res: Response) {
  try {
    // ==========================================================================
    // STEP 1: Log Incoming Request
    // ==========================================================================
    logger.info('📥 Search role assignment request received (Express)', {
      keyword: req.params.keyword,
      exclude: req.query.exclude,
      userId: (req as any).user?.uuid,
      endpoint: 'GET /employees/search/role-assignment/:keyword'
    });

    // ==========================================================================
    // STEP 2: Extract and Validate User Context
    // ==========================================================================
    const user = (req as any).user;
    
    if (!user) {
      logger.warn('⛔ Unauthenticated role assignment search attempt', {
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
    // Matches old controller lines 191-194
    let excludedUsers: string[] = [];
    if (typeof req.query.exclude === 'string' && req.query.exclude.trim() !== '') {
      excludedUsers = req.query.exclude.split(',').map(id => id.trim());
    }

    // ==========================================================================
    // STEP 4: Validate Input
    // ==========================================================================
    const validatedInput = searchRoleAssignmentSchema.parse({
      keyword: req.params.keyword,
      excludedUsers
    });

    // ==========================================================================
    // STEP 5: Call Service Layer
    // ==========================================================================
    const results = await searchForRoleAssignment(validatedInput, {
      uuid: user.uuid,
      role: user.role,
      email: user.email || ''
    });

    // ==========================================================================
    // STEP 6: Send Success Response
    // ==========================================================================
    logger.info('✅ Role assignment search completed successfully (Express)', {
      keyword: req.params.keyword,
      resultCount: results.length,
      description: 'Employees without roles',
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
    logger.error('💥 Search role assignment controller error', {
      type: 'ROLE_ASSIGNMENT_SEARCH_CONTROLLER_ERROR',
      keyword: req.params.keyword,
      error: error?.message,
      stack: error?.stack
    });

    // Map error codes to HTTP status codes
    let statusCode = 500;
    let errorMessage = error?.message || 'Failed to search employees for role assignment';

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
