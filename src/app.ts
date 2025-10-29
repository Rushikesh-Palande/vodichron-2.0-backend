import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { config } from './config';
import { logger } from './utils/logger';
import { logRequestMiddleware } from './utils/log-request';
import { rateLimiter } from './middleware/rate-limiter.middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import routes from './routes';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc';
import { createContext } from './trpc/trpc';

/**
 * Vodichron HRMS Express Application
 * ----------------------------------
 * 
 * This module configures and exports the Express application with:
 * - Production-ready security middleware (Helmet, CORS)
 * - Request logging and monitoring
 * - Rate limiting for API protection
 * - Compression for better performance
 * - Global error handling
 * - Health check endpoints
 * - Modular route organization
 */

// Initialize Express application
const app: Application = express();

/**
 * Trust Proxy Configuration
 * -------------------------
 * Configure Express to trust proxies for accurate client IP detection
 * Important for rate limiting and security logging
 */
if (config.security.trustedProxies.length > 0) {
  app.set('trust proxy', config.security.trustedProxies);
} else if (config.isDevelopment) {
  app.set('trust proxy', 'loopback');
} else {
  app.set('trust proxy', false);
}

/**
 * Security Middleware Setup
 * -------------------------
 * Essential security headers and protection middleware
 */

// Helmet - Security headers
if (config.security.enableHelmet) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
}

/**
 * Rate Limiting
 * ------------
 * Apply rate limiting to API routes
 */
app.use('/api/', rateLimiter);

/**
 * Body Parsing Middleware
 * -----------------------
 * Parse incoming requests with size limits for security
 */
app.use(express.json({ 
  limit: config.security.maxRequestSize,
  type: ['application/json', 'text/plain']
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: config.security.maxRequestSize,
  parameterLimit: 100
}));

// Cookie parser
app.use(cookieParser(config.security.sessionSecret));

// Compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowedOrigins = Array.isArray(config.cors.origin) ? config.cors.origin : [config.cors.origin];
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked: ${origin}`, { origin, type: 'CORS_BLOCKED' });
    return callback(new Error('CORS policy does not allow this origin'), false);
  },
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  exposedHeaders: config.cors.exposedHeaders,
  maxAge: config.cors.maxAge,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Request logging
if (config.logging.enableRequestLogging) {
  app.use(logRequestMiddleware);
}

// Morgan logger
app.use(morgan(config.logging.format, {
  stream: { 
    write: (message: string) => {
      logger.info(`${message.trim()}`, { type: 'HTTP_ACCESS' });
    } 
  },
  skip: (req) => req.originalUrl === '/health'
}));

/**
 * Mount Routes
 * ----------
 * Mount all application routes
 */
// tRPC API (mounted under /trpc)
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));
logger.info('📡 tRPC mounted at /trpc');

app.use('/', routes);

/**
 * 404 Handler
 * -----------
 * Handle requests to non-existent endpoints
 */
app.use(notFoundHandler);

/**
 * Global Error Handler
 * -------------------
 * Comprehensive error handling middleware that catches all errors
 * and provides consistent error responses
 */
app.use(errorHandler);

/**
 * Log Application Initialization
 * ------------------------------
 */
logger.info('🚀 Express application initialized successfully', {
  features: {
    security: config.security.enableHelmet,
    rateLimit: true,
    compression: true,
    cors: true,
    logging: config.logging.enableRequestLogging
  },
  environment: config.server.env
});

// Export the configured Express application
export default app;
