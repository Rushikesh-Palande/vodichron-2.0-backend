/**
 * Logout User Handler
 * ===================
 * Handles connection close/logout messages from WebSocket clients
 * Sets employee status to OFFLINE
 * Updates user's last login timestamp
 * 
 * Based on old vodichron logoutUser with improved error handling
 */

import { ExtendedWebSocket, CloseConnectionPayload, OnlineStatus } from '../types/websocket.types';
import { ApplicationUserRole } from '../../modules/employee/types/employee.types';
import { 
  upsertEmployeeOnlineStatus, 
  updateUserLastLogin,
  getEmployeeByUuid 
} from '../stores/online-status.store';
import { logger } from '../../utils/logger';

/**
 * Handle User Logout
 * ==================
 * Process logout/connection close from client
 * Updates status to OFFLINE and last login timestamp
 * 
 * @param client - Extended WebSocket client instance
 * @param payload - Validated close connection payload
 * @returns JSON response string
 */
export async function logoutUserHandler(
  client: ExtendedWebSocket,
  payload: CloseConnectionPayload
): Promise<string> {
  const { userId, userRole } = payload;

  try {
    logger.info('👋 Processing user logout', {
      userId,
      userRole,
      operation: 'USER_LOGOUT'
    });

    // Only process logout for employees, not customers
    if (userRole === ApplicationUserRole.customer) {
      logger.debug('ℹ️ Customer logout skipped (not applicable)', {
        userId,
        userRole
      });

      return JSON.stringify({
        status: 'success',
        message: 'Logout processed successfully',
        userId
      });
    }

    // Validate employee exists
    const employee = await getEmployeeByUuid(userId);
    
    if (!employee) {
      logger.warn('⚠️ Employee not found for logout', {
        userId,
        operation: 'USER_LOGOUT'
      });

      // Still update user last login even if employee not found
      try {
        await updateUserLastLogin(userId);
        logger.info('✅ User last login updated despite missing employee', { userId });
      } catch (updateError: any) {
        logger.error('❌ Failed to update user last login', {
          userId,
          error: updateError.message
        });
      }

      return JSON.stringify({
        status: 'success',
        message: 'Logout processed (employee not found)',
        userId
      });
    }

    // Update employee status to OFFLINE
    await upsertEmployeeOnlineStatus(userId, OnlineStatus.OFFLINE);

    // Update user last login timestamp
    await updateUserLastLogin(userId);

    logger.info('✅ User logged out successfully', {
      userId,
      employeeName: employee.name,
      newStatus: OnlineStatus.OFFLINE,
      operation: 'USER_LOGOUT'
    });

    return JSON.stringify({
      status: 'success',
      message: 'Logout processed successfully',
      data: {
        userId,
        newStatus: OnlineStatus.OFFLINE,
        employee: {
          uuid: employee.uuid,
          name: employee.name
        }
      }
    });

  } catch (error: any) {
    logger.error('❌ Failed to process user logout', {
      userId,
      userRole,
      error: error.message,
      code: error.code,
      stack: error.stack,
      operation: 'USER_LOGOUT'
    });

    return JSON.stringify({
      status: 'error',
      message: 'Failed to process logout',
      code: 'LOGOUT_FAILED',
      userId,
      reason: error.message
    });
  }
}
