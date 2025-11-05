import { Request, Response, Router } from 'express';
import { config } from '../config';
import { testConnection, getDatabaseInfo } from '../database';
import { logger, logRequest, logSecurity, PerformanceTimer } from '../utils/logger';

/**
 * Health & Documentation Routes
 * ============================
 * 
 * Purpose:
 * Provides system health monitoring and API documentation endpoints.
 * Essential for production monitoring, load balancer checks, and developer onboarding.
 * 
 * Endpoints:
 * - GET /health - Comprehensive health check with database, memory, and uptime info
 * - GET / - API root with documentation links and feature list
 * 
 * Health Check Features:
 * - Database connectivity verification
 * - Memory usage statistics (heap, RSS, external)
 * - Server uptime (formatted and raw seconds)
 * - System information (platform, Node version, PID)
 * - Security logging for unhealthy states
 * - Response time tracking
 * 
 * Status Codes:
 * - 200: Healthy (all systems operational)
 * - 503: Unhealthy/Degraded (database issues or errors)
 * 
 * Used By:
 * - Load balancers for health checks
 * - Monitoring tools (Prometheus, DataDog, etc.)
 * - DevOps dashboards
 * - Automated alerting systems
 */

const router = Router();

/**
 * Format uptime in human-readable format
 */
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};

/**
 * Health Check Endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  const timer = new PerformanceTimer('healthCheck');
  const startTime = Date.now();
  
  try {
    logger.info('💚 Health check requested', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Test database connection
    const dbHealthy = await testConnection();
    const dbInfo = getDatabaseInfo();
    
    // Log database health status
    if (!dbHealthy) {
      logSecurity('DATABASE_UNHEALTHY', 'medium', {
        database: dbInfo.database,
        host: dbInfo.host
      }, req.ip);
    }
    
    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = process.uptime();
    
    const healthData = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: formatUptime(uptimeSeconds)
      },
      environment: config.server.env,
      server: {
        host: config.server.host,
        port: config.server.port
      },
      database: {
        status: dbHealthy ? 'connected' : 'disconnected',
        host: dbInfo.host,
        port: dbInfo.port,
        database: dbInfo.database,
        type: 'MySQL'
      },
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      }
    };
    
    const duration = Date.now() - startTime;
    
    // Log request with full context
    logRequest('GET', '/health', 200, duration, undefined, req.get('user-agent'), req.ip);
    
    // Log performance
    timer.end({ status: 'healthy', dbStatus: dbHealthy ? 'connected' : 'disconnected' });
    
    logger.info('✅ Health check completed successfully', {
      status: 'healthy',
      duration: `${duration}ms`,
      dbStatus: dbHealthy ? 'connected' : 'disconnected'
    });
    
    res.status(200).json(healthData);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    logger.error('❌ Health check failed', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      duration: `${duration}ms`
    });
    
    logSecurity('HEALTH_CHECK_FAILURE', 'high', {
      error: error.message,
      duration: `${duration}ms`
    }, req.ip);
    
    logRequest('GET', '/health', 503, duration, undefined, req.get('user-agent'), req.ip);
    
    // Log performance even on failure
    timer.end({ status: 'unhealthy', error: error.message });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      },
      environment: config.server.env
    });
  }
});

/**
 * Root API Documentation Endpoint
 */
router.get('/', (req: Request, res: Response) => {
  const timer = new PerformanceTimer('apiDocumentation');
  
  logger.info('📚 API Documentation requested', {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  res.status(200).json({
    name: 'Vodichron HRMS Backend',
    version: '1.0.0',
    description: 'Production-ready HRMS Backend System',
    environment: config.server.env,
    timestamp: new Date().toISOString(),
    documentation: {
      health: `${req.protocol}://${req.get('host')}/health`,
      api: `${req.protocol}://${req.get('host')}${config.api.prefix}`,
    },
    features: [
      'JWT Authentication',
      'Rate limiting',
      'Comprehensive logging',
      'Security headers',
      'CORS configuration',
      'Request validation',
    ],
  });
  
  const duration = timer.end();
  logRequest('GET', '/', 200, duration, undefined, req.get('user-agent'), req.ip);
  
  logger.debug('✅ API Documentation served', {
    duration: `${duration}ms`
  });
});

export default router;
