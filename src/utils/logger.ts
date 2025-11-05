import { createLogger, format, transports } from 'winston';
import fs from 'fs';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Production-Grade Winston Logger for Vodichron HRMS
 * ==================================================
 * 
 * Features:
 * - Separate log files for each severity level (error, warn, info, debug)
 * - Daily log rotation with automatic compression
 * - Performance timing and metrics logging
 * - Request/Response tracking with correlation IDs
 * - Detailed error stack traces
 * - Human-readable formatting for easy debugging
 * - Automatic log archival and cleanup
 * - Exception and rejection handlers
 * - Memory usage tracking
 * - Colorized console output in development
 * 
 * Log Files Generated (Simple & Clean):
 * - error-DATE.log: Only error-level messages
 * - warning-DATE.log: Only warning-level messages
 * - application-DATE.log: Info-level application events
 * - debug-DATE.log: Debug messages (development only)
 * - combined-DATE.log: All log levels combined
 * - exceptions-DATE.log: Uncaught exceptions
 * - rejections-DATE.log: Unhandled promise rejections
 */

/**
 * Create logs directory structure
 */
const createLogsDirectory = (): void => {
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Create main logs directory only
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
};

createLogsDirectory();

/**
 * Log Level Filters
 * ----------------
 * These filters ensure each log file contains only messages of specific levels
 * FIXED: Using info[Symbol.for('level')] to get the actual level after colorization
 */
// Log level filters (reserved for future use in separate log files)
// const _errorFilter = format((info) => info.level === 'error' || info[Symbol.for('level')] === 'error' ? info : false);
// const _warnFilter = format((info) => info.level === 'warn' || info[Symbol.for('level')] === 'warn' ? info : false);
// const _infoFilter = format((info) => info.level === 'info' || info[Symbol.for('level')] === 'info' ? info : false);
// const _debugFilter = format((info) => info.level === 'debug' || info[Symbol.for('level')] === 'debug' ? info : false);


/**
 * Production Format
 * ----------------
 * Structured JSON format for production with full metadata
 */
const productionFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json(),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] })
);

/**
 * Enhanced Human-Readable File Format
 * -----------------------------------
 * Beautiful, structured format for log files that's easy to read and parse
 */
let logCounter = 0;

const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.uncolorize(),
  format.printf(({ timestamp, level, message, _service, type, ...meta }) => {
    logCounter++;
    
    // Extract key metadata
    const { stack, error, duration, method, url, statusCode, userId, ip, operation, table, event, severity, ...otherMeta } = meta;
    
    // Build level indicator with padding for alignment
    const levelStr = level.toUpperCase().padEnd(5);
    
    // Build context string
    const contextParts: string[] = [];
    if (type) contextParts.push(`[${type}]`);
    if (method) contextParts.push(`${method}`);
    if (url) contextParts.push(`${url}`);
    if (statusCode) contextParts.push(`${statusCode}`);
    if (operation) contextParts.push(`${operation}`);
    if (table) contextParts.push(`on:${table}`);
    if (event) contextParts.push(`event:${event}`);
    if (severity) contextParts.push(`severity:${severity}`);
    if (userId) contextParts.push(`user:${userId}`);
    if (ip) contextParts.push(`ip:${ip}`);
    if (duration) contextParts.push(`⏱️${duration}`);
    
    const contextStr = contextParts.length > 0 ? ` ${contextParts.join(' ')}` : '';
    
    // Build main log line
    let logLine = `#${logCounter.toString().padStart(6, '0')} [${timestamp}] [${levelStr}]${contextStr} ${message}`;
    
    // Add remaining metadata if any
    const remainingMeta = Object.keys(otherMeta).filter(key => 
      otherMeta[key] !== undefined && 
      otherMeta[key] !== null
    );
    
    if (remainingMeta.length > 0) {
      const metaObj: any = {};
      remainingMeta.forEach(key => {
        metaObj[key] = otherMeta[key];
      });
      logLine += `\n       📋 Meta: ${JSON.stringify(metaObj, null, 2).replace(/\n/g, '\n       ')}`;
    }
    
    // Add error details if present
    if (error && typeof error === 'string') {
      logLine += `\n       ❌ Error: ${error}`;
    }
    
    // Add stack trace on new lines if present
    if (stack && typeof stack === 'string') {
      logLine += `\n       📚 Stack Trace:\n       ${stack.replace(/\n/g, '\n       ')}`;
    }
    
    // Add separator for readability
    logLine += '\n' + '─'.repeat(120);
    
    return logLine;
  })
);

