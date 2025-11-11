/**
 * Get Employee ID from Authenticated User Helper
 * ===============================================
 * Fetches the employeeId associated with an authenticated user's UUID
 * from the database. Used when JWT payload only contains user UUID.
 * 
 * The JWT token contains minimal claims (uuid, role, email, type) for security.
 * When we need the employeeId (which links to the employees table), we must
 * fetch it from the users table.
 * 
 * @module get-employee-id-from-user
 */

import User from '../../../models/user.model';
import { logger } from '../../../utils/logger';

/**
 * Get Employee ID from User UUID
 * -------------------------------
 * Fetches the employeeId from the users table using the user's UUID.
 * 
 * @param userUuid - UUID of the authenticated user (from JWT token)
 * @returns Employee UUID if found, null otherwise
 * 
 * @throws {Error} Database error during lookup
 * 
 * @example
 * const employeeId = await getEmployeeIdFromUser(req.user.uuid);
 * if (!employeeId) {
 *   return res.status(404).json({ message: 'Employee not found' });
 * }
 */
export async function getEmployeeIdFromUser(userUuid: string): Promise<string | null> {
  try {
    logger.debug('🔍 Fetching employeeId from user UUID', {
      userUuid,
      operation: 'getEmployeeIdFromUser'
    });

    const user = await User.findOne({
      where: { uuid: userUuid },
      attributes: ['employeeId'],
      raw: true
    });

    if (!user || !user.employeeId) {
      logger.warn('⚠️ User not found or missing employeeId', {
        userUuid,
        found: !!user
      });
      return null;
    }

    logger.debug('✅ EmployeeId retrieved', {
      userUuid,
      employeeId: user.employeeId
    });

    return user.employeeId;

  } catch (error: any) {
    logger.error('❌ Failed to get employeeId from user', {
      userUuid,
      error: error.message,
      stack: error.stack
    });

    throw new Error(`Database error while fetching employeeId: ${error.message}`);
  }
}

/**
 * Get Employee ID from Request
 * -----------------------------
 * Convenience function to extract employeeId from an authenticated Express request.
 * Checks req.user (set by auth middleware) and fetches employeeId from database.
 * 
 * @param req - Express request object with authenticated user
 * @returns Employee UUID if found, null if user not authenticated or employee not found
 * 
 * @example
 * const employeeId = await getEmployeeIdFromRequest(req);
 * if (!employeeId) {
 *   return res.status(401).json({ message: 'Unauthorized' });
 * }
 */
export async function getEmployeeIdFromRequest(req: any): Promise<string | null> {
  const user = req.user;
  
  if (!user || !user.uuid) {
    logger.warn('⚠️ No authenticated user in request', {
      operation: 'getEmployeeIdFromRequest'
    });
    return null;
  }

  return getEmployeeIdFromUser(user.uuid);
}
