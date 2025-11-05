/**
 * WebSocket Socket Authorizer
 * ===========================
 * Middleware for authorizing WebSocket connections
 * Validates request origin and connection headers
 * Implements security checks for incoming connections
 * 
 * Based on old vodichron socketAuthorizer with improved validation
 */

import http from 'http';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ApplicationUserRole } from '../../modules/employee/types/employee.types';

/**
 * Authorization Result
 */
interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  userId?: string;
  userRole?: ApplicationUserRole;
}

/**
 * Authorize WebSocket Connection
 * ==============================
 * Validates WebSocket upgrade request
 * Checks origin, headers, and connection validity
 * 
 * @param req - HTTP upgrade request
 * @returns Authorization result with status and metadata
 */
export function authorizeWebSocketConnection(req: http.IncomingMessage): AuthorizationResult {
  try {
    const clientIp = req.socket.remoteAddress || 'unknown';
    
    logger.debug('🔐 Authorizing WebSocket connection', {
      clientIp,
      origin: req.headers.origin,
      url: req.url
    });

    // Validate request headers exist
    if (!req.headers || !req.headers.origin) {
      logger.warn('⚠️ WebSocket authorization failed - Missing origin header', {
        clientIp
      });
      return {
        authorized: false,
        reason: 'Missing origin header'
      };
    }

    // Check CORS origin
    const origin = req.headers.origin as string;
    const allowedOrigins = Array.isArray(config.cors.origin) 
      ? config.cors.origin 
      : [config.cors.origin];

    const isOriginAllowed = 
      allowedOrigins.includes(origin) || 
      allowedOrigins.includes('*') ||
      (config.isDevelopment && origin.startsWith('http://localhost'));

    if (!isOriginAllowed) {
      logger.warn('🚫 WebSocket connection rejected - CORS origin not allowed', {
        clientIp,
        origin,
        allowedOrigins
      });
      return {
        authorized: false,
        reason: 'Origin not allowed by CORS policy'
      };
    }

    // Validate URL path
    if (!req.url || !req.url.startsWith('/ws-con-ui-update')) {
      logger.warn('⚠️ WebSocket authorization failed - Invalid URL path', {
        clientIp,
        url: req.url
      });
      return {
        authorized: false,
        reason: 'Invalid WebSocket endpoint'
      };
    }

    // Parse query parameters from URL
    const urlParams = new URLSearchParams(new URL(`http://dummy${req.url}`).search);
    
    // Extract userId and userRole from query params
    const userId = urlParams.get('userId');
    const userRoleParam = urlParams.get('userRole');

    if (!userId) {
      logger.warn('⚠️ WebSocket authorization failed - Missing userId parameter', {
        clientIp,
        url: req.url
      });
      return {
        authorized: false,
        reason: 'Missing userId parameter'
      };
    }

    if (!userRoleParam) {
      logger.warn('⚠️ WebSocket authorization failed - Missing userRole parameter', {
        clientIp,
        userId,
        url: req.url
      });
      return {
        authorized: false,
        reason: 'Missing userRole parameter'
      };
    }

    // Validate userRole is a valid enum value
    const validRoles = Object.values(ApplicationUserRole);
    if (!validRoles.includes(userRoleParam as ApplicationUserRole)) {
      logger.warn('⚠️ WebSocket authorization failed - Invalid userRole', {
        clientIp,
        userId,
        userRole: userRoleParam,
        validRoles
      });
      return {
        authorized: false,
        reason: 'Invalid user role'
      };
    }

    // Validate userId format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      logger.warn('⚠️ WebSocket authorization failed - Invalid userId format (not UUID)', {
        clientIp,
        userId
      });
      return {
        authorized: false,
        reason: 'Invalid userId format'
      };
    }

    // Check for authorization header or token in query params (optional for enhanced security)
    const token = urlParams.get('token');
    if (!token && config.isProduction) {
      logger.warn('⚠️ WebSocket connection attempted without token in production', {
        clientIp,
        userId
      });
      // In production, you might want to require a token
      // return { authorized: false, reason: 'Missing token' };
    }

    logger.info('✅ WebSocket connection authorized', {
      clientIp,
      userId,
      userRole: userRoleParam,
      origin
    });

    return {
      authorized: true,
      userId,
      userRole: userRoleParam as ApplicationUserRole
    };

  } catch (error: any) {
    logger.error('❌ Unexpected error during WebSocket authorization', {
      error: error.message,
      stack: error.stack,
      clientIp: req.socket.remoteAddress
    });
    return {
      authorized: false,
      reason: 'Authorization check failed'
    };
  }
}

/**
 * Validate Origin
 * ===============
 * Check if origin is in allowed list
 * 
 * @param origin - Request origin header
 * @returns true if origin is allowed
 */
export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = Array.isArray(config.cors.origin) 
    ? config.cors.origin 
    : [config.cors.origin];

  return (
    allowedOrigins.includes(origin) || 
    allowedOrigins.includes('*') ||
    (config.isDevelopment && origin.startsWith('http://localhost'))
  );
}

/**
 * Validate UUID Format
 * ====================
 * Check if string is valid UUID
 * 
 * @param uuid - String to validate
 * @returns true if valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
