import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger, logSecurity } from '../utils/logger';

/**
 * Rate Limiter Middleware
 * ----------------------
 * 
 * Protects API endpoints from abuse by limiting request rates per IP address.
 * 
 * Features:
 * - Configurable time window and max requests (via environment variables)
 * - Standard rate limit headers (RateLimit-*)
 * - Skip localhost in development for easier testing
 * - Security event logging for rate limit violations
 * - Detailed logging of potential abuse attempts
 * 
 * Configuration:
 * - Window: RATE_LIMIT_WINDOW_MINUTES (default: 15 minutes)
 * - Max Requests: RATE_LIMIT_MAX_REQUESTS (default: 100)
 * 
 * Response when limit exceeded:
 * - HTTP 429 (Too Many Requests)
 * - Retry-After header with wait time
 * - JSON error message with retry time
 * 
 * Applied to: All /api/* routes
 */
export const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
    retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    if (config.isDevelopment) {
      const ip = req.ip || req.connection.remoteAddress;
      const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
      
      if (isLocalhost) {
        logger.debug('🔑 Rate limiter skipped for localhost', {
          ip,
          url: req.originalUrl,
          method: req.method
        });
      }
      
      return isLocalhost;
    }
    return false;
  },
  handler: (req: Request, res: Response) => {
    // Log rate limit threshold reached
    logger.warn('⚠️ Rate limit threshold reached', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      threshold: config.security.rateLimitMaxRequests,
      window: `${config.security.rateLimitWindowMs}ms`
    });
    
    // Log warning for rate limit exceeded
    logger.warn('⚠️ Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      type: 'RATE_LIMIT_EXCEEDED'
    });
    
    // Log security event - potential abuse
    logSecurity('RATE_LIMIT_EXCEEDED', 'medium', {
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      maxRequests: config.security.rateLimitMaxRequests,
      windowMs: config.security.rateLimitWindowMs
    }, req.ip);
    
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000),
    });
  }
});
