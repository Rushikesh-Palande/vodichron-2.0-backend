/**
 * WebSocket Message Driver
 * =======================
 * Validates incoming WebSocket messages using Zod schemas
 * Routes messages to appropriate handlers based on message type
 * Handles errors and sends responses back to client
 * 
 * Based on old vodichron messageDriver with improved Zod validation
 */

import { ExtendedWebSocket, WebSocketMessageType } from '../types/websocket.types';
import { 
  allWebSocketMessagesSchema, 
  AllWebSocketMessages 
} from '../schemas/message.schemas';
import { updateOnlineStatusHandler } from './online-status.handler';
import { logoutUserHandler } from './logout.handler';
import { handleEmployeeFieldValidation } from '../../modules/employee/websocket/validate-field.handler';
import { logger } from '../../utils/logger';

/**
 * Validate and Process WebSocket Message
 * ======================================
 * Main message router that validates all incoming messages
 * and delegates to specific handlers
 * 
 * @param client - Extended WebSocket client instance
 * @param rawMessage - Raw message data from client
 */
export async function validateAndProcessMessage(
  client: ExtendedWebSocket,
  rawMessage: string | Buffer
): Promise<void> {
  try {
    // Parse JSON message
    let parsedMessage: AllWebSocketMessages;
    
    try {
      const messageStr = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString('utf-8');
      parsedMessage = JSON.parse(messageStr);
    } catch (parseError: any) {
      logger.error('❌ Failed to parse WebSocket message', {
        error: parseError.message,
        messagePreview: rawMessage.toString().substring(0, 100)
      });
      
      const errorResponse = {
        status: 'error',
        message: 'Invalid JSON format',
        code: 'INVALID_JSON'
      };
      client.send(JSON.stringify(errorResponse));
      return;
    }

    // Validate message schema using Zod
    const validationResult = allWebSocketMessagesSchema.safeParse(parsedMessage);
    
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      
      logger.warn('⚠️ WebSocket message validation failed', {
        errors: validationErrors,
        messageType: parsedMessage.messageType
      });

      const errorResponse = {
        status: 'error',
        message: 'Schema validation failed',
        code: 'SCHEMA_VALIDATION_ERROR',
        details: validationResult.error.issues.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message
        }))
      };
      
      client.send(JSON.stringify(errorResponse));
      return;
    }

    const validatedMessage = validationResult.data;
    
    // Extract userId for logging (only some message types have it)
    const userId = validatedMessage.payload && 'userId' in validatedMessage.payload 
      ? (validatedMessage.payload as any).userId 
      : undefined;
    
    logger.debug('✅ WebSocket message validated', {
      messageType: validatedMessage.messageType,
      userId
    });

    // Route message to appropriate handler
    let response: string;
    
    switch (validatedMessage.messageType) {
      case WebSocketMessageType.ONLINE_STATUS_UPDATE:
        response = await updateOnlineStatusHandler(
          client,
          validatedMessage.payload
        );
        break;
        
      case WebSocketMessageType.CLOSE_CONNECTION:
        response = await logoutUserHandler(
          client,
          validatedMessage.payload
        );
        break;
      
      case WebSocketMessageType.VALIDATE_UNIQUE_FIELD:
        // Handle employee field validation (no response needed, handler sends directly)
        await handleEmployeeFieldValidation(client, validatedMessage);
        return; // Handler sends response directly, don't send again
        
      case WebSocketMessageType.PING:
        logger.debug('🏓 PING received');
        response = JSON.stringify({
          status: 'success',
          messageType: WebSocketMessageType.PONG,
          timestamp: new Date().toISOString()
        });
        break;
        
      default: {
        const unreachable: never = validatedMessage;
        logger.warn('🚫 Unsupported message type', {
          messageType: unreachable
        });
        
        response = JSON.stringify({
          status: 'error',
          message: 'Unsupported message type',
          code: 'UNSUPPORTED_MESSAGE_TYPE'
        });
      }
    }

    logger.debug('📤 Sending WebSocket response', {
      messageType: validatedMessage.messageType,
      responsePreview: response.substring(0, 100)
    });

    client.send(response);

  } catch (error: any) {
    logger.error('❌ Unexpected error in validateAndProcessMessage', {
      error: error.message,
      stack: error.stack,
      messagePreview: rawMessage.toString().substring(0, 100)
    });

    const failureResponse = {
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      reason: error.message
    };

    try {
      client.send(JSON.stringify(failureResponse));
    } catch (sendError: any) {
      logger.error('❌ Failed to send error response to client', {
        error: sendError.message
      });
    }
  }
}
