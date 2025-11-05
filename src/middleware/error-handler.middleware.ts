import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logErrorRequest } from '../utils/log-request';
import { logger, logSecurity, logRequest, PerformanceTimer } from '../utils/logger';

/**
 * Global Error Handler Middleware
 * -------------------------------
 * 
 * Centralized error handling middleware for the application.
 * Catches all errors thrown in routes and other middleware.
 * 
 * Features:
 * - Consistent error response format
 * - Environment-specific error details (stack traces in dev)
 * - Comprehensive error logging with context
 * - Security event logging for suspicious patterns
 * - HTTP status code categorization (4xx vs 5xx)
 * - Client IP and user agent tracking
 * 
 * Error Categories:
 * - 5xx Server Errors: Critical logging with full context
 * - 4xx Client Errors: Warning logging
 * - 401/403: Security event logging for unauthorized access
 * 
 * @param error - The error object thrown by application
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  const timer = new PerformanceTimer('errorHandler');
  
  logger.debug(`🔍 Error handler invoked for ${req.method} ${req.originalUrl}`, {
    errorType: error.name,
    errorMessage: error.message,
    requestId: req.headers['x-request-id']
  });
  
  // Use existing error request logger
  logErrorRequest(error, req, res, next);
  
  const statusCode = error.status || error.statusCode || 500;
  
  // Enhanced error logging with categorization
  if (statusCode >= 500) {
    // Server errors - critical
    logger.error('❌ Server Error', {
      error: error.message,
      stack: error.stack,
      statusCode,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      body: req.body,
      params: req.params,
      query: req.query,
      type: 'SERVER_ERROR'
    });
    
    // Log security event for repeated server errors
    logSecurity('SERVER_ERROR_OCCURRED', 'high', {
      error: error.message,
      statusCode,
      url: req.originalUrl,
      method: req.method
    }, req.ip);
    
  } else if (statusCode >= 400) {
    // Client errors - warning
    logger.warn('⚠️ Client Error', {
      error: error.message,
      statusCode,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      type: 'CLIENT_ERROR'
    });
    
    // Log suspicious patterns (repeated 401, 403)
    if (statusCode === 401 || statusCode === 403) {
      logSecurity('UNAUTHORIZED_ACCESS_ATTEMPT', 'medium', {
        error: error.message,
        statusCode,
        url: req.originalUrl,
        method: req.method
      }, req.ip);
    }
  }
  
  // Log the HTTP request with error status
  logRequest(req.method, req.originalUrl, statusCode);
  
  const errorResponse: any = {
    success: false,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };
  
  // Include debug information in development
  if (config.isDevelopment) {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      type: error.type,
      code: error.code,
    };
  }
  
  res.status(statusCode).json(errorResponse);
  
  // Log performance
  const duration = timer.end({
    statusCode,
    errorType: error.name,
    url: req.originalUrl
  });
  
  logger.debug(`✅ Error handler completed for ${req.method} ${req.originalUrl}`, {
    statusCode,
    duration: `${duration}ms`
  });
};
