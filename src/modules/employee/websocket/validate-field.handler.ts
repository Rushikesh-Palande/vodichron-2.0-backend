/**
 * Employee Field Validation WebSocket Handler
 * ============================================
 * Real-time validation for employee unique fields via WebSocket
 * 
 * Validates:
 * - personalEmailId uniqueness
 * - officialEmailId uniqueness
 * - employeeId uniqueness
 */

import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import {
  WebSocketMessage,
  WebSocketMessageType,
  ValidateUniqueFieldPayload,
  ValidationResultPayload,
  ExtendedWebSocket,
} from '../../../websocket/types/websocket.types';
import { checkEmployeeEmailExists, checkEmployeeIdExists } from '../stores/crud/create.store';

/**
 * Handle Employee Field Validation Request
 * =========================================
 * Validates uniqueness of employee fields in real-time via WebSocket
 * 
 * @param ws - WebSocket connection
 * @param message - Incoming validation message
 */
export async function handleEmployeeFieldValidation(
  ws: ExtendedWebSocket,
  message: WebSocketMessage
): Promise<void> {
  const timer = new PerformanceTimer('ws_validate_employee_field');

  try {
    const payload = message.payload as ValidateUniqueFieldPayload;
    const { field, value, requestId } = payload;

    // Input validation
    if (!field || !value || !requestId) {
      logger.warn('⚠️  Invalid employee validation request payload', {
        userId: ws.userId,
        payload,
        operation: 'handleEmployeeFieldValidation',
      });

      ws.send(
        JSON.stringify({
          messageType: WebSocketMessageType.VALIDATE_UNIQUE_FIELD,
          payload: {
            field,
            value,
            requestId,
            exists: false,
            isUnique: false,
            message: 'Invalid validation request',
          } as ValidationResultPayload,
        })
      );
      return;
    }

    logger.info('🔍 Real-time employee field validation requested', {
      userId: ws.userId,
      field,
      valueLength: value.length,
      requestId,
      operation: 'handleEmployeeFieldValidation',
    });

    let exists = false;
    let errorMessage: string | undefined;
    let fieldLabel = '';

    // Check field uniqueness based on field type
    switch (field) {
      case 'personalEmailId': {
        // Check if personal email exists
        const personalEmailEmployee = await checkEmployeeEmailExists(value, 'personalEmail');
        exists = !!personalEmailEmployee;
        fieldLabel = 'Personal Email';
        break;
      }

      case 'officialEmailId': {
        // Check if official email exists
        const officialEmailEmployee = await checkEmployeeEmailExists(value, 'officialEmailId');
        exists = !!officialEmailEmployee;
        fieldLabel = 'Official Email';
        break;
      }

      case 'employeeId': {
        // Check if employee ID exists
        const employeeIdRecord = await checkEmployeeIdExists(value);
        exists = !!employeeIdRecord;
        fieldLabel = 'Employee ID';
        break;
      }

      default:
        errorMessage = `Unknown field type: ${field}`;
        logger.warn('⚠️  Unknown employee validation field type', {
          userId: ws.userId,
          field,
          requestId,
        });
        break;
    }

    const duration = timer.end();

    // Prepare response
    const response: ValidationResultPayload = {
      field,
      value,
      exists,
      isUnique: !exists,
      requestId,
      message:
        errorMessage ||
        (exists
          ? `${fieldLabel} is already in use`
          : `${fieldLabel} is available`),
    };

    // Send validation result back to client
    ws.send(
      JSON.stringify({
        messageType: WebSocketMessageType.VALIDATE_UNIQUE_FIELD,
        payload: response,
      })
    );

    logger.info(
      `✅ Employee field validation completed: ${field} - ${exists ? 'EXISTS' : 'UNIQUE'}`,
      {
        userId: ws.userId,
        field,
        exists,
        requestId,
        duration: `${duration}ms`,
      }
    );

    logSecurity(
      'EMPLOYEE_FIELD_VALIDATION',
      'low',
      {
        field,
        exists,
        duration,
      },
      undefined,
      ws.userId
    );
  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Employee field validation failed', {
      userId: ws.userId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      operation: 'handleEmployeeFieldValidation',
    });

    // Send error response
    const payload = message.payload as ValidateUniqueFieldPayload;
    ws.send(
      JSON.stringify({
        messageType: WebSocketMessageType.VALIDATE_UNIQUE_FIELD,
        payload: {
          field: payload.field,
          value: payload.value,
          requestId: payload.requestId,
          exists: false,
          isUnique: false,
          message: 'Validation failed. Please try again.',
        } as ValidationResultPayload,
      })
    );

    logSecurity(
      'EMPLOYEE_FIELD_VALIDATION_ERROR',
      'medium',
      {
        field: payload.field,
        error: error.message,
        duration,
      },
      undefined,
      ws.userId
    );
  }
}
