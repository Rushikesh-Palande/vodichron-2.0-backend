import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger, logSecurity } from '../utils/logger';

/**
 * 404 Not Found Handler Middleware
 * --------------------------------
 * 
 * Handles requests to non-existent routes.
 * This middleware should be mounted after all valid routes.
 * 
 * Features:
 * - Logs 404 attempts with request details
 * - Returns helpful error response with available endpoints
 * - Tracks IP and user agent for monitoring
 * - Provides navigation hints to valid endpoints
 * 
 * Response includes:
 * - Error message with attempted route
 * - List of available endpoints (health, API, documentation)
 * - Consistent JSON error format
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  logger.warn(`🚨 404 Not Found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    url: req.originalUrl,
    referer: req.get('referer'),
    timestamp: new Date().toISOString(),
    type: '404_NOT_FOUND'
  });
  
  // Log security event for suspicious 404 patterns (potential scanning)
  if (req.originalUrl.includes('admin') || 
      req.originalUrl.includes('wp-') || 
      req.originalUrl.includes('.php') ||
      req.originalUrl.includes('.env')) {
    logSecurity('SUSPICIOUS_404_PATTERN', 'medium', {
      url: req.originalUrl,
      method: req.method,
      pattern: 'Potential vulnerability scanning'
    }, req.ip);
  }
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      health: '/health',
      api: config.api.prefix,
      documentation: '/'
    }
  });
};