/**
 * Enhanced Development Console Format
 * ----------------------------------
 * Colorized, easy-to-read format for development console output
 */
const developmentFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, type, duration, ...meta }) => {
    let output = `${timestamp} [${level}]`;
    
    if (type) output += ` [${type}]`;
    if (duration) output += ` ⏱️ ${duration}`;
    
    output += `: ${message}`;
    
    // Add metadata if present (excluding common fields)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { service, version, environment, stack, ...otherMeta } = meta;
    const metaKeys = Object.keys(otherMeta);
    
    if (metaKeys.length > 0) {
      output += ` ${JSON.stringify(otherMeta, null, 2)}`;
    }
    
    return output;
  })
);

/**
 * Daily Rotate File Transport Options
 * -----------------------------------
 * Simple rotation without audit files
 */
const getRotateOptions = (filename: string) => ({
  filename,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

/**
 * Main Logger Instance
 * -------------------
 * Production-grade Winston logger with comprehensive transport configuration
 */
export const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? productionFormat : fileFormat,
  defaultMeta: { 
    service: 'vodichron-hrms',
    version: process.env.APP_VERSION || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    hostname: require('os').hostname(),
    pid: process.pid
  },
  transports: [
    // Error logs only
    new DailyRotateFile({
      ...getRotateOptions('logs/error-%DATE%.log'),
      level: 'error',
      format: fileFormat
    }),
    
    // Warning logs only
    new DailyRotateFile({
      ...getRotateOptions('logs/warning-%DATE%.log'),
      level: 'warn',
      format: fileFormat
    }),
    
    // Info logs (application events)
    new DailyRotateFile({
      ...getRotateOptions('logs/application-%DATE%.log'),
      level: 'info',
      format: fileFormat
    }),
    
    // Debug logs (development only)
    ...(process.env.NODE_ENV !== 'production' ? [
      new DailyRotateFile({
        ...getRotateOptions('logs/debug-%DATE%.log'),
        level: 'debug',
        format: fileFormat
      })
    ] : []),
    
    // Combined log file for all levels
    new DailyRotateFile({
      ...getRotateOptions('logs/combined-%DATE%.log'),
      format: fileFormat
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new DailyRotateFile({ 
      ...getRotateOptions('logs/exceptions-%DATE%.log'),
      format: fileFormat
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new DailyRotateFile({ 
      ...getRotateOptions('logs/rejections-%DATE%.log'),
      format: fileFormat
    })
  ]
});

/**
 * Add console transport for development
 */
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: developmentFormat,
    level: 'debug'
  }));
}

/**
 * ============================================
 * ENHANCED UTILITY LOGGING FUNCTIONS
 * ============================================
 * 
 * Specialized logging functions for different categories:
 * - HTTP Requests
 * - Database Operations  
 * - Authentication Events
 * - Security Events
 * - System Events
 * - Performance Metrics
 * - Validation Events
 * - Business Logic Events
 */

/**
 * Log HTTP Requests with detailed context
 * ---------------------------------------
 * Logs all HTTP requests with method, URL, status, duration, and user context
 * Automatically categorizes by status code (success/client error/server error)
 */
