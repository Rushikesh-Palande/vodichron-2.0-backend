/**
 * WebSocket Message Schemas
 * =========================
 * Zod validation schemas for WebSocket messages
 * Replaces old Ajv schema validation with type-safe Zod
 */

import { z } from 'zod';
import { OnlineStatus, WebSocketMessageType } from '../types/websocket.types';
import { ApplicationUserRole } from '../../modules/employee/types/employee.types';

/**
 * Online Status Update Payload Schema
 * ===================================
 * Validates online status update message payload
 */
export const onlineStatusUpdatePayloadSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  status: z.nativeEnum(OnlineStatus, {
    message: 'Status must be ONLINE, OFFLINE, or AWAY'
  }),
  userRole: z.nativeEnum(ApplicationUserRole, {
    message: 'Invalid user role'
  }),
});

export type OnlineStatusUpdatePayloadInput = z.infer<typeof onlineStatusUpdatePayloadSchema>;

/**
 * Close Connection Payload Schema
 * ===============================
 * Validates connection close message payload
 */
export const closeConnectionPayloadSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  userRole: z.nativeEnum(ApplicationUserRole, {
    message: 'Invalid user role'
  }),
});

export type CloseConnectionPayloadInput = z.infer<typeof closeConnectionPayloadSchema>;

/**
 * Base WebSocket Message Schema
 * =============================
 * Validates the base message structure
 */
export const webSocketMessageSchema = z.object({
  messageType: z.string().min(1, 'Message type is required'),
  payload: z.record(z.string(), z.any()),
});

export type WebSocketMessageInput = z.infer<typeof webSocketMessageSchema>;

/**
 * Specific Message Type Schemas
 * =============================
 * Validates complete messages for each type
 */

export const onlineStatusUpdateMessageSchema = z.object({
  messageType: z.literal(WebSocketMessageType.ONLINE_STATUS_UPDATE),
  payload: onlineStatusUpdatePayloadSchema,
});

export const closeConnectionMessageSchema = z.object({
  messageType: z.literal(WebSocketMessageType.CLOSE_CONNECTION),
  payload: closeConnectionPayloadSchema,
});

export const pingMessageSchema = z.object({
  messageType: z.literal(WebSocketMessageType.PING),
  payload: z.object({}).optional(),
});

/**
 * Validate Unique Field Payload Schema
 * ====================================
 * Validates field uniqueness check message payload
 */
export const validateUniqueFieldPayloadSchema = z.object({
  field: z.enum(['personalEmailId', 'officialEmailId', 'employeeId'], {
    message: 'Field must be personalEmailId, officialEmailId, or employeeId'
  }),
  value: z.string().min(1, 'Value is required'),
  requestId: z.string().min(1, 'Request ID is required'),
});

export type ValidateUniqueFieldPayloadInput = z.infer<typeof validateUniqueFieldPayloadSchema>;

export const validateUniqueFieldMessageSchema = z.object({
  messageType: z.literal(WebSocketMessageType.VALIDATE_UNIQUE_FIELD),
  payload: validateUniqueFieldPayloadSchema,
});

/**
 * Union Schema for All Message Types
 * ==================================
 * Discriminated union for all supported message types
 */
export const allWebSocketMessagesSchema = z.discriminatedUnion('messageType', [
  onlineStatusUpdateMessageSchema,
  closeConnectionMessageSchema,
  validateUniqueFieldMessageSchema,
  pingMessageSchema,
]);

export type AllWebSocketMessages = z.infer<typeof allWebSocketMessagesSchema>;
