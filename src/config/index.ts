import dotenv from 'dotenv';
import { logger, logSecurity, logValidation } from '../utils/logger';
import { getEnvVariable, getEnvNumber, getEnvBoolean, getEnvArray } from '../helpers/env.helper';
import { AppConfig, NodeEnv } from '../types/config.types';

/**
 * Application Configuration Module
 * --------------------------------
 * 
 * This module is responsible for:
 * - Loading environment variables from .env file
 * - Validating all required configuration values
 * - Providing type-safe configuration object
 * - Applying defaults where appropriate
 * - Environment-specific configuration
 * 
 * Configuration Categories:
 * - Server settings (port, host, environment)
 * - Security settings (secrets, rate limiting, helmet)
 * - CORS configuration
 * - Logging preferences
 * - API settings
 * - Database connection
 */

// Load environment variables from .env file
dotenv.config();

/**
 * Environment Validation
 * ---------------------
 * Validate NODE_ENV is one of the allowed values
 * Valid values: development, production, test, staging
 */
const nodeEnv = getEnvVariable('NODE_ENV', false, 'development') as NodeEnv;
if (!['development', 'production', 'test', 'staging'].includes(nodeEnv)) {
  logger.error(`❌ Invalid NODE_ENV: ${nodeEnv}. Must be one of: development, production, test, staging`);
  logValidation('NODE_ENV', {
    value: nodeEnv,
    allowed: ['development', 'production', 'test', 'staging'],
    error: 'Invalid environment'
  });
  process.exit(1);
}

logger.info(`👨‍💻 Environment: ${nodeEnv}`, {
  nodeEnv,
  processEnv: Object.keys(process.env).length
});

/**
 * Application Configuration Object
 * --------------------------------
 * Centralized configuration object with all application settings
 * All values are validated and type-safe
 */
export const config: AppConfig = {
  // Server Configuration
  // -------------------
  // HTTP server settings for Express application
  server: {
    port: getEnvNumber('PORT', 5000, 1024, 65535),        // Server port (default: 5000)
    host: getEnvVariable('HOST', false, 'localhost'),      // Server host (default: localhost)
    env: nodeEnv,                                          // Current environment
  },
  
  // Environment flags for easy checking
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',

  // Security Configuration
  // ---------------------
  // Security-related settings including secrets, rate limiting, and protection
  security: {
    sessionSecret: getEnvVariable('SESSION_SECRET', false, 'dev-secret-change-in-production'),  // Secret for session signing
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MINUTES', 15, 1, 60) * 60 * 1000,        // Rate limit window in milliseconds
    rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100, 10, 100000),             // Max requests per window
    maxRequestSize: getEnvVariable('MAX_REQUEST_SIZE', false, '10mb'),                          // Max request body size
    enableHelmet: getEnvBoolean('ENABLE_HELMET', true),                                         // Enable Helmet security headers
    trustedProxies: getEnvArray('TRUSTED_PROXIES', []),                                         // Trusted proxy IPs
  },

  // CORS Configuration
  // -----------------
  // Cross-Origin Resource Sharing settings for API access control
  cors: {
    origin: getEnvArray('CORS_ORIGIN', ['http://localhost:3000']),                               // Allowed origins
    credentials: true,                                                                            // Allow credentials (cookies, auth headers)
    methods: getEnvArray('CORS_METHODS', ['GET','POST','PUT','DELETE','PATCH','OPTIONS']),       // Allowed HTTP methods
    allowedHeaders: getEnvArray('CORS_ALLOWED_HEADERS', ['Origin','X-Requested-With','Content-Type','Accept','Authorization']),  // Allowed request headers
    exposedHeaders: getEnvArray('CORS_EXPOSED_HEADERS', ['X-Total-Count']),                      // Headers accessible to frontend
    maxAge: getEnvNumber('CORS_MAX_AGE', 86400, 0, 86400),                                       // Preflight cache duration (24 hours)
  },

  // Logging Configuration
  // --------------------
  // Application logging preferences and levels
  logging: {
    level: getEnvVariable('LOG_LEVEL', false, nodeEnv === 'production' ? 'info' : 'debug'),  // Log level (debug/info/warn/error)
    enableRequestLogging: getEnvBoolean('LOG_ENABLE_REQUESTS', true),                        // Enable HTTP request logging
    format: getEnvVariable('LOG_FORMAT', false, 'combined'),                                 // Morgan log format
  },

  // API Configuration
  // ----------------
  // API versioning and path configuration
  api: {
    prefix: getEnvVariable('API_PREFIX', false, '/api'),     // API route prefix
    version: getEnvVariable('API_VERSION', false, 'v1'),     // API version
  },

  // JWT Configuration
  // -----------------
  // JSON Web Token settings for authentication
  jwt: {
    accessTokenExpiresIn: getEnvVariable('JWT_ACCESS_TOKEN_EXPIRES_IN', false, '30m'),        // Access token expiry (e.g., '30m', '1h')
    refreshTokenMaxAgeMs: getEnvNumber('JWT_REFRESH_TOKEN_MAX_AGE_MS', 7 * 24 * 60 * 60 * 1000, 60000, 30 * 24 * 60 * 60 * 1000),  // Refresh token max age in milliseconds (default: 7 days)
  },

  // Database Configuration
  // ---------------------
  // MySQL database connection settings with connection pooling
  db: {
    host: getEnvVariable('DB_HOST'),                                          // Database host (required)
    port: getEnvNumber('DB_PORT', 3306, 1, 65535),                           // Database port (default: 3306)
    database: getEnvVariable('DB_NAME'),                                      // Database name (required)
    username: getEnvVariable('DB_USER'),                                      // Database username (required)
    password: getEnvVariable('DB_PASSWORD'),                                  // Database password (required)
    logging: getEnvBoolean('SQL_LOGGING', false),                             // Enable SQL query logging
    timezone: getEnvVariable('DB_TIMEZONE', false, '+05:30'),                // Database timezone (IST default)
    // Connection Pool Settings
    pool: {
      max: getEnvNumber('DB_POOL_MAX', 10, 1, 100),                          // Maximum connections in pool
      min: getEnvNumber('DB_POOL_MIN', 0, 0, 10),                            // Minimum connections in pool
      acquire: getEnvNumber('DB_POOL_ACQUIRE', 30000, 1000, 60000),         // Max time (ms) to get connection
      idle: getEnvNumber('DB_POOL_IDLE', 10000, 1000, 60000),               // Max idle time (ms) before release
    },
  },

  // Email Configuration
  // ------------------
  // SMTP email service settings for sending notifications
  email: {
    host: getEnvVariable('EMAIL_HOST', false, 'smtp.gmail.com'),                          // SMTP host (default: Gmail)
    port: getEnvNumber('EMAIL_PORT', 587, 1, 65535),                                      // SMTP port (default: 587 for TLS)
    secure: getEnvBoolean('EMAIL_SECURE', false),                                         // Use SSL/TLS (false = use STARTTLS)
    auth: {
      user: getEnvVariable('EMAIL_USER', false, ''),                                      // SMTP username/email
      pass: getEnvVariable('EMAIL_PASSWORD', false, ''),                                  // SMTP password/app password
    },
    from: {
      name: getEnvVariable('EMAIL_FROM_NAME', false, 'Vodichron HRMS'),                  // Sender name
      address: getEnvVariable('EMAIL_FROM_ADDRESS', false, 'noreply@vodichron.com'),     // Sender email address
    },
  },

  // Frontend URL
  // ------------
  // Frontend application URL (for password reset emails, etc.)
  frontendUrl: getEnvVariable('FRONTEND_URL', false, 'http://localhost:3000'),           // Frontend URL (default: localhost:3000)
};