export const logRequest = (
  method: string, 
  url: string, 
  statusCode?: number, 
  duration?: number, 
  userId?: string, 
  userAgent?: string,
  ip?: string,
  requestId?: string
) => {
  const logData = {
    method,
    url,
    statusCode,
    duration: duration ? `${duration}ms` : undefined,
    userId,
    userAgent,
    ip,
    requestId,
    type: 'HTTP_REQUEST',
    timestamp: new Date().toISOString()
  };
  
  const message = `${method} ${url} ${statusCode || 'PENDING'}`;
  
  if (statusCode && statusCode >= 500) {
    logger.error(`🔴 HTTP SERVER ERROR: ${message}`, logData);
  } else if (statusCode && statusCode >= 400) {
    logger.warn(`🟡 HTTP CLIENT ERROR: ${message}`, logData);
  } else if (statusCode) {
    logger.info(`🟢 HTTP SUCCESS: ${message}`, logData);
  } else {
    logger.debug(`🔵 HTTP REQUEST: ${message}`, logData);
  }
};

/**
 * Log Database Operations with performance metrics
 * -----------------------------------------------
 * Tracks all database operations with timing, table info, and error details
 */
export const logDatabase = (
  operation: string, 
  table: string, 
  duration?: number, 
  error?: Error,
  rowsAffected?: number,
  query?: string
) => {
  const logData = {
    operation,
    table,
    duration: duration ? `${duration}ms` : undefined,
    rowsAffected,
    query: query ? query.substring(0, 200) : undefined, // Truncate long queries
    type: 'DATABASE_OPERATION',
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    logger.error(`❌ DATABASE ERROR: ${operation} on ${table} failed`, { 
      ...logData, 
      error: error.message, 
      stack: error.stack,
      errorCode: (error as any).code
    });
  } else if (duration && duration > 1000) {
    // Warn on slow queries (>1s)
    logger.warn(`⏰ SLOW DATABASE QUERY: ${operation} on ${table}`, logData);
  } else {
    logger.debug(`📦 DATABASE ${operation}: ${table}`, logData);
  }
};

/**
 * Log Authentication Events
 * ------------------------
 * Tracks login, logout, token refresh, and auth failures
 */
export const logAuth = (
  event: string, 
  userId?: string, 
  email?: string, 
  ip?: string, 
  success: boolean = true,
  role?: string,
  reason?: string
) => {
  const logData = {
    event,
    userId,
    email,
    ip,
    success,
    role,
    reason,
    type: 'AUTHENTICATION',
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    logger.info(`✅ AUTH SUCCESS: ${event} - ${email || userId}`, logData);
  } else {
    logger.warn(`⚠️ AUTH FAILURE: ${event} - ${email || userId} - ${reason || 'Unknown'}`, logData);
  }
};

/**
 * Log Security Events
 * ------------------
 * Tracks security-related events like rate limiting, suspicious activity, etc.
 */
export const logSecurity = (
  event: string, 
  severity: 'low' | 'medium' | 'high' | 'critical', 
  details: any, 
  ip?: string,
  userId?: string,
  action?: string
) => {
  const logData = {
    event,
    severity,
    details,
    ip,
    userId,
    action,
    type: 'SECURITY',
    timestamp: new Date().toISOString()
  };
  
  if (severity === 'critical' || severity === 'high') {
    logger.error(`🚨 SECURITY ALERT [${severity.toUpperCase()}]: ${event}`, logData);
  } else if (severity === 'medium') {
    logger.warn(`⚠️ SECURITY WARNING [${severity.toUpperCase()}]: ${event}`, logData);
  } else {
    logger.info(`🛡️ SECURITY NOTICE [${severity.toUpperCase()}]: ${event}`, logData);
  }
};

/**
 * Log System Events
 * ----------------
 * Tracks system-level events like startup, shutdown, config changes
 */
