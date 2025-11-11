/**
 * WebSocket Types
 * ================
 * Type definitions for WebSocket communication
 * Based on old vodichron WebSocket implementation
 */

import { ApplicationUserRole } from '../../modules/employee/types/employee.types';

/**
 * Online Status Enum
 * ==================
 * Possible online status values for employees
 */
export enum OnlineStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
}

/**
 * WebSocket Message Types
 * =======================
 * Supported message types for WebSocket communication
 */
export enum WebSocketMessageType {
  ONLINE_STATUS_UPDATE = 'online_status_update',
  CLOSE_CONNECTION = 'close_connection',
  VALIDATE_UNIQUE_FIELD = 'validate_unique_field',
  PING = 'ping',
  PONG = 'pong',
}

/**
 * Base WebSocket Message Interface
 * =================================
 */
export interface WebSocketMessage {
  messageType: WebSocketMessageType | string;
  payload: Record<string, any>;
}

/**
 * Online Status Update Payload
 * =============================
 * Payload for online status update messages
 */
export interface OnlineStatusUpdatePayload {
  userId: string;
  status: OnlineStatus;
  userRole: ApplicationUserRole;
}

/**
 * Close Connection Payload
 * ========================
 * Payload for connection close (logout) messages
 */
export interface CloseConnectionPayload {
  userId: string;
  userRole: ApplicationUserRole;
}

/**
 * Validate Unique Field Payload
 * ==============================
 * Payload for real-time field uniqueness validation
 */
export interface ValidateUniqueFieldPayload {
  field: 'personalEmailId' | 'officialEmailId' | 'employeeId';
  value: string;
  requestId: string; // Client-generated ID to match request/response
}

/**
 * Validation Result Payload
 * =========================
 * Response payload for validation requests
 */
export interface ValidationResultPayload {
  field: string;
  value: string;
  isUnique: boolean;
  exists: boolean;
  requestId: string;
  message?: string;
}

/**
 * WebSocket Response
 * ==================
 * Standard response format for WebSocket messages
 */
export interface WebSocketResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
}

/**
 * WebSocket Error Response
 * ========================
 * Error response format
 */
export interface WebSocketErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  payload?: any;
}
/**
 * Extended WebSocket Interface
 * ============================= 
 * Extended WebSocket with custom properties
 */
export interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
  userRole?: ApplicationUserRole;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string): this;
  ping(data?: any, mask?: boolean, cb?: (err?: Error) => void): void;
  terminate(): void;
  readyState: number;
}
