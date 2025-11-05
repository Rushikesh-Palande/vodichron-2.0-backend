/**
 * Online Status Update Handler
 * ============================
 * Handles online status update messages from WebSocket clients
 * Updates employee online status in database
 * Validates that only employees (not customers) can update status
 * 
 * Based on old vodichron updateOnlineStatus with improved error handling
 */

import { ExtendedWebSocket, OnlineStatusUpdatePayload } from '../types/websocket.types';
import { ApplicationUserRole } from '../../modules/employee/types/employee.types';
import { upsertEmployeeOnlineStatus, getEmployeeByUuid } from '../stores/online-status.store';
import { logger } from '../../utils/logger';

/**
 * Handle Online Status Update
 * ===========================
 * Process online status update from client and persist to database
 * 
 * @param client - Extended WebSocket client instance
 * @param payload - Validated online status update payload
 * @returns JSON response string
 */
export async function updateOnlineStatusHandler(
  client: ExtendedWebSocket,
  payload: OnlineStatusUpdatePayload
): Promise<string> {
  const { userId, status, userRole } = payload;

  try {
    logger.info('🟢 Processing online status update', {
      userId,
      status,
      userRole,
      operation: 'ONLINE_STATUS_UPDATE'
    });

    // Only update status for employees, not customers
    if (userRole === ApplicationUserRole.customer) {
      logger.debug('ℹ️ Customer status update skipped (not applicable)', {
        userId,
        userRole
      });

      return JSON.stringify({
        status: 'success',
        message: 'Customers do not have online status tracking',
        userId
      });
    }

    // Validate employee exists
    const employee = await getEmployeeByUuid(userId);
    
    if (!employee) {
      logger.warn('⚠️ Employee not found for online status update', {
        userId,
        operation: 'ONLINE_STATUS_UPDATE'
      });

      return JSON.stringify({
        status: 'error',
        message: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
        userId
      });
    }

    // Update employee online status
    await upsertEmployeeOnlineStatus(userId, status);

    // Store status on client object for reference
    client.userId = userId;

    logger.info('✅ Employee online status updated successfully', {
      userId,
      employeeName: employee.name,
      status,
      operation: 'ONLINE_STATUS_UPDATE'
    });

    return JSON.stringify({
      status: 'success',
      message: 'Online status updated successfully',
      data: {
        userId,
        status,
        employee: {
          uuid: employee.uuid,
          name: employee.name
        }
      }
    });

  } catch (error: any) {
    logger.error('❌ Failed to update online status', {
      userId,
      status,
      userRole,
      error: error.message,
      code: error.code,
      stack: error.stack,
      operation: 'ONLINE_STATUS_UPDATE'
    });

    return JSON.stringify({
      status: 'error',
      message: 'Failed to update online status',
      code: 'STATUS_UPDATE_FAILED',
      userId,
      reason: error.message
    });
  }
}
