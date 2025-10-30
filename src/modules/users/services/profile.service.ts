/**
 * Get User Profile Service
 * =========================
 * 
 * Business logic for fetching current user's profile for Express REST API.
 * This service handles Express Request/Response objects directly.
 * 
 * Pattern: Returns data from JWT token (req.user) - matches old vodichron
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { getEmployeeByUuidWithManagerDetail } from '../../employee/stores/crud/employee.store';
import User from '../../../models/user.model';

/**
 * Handle Get User Profile
 * =======================
 * 
 * Returns the current authenticated user's profile.
 * Data comes from JWT token decoded by auth middleware.
 * 
 * Matches old vodichron userController.getUserProfile (lines 56-62)
 */
export async function handleGetUserProfile(req: Request, res: Response) {
  const timer = new PerformanceTimer('getUserProfile_service');
  const user = (req as any).user;

  try {
    logger.info('👤 Fetching user profile', {
      requestedBy: user?.uuid,
      operation: 'getUserProfile'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Fetch employee details if user is an employee
    let employeeName = null;
    if (user.type === 'employee') {
      // user.uuid is from application_users table, need to get employeeId first
      const appUser = await User.findOne({ where: { uuid: user.uuid } });
      if (appUser && appUser.employeeId) {
        // Now fetch employee by employeeId
        const employee = await getEmployeeByUuidWithManagerDetail(appUser.employeeId);
        if (employee) {
          employeeName = employee.name;
        }
      }
    }

    const duration = timer.end();

    logger.info('✅ User profile fetched successfully', {
      userUuid: user.uuid,
      userRole: user.role,
      employeeName,
      duration: `${duration}ms`
    });

    logSecurity('GET_USER_PROFILE_SUCCESS', 'low', {
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    // Return user data with employee name
    return res.status(200).json({
      data: {
        ...user,
        name: employeeName
      }
    });

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to fetch user profile', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_USER_PROFILE_ERROR', 'critical', {
      error: error.message,
      duration
    }, undefined, user?.uuid);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
}
