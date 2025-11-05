import { Router } from 'express';
import { logger, PerformanceTimer } from '../utils/logger';
import healthRoutes from './health';

/**
 * Main Routes Index
 * ----------------
 * Central routing configuration that mounts all application routes
 */

logger.info('🛣️  Initializing route configuration...');
const routeTimer = new PerformanceTimer('routeConfiguration');

const router = Router();

/**
 * Mount Routes
 * -----------
 */

// Health & Documentation routes
router.use('/', healthRoutes);
logger.debug('  📍 Mounted: / → healthRoutes (Health check & API docs)');

// Auth routes (login, logout, extend-session)
import authRoutes from '../modules/auth/routes/auth.routes';
router.use('/api/auth', authRoutes);
logger.debug('  📍 Mounted: /api/auth → authRoutes');

// Employee routes
import employeeRoutes from '../modules/employee/routes/employee.routes';
router.use('/api/employees', employeeRoutes);
logger.debug('  📍 Mounted: /api/employees → employeeRoutes');

// User routes
import userRoutes from '../modules/users/routes/user.routes';
router.use('/api/user', userRoutes);
logger.debug('  📍 Mounted: /api/user → userRoutes');

// Master Data routes
import masterDataRoutes from '../modules/master-data/routes/master-data.routes';
router.use('/api/master-data', masterDataRoutes);
logger.debug('  📍 Mounted: /api/master-data → masterDataRoutes');

const duration = routeTimer.end();
const mountedRoutes = [
  { path: '/', handler: 'healthRoutes', methods: ['GET'] }
];

logger.info('✅ Route configuration completed', {
  routeCount: mountedRoutes.length,
  duration: `${duration}ms`,
  routes: mountedRoutes
});

export default router;
