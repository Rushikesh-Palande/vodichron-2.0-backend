/**
 * Auth Routes Test Suite
 * ======================
 * 
 * Tests the auth router configuration which defines all authentication
 * endpoints and their mappings to controllers.
 * 
 * Test Coverage:
 * ✅ POST /login route registration
 * ✅ POST /logout route registration
 * ✅ POST /extend-session route registration
 * ✅ POST /generate-reset-link route registration
 * ✅ POST /validate-reset-link route registration
 * ✅ POST /reset-password route registration
 * ✅ GET /status route registration
 * ✅ Status endpoint response format
 * ✅ Controller integration
 * ✅ Route initialization logging
 * 
 * Security Considerations:
 * - Public routes (no auth): /generate-reset-link, /validate-reset-link, /reset-password, /login
 * - Protected routes (require auth): /logout, /extend-session
 * - Status endpoint provides system information
 * - Rate limiting applied globally in app.ts
 * 
 * HTTP Contracts:
 * - POST /login - Authentication
 * - POST /logout - Session revocation
 * - POST /extend-session - Token rotation
 * - POST /generate-reset-link - Password reset initiation
 * - POST /validate-reset-link - Reset link validation
 * - POST /reset-password - Password reset completion
 * - GET /status - System status
 * 
 * Integration Points:
 * - Controllers: authLogin, logoutUser, extendSession, generateResetLinkController, validateResetLinkController, resetPasswordController
 * - Logger: logger
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\routes
 */

import request from 'supertest';
import express, { Express } from 'express';
import authRouter from '../../routes/auth.routes';
import { authLogin } from '../../controllers/login.controller';
import { logoutUser } from '../../controllers/logout.controller';
import { extendSession } from '../../controllers/extend-session.controller';
import { generateResetLinkController } from '../../controllers/generate-reset-link.controller';
import { validateResetLinkController } from '../../controllers/validate-reset-link.controller';
import { resetPasswordController } from '../../controllers/reset-password.controller';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Mock Dependencies
// =============================================================================

// Mock logger
jest.mock('../../../../utils/logger', () => {
  const mockLogger: any = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  
  mockLogger.info.mockReturnValue(mockLogger);
  mockLogger.debug.mockReturnValue(mockLogger);
  mockLogger.warn.mockReturnValue(mockLogger);
  mockLogger.error.mockReturnValue(mockLogger);
  
  return {
    logger: mockLogger,
    logAuth: jest.fn(),
    logSecurity: jest.fn(),
    logDatabase: jest.fn(),
    PerformanceTimer: jest.fn().mockImplementation(() => ({
      end: jest.fn().mockReturnValue(10),
    })),
  };
});