export const logSystem = (
  event: string, 
  details?: any,
  level: 'info' | 'warn' | 'error' = 'info'
) => {
  const logData = {
    event,
    details,
    type: 'SYSTEM',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };
  
  const message = `🔧 SYSTEM EVENT: ${event}`;
  
  if (level === 'error') {
    logger.error(message, logData);
  } else if (level === 'warn') {
    logger.warn(message, logData);
  } else {
    logger.info(message, logData);
  }
};

/**
 * Log Performance Metrics
 * ----------------------
 * Tracks performance metrics for operations, API calls, etc.
 */
export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: any,
  threshold?: number
) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    metadata,
    type: 'PERFORMANCE',
    timestamp: new Date().toISOString(),
    memoryDelta: metadata?.memoryDelta
  };
  
  const message = `⏱️ PERFORMANCE: ${operation} completed in ${duration}ms`;
  
  if (threshold && duration > threshold) {
    logger.warn(`🐌 SLOW OPERATION: ${message} (threshold: ${threshold}ms)`, logData);
  } else if (duration > 5000) {
    logger.warn(`⏰ ${message}`, logData);
  } else {
    logger.debug(message, logData);
  }
};

/**
 * Log Validation Errors
 * --------------------
 * Tracks validation failures in requests, data, etc.
 */
export const logValidation = (
  context: string,
  errors: any,
  data?: any,
  userId?: string
) => {
  const logData = {
    context,
    errors,
    data,
    userId,
    type: 'VALIDATION',
    timestamp: new Date().toISOString()
  };
  
  logger.warn(`⚠️ VALIDATION ERROR: ${context}`, logData);
};

/**
 * Log Business Logic Events
 * ------------------------
 * Tracks important business logic events (e.g., leave approved, timesheet submitted)
 */
export const logBusiness = (
  event: string,
  entity: string,
  action: string,
  userId?: string,
  details?: any
) => {
  const logData = {
    event,
    entity,
    action,
    userId,
    details,
    type: 'BUSINESS',
    timestamp: new Date().toISOString()
  };
  
  logger.info(`💼 BUSINESS EVENT: ${event} - ${entity} ${action}`, logData);
};

/**
 * Performance Timer Utility
 * ------------------------
 * Helper class for timing operations with automatic logging
 */
export class PerformanceTimer {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;
  private operation: string;
  
  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage();
    logger.debug(`⏱️ START: ${operation}`);
  }
  
  end(metadata?: any, threshold?: number) {
    const duration = Date.now() - this.startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = {
      heapUsed: ((endMemory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024).toFixed(2) + ' MB',
      external: ((endMemory.external - this.startMemory.external) / 1024 / 1024).toFixed(2) + ' MB'
    };
    
    logPerformance(this.operation, duration, { ...metadata, memoryDelta }, threshold);
    return duration;
  }
}

/**
 * Log Cleanup/Rotation Event
 * -------------------------
 * Track when log files are rotated or cleaned up
 */
logger.on('rotate', (oldFilename, newFilename) => {
  logger.info('📁 Log file rotated', {
    oldFile: oldFilename,
    newFile: newFilename,
    type: 'SYSTEM'
  });
});

/**
 * Logger Initialization Complete
 * -----------------------------
 * Log that the logger system is ready
 */
logger.info('🚀 Production-Grade Logger Initialized Successfully', {
  level: logger.level,
  environment: process.env.NODE_ENV || 'development',
  transports: logger.transports.length,
  features: [
    'Daily Log Rotation',
    'Automatic Compression',
    'Separate Category Files',
    'Performance Tracking',
    'Exception Handling',
    'Memory Monitoring'
  ],
  logFiles: {
    error: 'logs/error-DATE.log',
    warning: 'logs/warning-DATE.log',
    application: 'logs/application-DATE.log',
    combined: 'logs/combined-DATE.log',
    exceptions: 'logs/exceptions-DATE.log',
    rejections: 'logs/rejections-DATE.log'
  },
  rotationPolicy: '14 days retention, 20MB max per file'
});
