import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { logger, logSystem } from './utils/logger';
import { connectDatabase, syncDatabase, closeDatabase } from './database';
import { performDatabaseHealthCheck } from './utils/db-health-check';
import { runAllSeeds } from './seeds/master-seed-runner';
import { startAllCronJobs, stopAllCronJobs } from './cron-jobs/master-cron-runner';

/**
 * Vodichron HRMS Backend Server Entry Point
 * -----------------------------------------
 * 
 * This is the main server file that orchestrates the application startup process:
 * 
 * 1. HTTP server startup with comprehensive error handling
 * 2. Graceful shutdown handling
 * 3. Process-level error handling
 * 
 * Includes production-ready features like graceful shutdown, error handling,
 * and comprehensive logging.
 */

/**
 * Server Instance and Configuration
 * ---------------------------------
 */
let httpServer: ReturnType<typeof createServer>;
let isShuttingDown = false;

/**
 * Graceful Shutdown Handler
 * -------------------------
 * Handles process termination signals gracefully to ensure:
 * - Active requests are completed
 * - Resources are freed up properly
 * 
 * @param signal - The termination signal received
 * @param server - The HTTP server instance
 */
const gracefulShutdown = async (signal: string, server: any) => {
  if (isShuttingDown) {
    logger.warn(`⚠️ Shutdown already in progress, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  logSystem('GRACEFUL_SHUTDOWN_START', { signal });
  logger.info(`📡 Received ${signal}. Starting graceful shutdown...`);
  
  // Set a maximum shutdown timeout
  const shutdownTimeout = setTimeout(() => {
    logger.error('❌ Graceful shutdown timeout reached, forcing exit');
    process.exit(1);
  }, 15000); // 15 seconds timeout

  try {
    // Stop cron jobs first
    logger.info('⏰ Stopping cron jobs...');
    stopAllCronJobs();
    
    // Stop accepting new connections
    logger.info('🔒 Stopping server from accepting new connections...');
    server.close(async (error: any) => {
      if (error) {
        logger.error(`❌ Error closing HTTP server: ${error.message}`);
      } else {
        logger.info('✅ HTTP server closed successfully');
      }

      try {
        // Complete shutdown
        clearTimeout(shutdownTimeout);
        logSystem('GRACEFUL_SHUTDOWN_COMPLETE', { 
          signal, 
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        });
        logger.info('✅ Graceful shutdown completed successfully');
        process.exit(0);

      } catch (shutdownError: any) {
        clearTimeout(shutdownTimeout);
        logger.error(`❌ Error during shutdown: ${shutdownError.message}`, shutdownError);
        process.exit(1);
      }
    });

  } catch (error: any) {
    clearTimeout(shutdownTimeout);
    logger.error(`❌ Error initiating graceful shutdown: ${error.message}`, error);
    process.exit(1);
  }
};

/**
 * Main Server Startup Function
 * ----------------------------
 * Orchestrates the complete server startup process with comprehensive
 * error handling and logging.
 */
const startServer = async (): Promise<void> => {
  const startTime = Date.now();
  
  try {
    // Log startup initiation
    logSystem('SERVER_STARTUP_BEGIN', {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      environment: config.server.env,
      pid: process.pid
    });
    
    logger.info('🚀 Starting Vodichron HRMS Backend Server...');
    logger.info(`📊 Environment: ${config.server.env}`);
    logger.info(`🏠 Host: ${config.server.host}:${config.server.port}`);

    // Step 1: Connect to the database
    logger.info('🔌 Establishing database connection...');
    await connectDatabase();

    // Step 2: Import models to register them with Sequelize
    logger.info('📦 Importing and registering models...');
    await import('./models/index');

    // Step 3: Synchronize database schema
    logger.info('🔄 Synchronizing database schema...');
    await syncDatabase();

    // Step 4: Perform database health check
    await performDatabaseHealthCheck();

    // Step 5: Run database seeds
    logger.info('🌱 Running database seeds...');
    await runAllSeeds();
    logger.info('✅ Database seeding completed');

    // Step 6: Start cron jobs (automated tasks)
    logger.info('⏰ Starting cron jobs...');
    await startAllCronJobs();
    logger.info('✅ Cron jobs started successfully');

    // Step 7: Create HTTP server
    logger.info('🌐 Creating HTTP server...');
    httpServer = createServer(app);

    // Step 7: Start listening for connections
    logger.info(`🚀 Starting server on ${config.server.host}:${config.server.port}...`);
    
    httpServer.listen(config.server.port, "0.0.0.0", () => {
      const startupDuration = Date.now() - startTime;
      
      logSystem('SERVER_STARTUP_COMPLETE', {
        host: config.server.host,
        port: config.server.port,
        environment: config.server.env,
        startupTime: `${startupDuration}ms`,
        features: {
          security: config.security.enableHelmet,
          rateLimit: true,
          logging: config.logging.enableRequestLogging
        }
      });

      // Success logging
      logger.info('🎉 Vodichron HRMS Backend Server started successfully!');
      logger.info(`🌍 Server running on http://${config.server.host}:${config.server.port}`);
      logger.info(`⚡ Startup completed in ${startupDuration}ms`);
      logger.info(`🕒 Started at: ${new Date().toISOString()}`);
      
      // API endpoints information
      logger.info('📡 Available endpoints:');
      logger.info(`   - Health Check: http://${config.server.host}:${config.server.port}/health`);
      logger.info(`   - API Documentation: http://${config.server.host}:${config.server.port}/`);
      logger.info(`   - API Base: http://${config.server.host}:${config.server.port}${config.api.prefix}`);

      // Development mode specific logs
      if (config.isDevelopment) {
        logger.info('🔧 Development mode features:');
        logger.info('   - Hot reload enabled (ts-node-dev)');
        logger.info('   - Detailed error messages');
        logger.info('   - Debug logs enabled');
      }

      // Production mode specific logs
      if (config.isProduction) {
        logger.info('🏭 Production mode active:');
        logger.info('   - Security headers enabled');
        logger.info('   - Request compression enabled');
        logger.info('   - Error details limited');
        logger.info('   - Performance optimizations active');
      }
    });

    /**
     * HTTP Server Error Handling
     * --------------------------
     * Handle various server startup and runtime errors
     */
    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      logSystem('SERVER_ERROR', { error: error.message, code: error.code });
      
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${config.server.port} is already in use`);
        logger.info('💡 Suggestions:');
        logger.info('   - Change the PORT in your .env file');
        logger.info('   - Kill the process using the port');
      } else if (error.code === 'EACCES') {
        logger.error(`❌ Permission denied to bind to port ${config.server.port}`);
        logger.info('💡 Suggestions:');
        logger.info('   - Use a port number above 1024');
      } else if (error.code === 'ENOTFOUND') {
        logger.error(`❌ Host ${config.server.host} not found`);
        logger.info('💡 Try using "localhost" or "0.0.0.0" as host');
      } else {
        logger.error(`❌ Server error: ${error.message}`, error);
      }
      
      process.exit(1);
    });

    // Additional server event handlers
    httpServer.on('listening', () => {
      const address = httpServer.address();
      logger.debug('🔊 Server listening event triggered', { address });
    });

    httpServer.on('close', () => {
      logger.info('🔒 HTTP server closed');
    });

    /**
     * Process Event Handlers
     * ----------------------
     * Handle various process-level events for robust error handling
     * and graceful shutdown capabilities
     */

    // Graceful shutdown on termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', httpServer));
    process.on('SIGINT', () => gracefulShutdown('SIGINT', httpServer));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2', httpServer)); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('💥 Uncaught Exception - Server will attempt graceful shutdown:', {
        error: error.message,
        stack: error.stack,
        type: 'UNCAUGHT_EXCEPTION'
      });
      gracefulShutdown('uncaughtException', httpServer);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
      logger.error('💥 Unhandled Promise Rejection - Server will attempt graceful shutdown:', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString(),
        type: 'UNHANDLED_REJECTION'
      });
      gracefulShutdown('unhandledRejection', httpServer);
    });

    // Handle memory warnings
    process.on('warning', (warning) => {
      logger.warn('⚠️ Process Warning:', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      });
    });

  } catch (error: any) {
    // Log startup failure
    const startupDuration = Date.now() - startTime;
    logSystem('SERVER_STARTUP_FAILED', {
      error: error.message,
      startupTime: `${startupDuration}ms`,
      stack: error.stack
    });

    logger.error('❌ Failed to start Vodichron HRMS Backend Server:', {
      error: error.message,
      startupTime: `${startupDuration}ms`,
      stack: error.stack
    });

    // Attempt cleanup before exit
    try {
      if (httpServer) {
        httpServer.close();
      }
      await closeDatabase();
    } catch (cleanupError: any) {
      logger.error(`❌ Error during cleanup: ${cleanupError.message}`);
    }

    process.exit(1);
  }
};

/**
 * Export Server Control Functions
 * ------------------------------
 * Export functions for testing and programmatic control
 */
export { startServer, gracefulShutdown };

/**
 * Start the server if this file is run directly
 * ---------------------------------------------
 * This allows the server to be started directly with ts-node or node
 * while also being importable for testing
 */
if (require.main === module) {
  // Add unhandled rejection handler before starting
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Start the server
  startServer();
}