// Mock all controllers
jest.mock('../../controllers/login.controller');
jest.mock('../../controllers/logout.controller');
jest.mock('../../controllers/extend-session.controller');
jest.mock('../../controllers/generate-reset-link.controller');
jest.mock('../../controllers/validate-reset-link.controller');
jest.mock('../../controllers/reset-password.controller');

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Auth Routes', () => {
  let app: Express;

  // ---------------------------------------------------------------------------
  // Before All: Setup Express App
  // ---------------------------------------------------------------------------
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
  });

  // ---------------------------------------------------------------------------
  // Before Each: Reset Mocks
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses for controllers
    (authLogin as jest.Mock).mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });

    (logoutUser as jest.Mock).mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });

    (extendSession as jest.Mock).mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });

    (generateResetLinkController as jest.Mock).mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });

    (validateResetLinkController as jest.Mock).mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });

    (resetPasswordController as jest.Mock).mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });
  });

  // =============================================================================
  // Route Registration Tests
  // =============================================================================

  describe('Route Registration', () => {
    /**
     * Test Case: Login Route
     * ----------------------
     * Verifies POST /login route is registered and calls controller.
     */
    it('should register POST /login route', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test@example.com', password: 'password' });

      expect(response.status).toBe(200);
      expect(authLogin).toHaveBeenCalled();
    });

    /**
     * Test Case: Logout Route
     * -----------------------
     * Verifies POST /logout route is registered and calls controller.
     */
    it('should register POST /logout route', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(logoutUser).toHaveBeenCalled();
    });

    /**
     * Test Case: Extend Session Route
     * -------------------------------
     * Verifies POST /extend-session route is registered and calls controller.
     */
    it('should register POST /extend-session route', async () => {
      const response = await request(app)
        .post('/auth/extend-session');

      expect(response.status).toBe(200);
      expect(extendSession).toHaveBeenCalled();
    });

    /**
     * Test Case: Generate Reset Link Route
     * ------------------------------------
     * Verifies POST /generate-reset-link route is registered and calls controller.
     */
    it('should register POST /generate-reset-link route', async () => {
      const response = await request(app)
        .post('/auth/generate-reset-link')
        .send({ username: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(generateResetLinkController).toHaveBeenCalled();
    });

    /**
     * Test Case: Validate Reset Link Route
     * ------------------------------------
     * Verifies POST /validate-reset-link route is registered and calls controller.
     */
    it('should register POST /validate-reset-link route', async () => {
      const response = await request(app)
        .post('/auth/validate-reset-link')
        .send({ sec: 'token' });

      expect(response.status).toBe(200);
      expect(validateResetLinkController).toHaveBeenCalled();
    });

    /**
     * Test Case: Reset Password Route
     * -------------------------------
     * Verifies POST /reset-password route is registered and calls controller.
     */
    it('should register POST /reset-password route', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({ email: 'test@example.com', sec: 'token', password: 'NewPass123!' });

      expect(response.status).toBe(200);
      expect(resetPasswordController).toHaveBeenCalled();
    });

    /**
     * Test Case: Status Route
     * -----------------------
     * Verifies GET /status route is registered.
     */
    it('should register GET /status route', async () => {
      const response = await request(app)
        .get('/auth/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  // =============================================================================
  // Status Endpoint Tests
  // =============================================================================

  describe('GET /status Endpoint', () => {
    /**
     * Test Case: Status Response Format
     * ---------------------------------
     * Verifies status endpoint returns correct format.
     */
    it('should return status with all required fields', async () => {
      const response = await request(app)
        .get('/auth/status');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Authentication system status retrieved',
        data: {
          status: 'active',
          endpoints: expect.any(Object),
          features: expect.any(Object),
          limits: expect.any(Object),
          timestamp: expect.any(String),
        },
      });
    });

    /**
     * Test Case: Endpoints List
     * -------------------------
     * Verifies all endpoints are listed in status.
     */
    it('should list all authentication endpoints', async () => {
      const response = await request(app)
        .get('/auth/status');

      expect(response.body.data.endpoints).toEqual({
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        extendSession: '/api/auth/extend-session',
        status: '/api/auth/status',
      });
    });

    /**
     * Test Case: Features List
     * ------------------------
     * Verifies all features are listed.
     */
    it('should list all authentication features', async () => {
      const response = await request(app)
        .get('/auth/status');

      expect(response.body.data.features).toEqual({
        rateLimiting: true,
        passwordHashing: true,
        jwtTokens: true,
        refreshTokens: true,
        sessionManagement: true,
      });
    });

    /**
     * Test Case: Limits Information
     * -----------------------------
     * Verifies token expiry limits are included.
     */
    it('should include token expiry limits', async () => {
      const response = await request(app)
        .get('/auth/status');

      expect(response.body.data.limits).toEqual({
        accessTokenExpiry: '30 minutes',
        refreshTokenExpiry: '7 days',
      });
    });

    /**
     * Test Case: Timestamp Format
     * ---------------------------
     * Verifies timestamp is valid ISO string.
     */
    it('should include valid timestamp', async () => {
      const response = await request(app)
        .get('/auth/status');

      const timestamp = response.body.data.timestamp;
      expect(timestamp).toBeDefined();
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    /**
     * Test Case: Status Always Active
     * -------------------------------
     * Verifies status is always 'active'.
     */
    it('should return status as active', async () => {
      const response = await request(app)
        .get('/auth/status');

      expect(response.body.data.status).toBe('active');
    });
  });

  // =============================================================================
  // HTTP Method Tests
  // =============================================================================

  describe('HTTP Method Validation', () => {
    /**
     * Test Case: Wrong Method on Login
     * --------------------------------
     * Verifies GET on /login returns 404.
     */
    it('should reject GET request to /login', async () => {
      const response = await request(app)
        .get('/auth/login');

      expect(response.status).toBe(404);
      expect(authLogin).not.toHaveBeenCalled();
    });

    /**
     * Test Case: Wrong Method on Status
     * ---------------------------------
     * Verifies POST on /status returns 404.
     */
    it('should reject POST request to /status', async () => {
      const response = await request(app)
        .post('/auth/status')
        .send({});

      expect(response.status).toBe(404);
    });

    /**
     * Test Case: Correct Methods Only
     * -------------------------------
     * Verifies routes only respond to correct HTTP methods.
     */
    it('should only allow POST for auth action endpoints', async () => {
      const endpoints = [
        '/auth/login',
        '/auth/logout',
        '/auth/extend-session',
        '/auth/generate-reset-link',
        '/auth/validate-reset-link',
        '/auth/reset-password',
      ];

      for (const endpoint of endpoints) {
        const getResponse = await request(app).get(endpoint);
        expect(getResponse.status).toBe(404);

        const putResponse = await request(app).put(endpoint);
        expect(putResponse.status).toBe(404);

        const deleteResponse = await request(app).delete(endpoint);
        expect(deleteResponse.status).toBe(404);
      }
    });
  });

  // =============================================================================
  // Controller Integration Tests
  // =============================================================================

  describe('Controller Integration', () => {
    /**
     * Test Case: Request Passed to Controller
     * ---------------------------------------
     * Verifies request object is passed to controllers.
     */
    it('should pass request to login controller', async () => {
      const requestBody = { username: 'test@example.com', password: 'pass' };

      await request(app)
        .post('/auth/login')
        .send(requestBody);

      expect(authLogin).toHaveBeenCalled();
      const callArgs = (authLogin as jest.Mock).mock.calls[0];
      expect(callArgs[0].body).toEqual(requestBody);
    });

    /**
     * Test Case: Response Object Passed
     * ---------------------------------
     * Verifies response object is passed to controllers.
     */
    it('should pass response object to controllers', async () => {
      await request(app)
        .post('/auth/logout');

      expect(logoutUser).toHaveBeenCalled();
      const callArgs = (logoutUser as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toHaveProperty('status');
      expect(callArgs[1]).toHaveProperty('json');
    });

    /**
     * Test Case: Controller Response Forwarded
     * ----------------------------------------
     * Verifies controller responses are forwarded to client.
     */
    it('should forward controller response to client', async () => {
      (authLogin as jest.Mock).mockImplementation((_req, res) => {
        res.status(201).json({ success: true, token: 'abc123' });
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test@example.com', password: 'pass' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true, token: 'abc123' });
    });

    /**
     * Test Case: Multiple Requests
     * ----------------------------
     * Verifies routes handle multiple sequential requests.
     */
    it('should handle multiple requests correctly', async () => {
      await request(app).post('/auth/login').send({ username: 'user1@example.com', password: 'pass1' });
      await request(app).post('/auth/login').send({ username: 'user2@example.com', password: 'pass2' });
      await request(app).post('/auth/logout');

      expect(authLogin).toHaveBeenCalledTimes(2);
      expect(logoutUser).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // Route Path Tests
  // =============================================================================

  describe('Route Paths', () => {
    /**
     * Test Case: Case Sensitivity
     * ---------------------------
     * Verifies Express routing behavior (case-insensitive by default).
     */
    it('should handle case variations (Express default behavior)', async () => {
      // Note: Express routes are case-insensitive by default
      const response = await request(app)
        .post('/auth/Login'); // Different case

      // Express will match this route
      expect(response.status).toBe(200);
      expect(authLogin).toHaveBeenCalled();
    });

    /**
     * Test Case: Trailing Slash
     * -------------------------
     * Verifies routes work without trailing slash.
     */
    it('should not require trailing slash', async () => {
      const response = await request(app)
        .post('/auth/login'); // No trailing slash

      expect(response.status).toBe(200);
      expect(authLogin).toHaveBeenCalled();
    });

    /**
     * Test Case: Base Path
     * --------------------
     * Verifies routes require /auth base path.
     */
    it('should require /auth base path', async () => {
      const response = await request(app)
        .post('/login'); // Missing /auth

      expect(response.status).toBe(404);
      expect(authLogin).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // JSON Body Parsing Tests
  // =============================================================================

  describe('Request Body Parsing', () => {
    /**
     * Test Case: JSON Body Parsed
     * ---------------------------
     * Verifies JSON request bodies are parsed.
     */
    it('should parse JSON request body', async () => {
      const requestBody = { username: 'test@example.com', password: 'password' };

      await request(app)
        .post('/auth/login')
        .send(requestBody);

      const callArgs = (authLogin as jest.Mock).mock.calls[0];
      expect(callArgs[0].body).toEqual(requestBody);
    });

    /**
     * Test Case: Content-Type Header
     * ------------------------------
     * Verifies application/json content-type is supported.
     */
    it('should support application/json content-type', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ username: 'test@example.com', password: 'pass' }));

      expect(response.status).toBe(200);
      expect(authLogin).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Logging Tests
  // =============================================================================

  describe('Route Initialization Logging', () => {
    /**
     * Test Case: Route Module Exports Router
     * --------------------------------------
     * Verifies auth routes module exports a router.
     */
    it('should export a valid Express router', () => {
      // Verify authRouter is an Express router
      expect(authRouter).toBeDefined();
      expect(typeof authRouter).toBe('function');
    });

    /**
     * Test Case: Status Request Logged
     * --------------------------------
     * Verifies status endpoint requests are logged.
     */
    it('should log status endpoint requests', async () => {
      jest.clearAllMocks();

      await request(app)
        .get('/auth/status');

      expect(logger.info).toHaveBeenCalledWith(
        '🔐 Authentication system status requested'
      );
    });
  });
});
