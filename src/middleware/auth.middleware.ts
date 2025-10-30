/**
 * JWT Authentication Middleware
 * ==============================
 * 
 * Middleware to verify JWT tokens and attach user payload to req.user.
 * Used for protecting routes that require authentication.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { extractTokenFromAuthHeader } from '../modules/auth/helpers/extract-token-from-header';
import { verifyToken } from '../modules/auth/helpers/verify-token';

/**
 * Authenticate JWT Middleware
 * ============================
 * 
 * Verifies the JWT token from Authorization header and attaches
 * the decoded user payload to req.user for downstream handlers.
 * 
 * Returns 401 if token is missing, invalid, or expired.
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  
  // Extract token from Bearer header
  const token = extractTokenFromAuthHeader(authorization);
  
  if (!token) {
    logger.warn('⚠️ Authentication failed - No token provided', {
      type: 'AUTH_MIDDLEWARE_NO_TOKEN',
      path: req.path
    });
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_TOKEN_MISSING',
      timestamp: new Date().toISOString()
    });
  }
  
  // Verify token
  const user = verifyToken(token);
  
  if (!user) {
    logger.warn('⚠️ Authentication failed - Invalid token', {
      type: 'AUTH_MIDDLEWARE_INVALID_TOKEN',
      path: req.path
    });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      code: 'AUTH_TOKEN_INVALID',
      timestamp: new Date().toISOString()
    });
  }
  
  // Attach user to request
  (req as any).user = user;
  
  logger.debug('✅ Authentication successful', {
    type: 'AUTH_MIDDLEWARE_SUCCESS',
    userUuid: user.uuid,
    role: user.role,
    path: req.path
  });
  
  next();
}