/**
 * Configuration Validation
 * -----------------------
 * Validates critical configuration values before application starts
 * 
 * Checks:
 * - Production environment has secure session secret
 * - Required database credentials are present
 * - Configuration values are within acceptable ranges
 * 
 * @throws Process exits with code 1 if validation fails
 */
function validateConfiguration() {
  logger.debug('🔍 Starting configuration validation...');
  
  const validationErrors: string[] = [];
  
  // Validate production security settings
  if (config.isProduction && config.security.sessionSecret === 'dev-secret-change-in-production') {
    const error = 'SESSION_SECRET must be set securely in production environment';
    logger.error(`❌ ${error}`);
    logger.info('💡 Set SESSION_SECRET environment variable to a strong random string');
    validationErrors.push(error);
    
    logSecurity('INSECURE_SESSION_SECRET', 'critical', {
      environment: 'production',
      message: 'Using default session secret in production'
    });
  }
  
  // Validate required database configuration
  if (!config.db.host || !config.db.database || !config.db.username) {
    const error = 'Database configuration incomplete';
    logger.error(`❌ ${error}`);
    logger.error('Required environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
    validationErrors.push(error);
    
    logValidation('database_config', {
      missingFields: [
        !config.db.host && 'DB_HOST',
        !config.db.database && 'DB_NAME',
        !config.db.username && 'DB_USER'
      ].filter(Boolean)
    });
  }
  
  // Validate CORS origins in production
  if (config.isProduction && config.cors.origin.includes('http://localhost:3000')) {
    logger.warn('⚠️ CORS origin includes localhost in production environment', {
      origins: config.cors.origin
    });
    logSecurity('INSECURE_CORS_CONFIG', 'medium', {
      message: 'Localhost in CORS origins in production'
    });
  }
  
  // Validate rate limiting is enabled
  if (config.security.rateLimitMaxRequests > 1000) {
    logger.warn('⚠️ Rate limit is very high', {
      limit: config.security.rateLimitMaxRequests,
      recommended: '100-500'
    });
  }
  
  // Exit if there are validation errors
  if (validationErrors.length > 0) {
    logger.error(`❌ Configuration validation failed with ${validationErrors.length} error(s)`);
    process.exit(1);
  }
  
  // Log successful validation
  logger.info('✅ Configuration validated successfully', {
    environment: nodeEnv,
    port: config.server.port,
    host: config.server.host,
    database: `${config.db.host}:${config.db.port}/${config.db.database}`,
    security: {
      helmet: config.security.enableHelmet,
      rateLimit: `${config.security.rateLimitMaxRequests} requests per ${config.security.rateLimitWindowMs / 60000} minutes`
    }
  });
}

validateConfiguration();

export default config;
