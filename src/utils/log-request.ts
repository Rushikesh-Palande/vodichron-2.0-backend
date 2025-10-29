import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Request Logging Middleware
 * - Logs all incoming requests with details
 * - Logs response status and duration
 * - Captures errors and exceptions
 */

export const logRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info(`📥 Incoming request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    type: 'REQUEST_INCOMING'
  });
  
  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      type: 'REQUEST_COMPLETE'
    };
    
    // Log based on status code
    if (statusCode >= 500) {
      logger.error(`📤 Response: ${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`📤 Response: ${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`, logData);
    } else {
      logger.info(`📤 Response: ${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`, logData);
    }
  });
  
  next();
};

/**
 * Error Request Logging
 */
export const logErrorRequest = (error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`💥 Error in request: ${req.method} ${req.originalUrl}`, {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
    type: 'REQUEST_ERROR'
  });
  
  next(error);
};
