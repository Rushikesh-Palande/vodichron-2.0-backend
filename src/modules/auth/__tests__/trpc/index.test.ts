/**
 * tRPC Auth Module Index Test Suite
 * ===================================
 * 
 * Tests the main auth tRPC module index exports.
 * 
 * Test Coverage:
 * ✅ authRouter export validation
 * ✅ Module structure and accessibility
 * ✅ Re-export correctness
 * ✅ Type safety
 * ✅ Integration readiness
 * 
 * This test validates the module's public API and export structure.
 */

// =============================================================================
// Mock Dependencies (MUST be before imports)
// =============================================================================

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
  
  class MockPerformanceTimer {
    end = jest.fn().mockReturnValue(10);
  }
  
  return {
    logger: mockLogger,
    logAuth: jest.fn(),
    logSecurity: jest.fn(),
    logDatabase: jest.fn(),
    PerformanceTimer: MockPerformanceTimer,
  };
});

// Mock all procedure modules
jest.mock('../../trpc/routers/login.router');
jest.mock('../../trpc/routers/extend-session.router');
jest.mock('../../trpc/routers/logout.router');
jest.mock('../../trpc/routers/generate-reset-link.router');
jest.mock('../../trpc/routers/validate-reset-link.router');
jest.mock('../../trpc/routers/reset-password.router');

// =============================================================================
// Imports (AFTER mocks)
// =============================================================================

import { authRouter } from '../../trpc/index';
import { authRouter as directAuthRouter } from '../../trpc/auth.router';

// =============================================================================
// Test Suite
// =============================================================================

describe('tRPC Auth Module Index', () => {
  // =============================================================================
  // Export Validation Tests
  // =============================================================================

  describe('Export Validation', () => {
    it('should export authRouter', () => {
      expect(authRouter).toBeDefined();
    });

    it('should export a non-null authRouter', () => {
      expect(authRouter).not.toBeNull();
    });

    it('should export authRouter as an object', () => {
      expect(typeof authRouter).toBe('object');
    });

    it('should re-export the same authRouter from auth.router', () => {
      // The index should re-export the router from auth.router
      // Compare structure, not identity (modules may be cached differently)
      expect(authRouter._def.procedures).toEqual(directAuthRouter._def.procedures);
    });
  });

  // =============================================================================
  // Router Structure Tests
  // =============================================================================

  describe('Router Structure', () => {
    it('should have tRPC router structure', () => {
      expect(authRouter).toHaveProperty('_def');
      expect(authRouter).toHaveProperty('createCaller');
    });

    it('should have procedures property', () => {
      expect(authRouter._def).toHaveProperty('procedures');
      expect(typeof authRouter._def.procedures).toBe('object');
    });

    it('should have config property', () => {
      expect(authRouter._def).toHaveProperty('_config');
    });

    it('should be a valid tRPC router instance', () => {
      expect(typeof authRouter.createCaller).toBe('function');
    });
  });

  // =============================================================================
  // Procedure Availability Tests
  // =============================================================================

  describe('Procedure Availability', () => {
    it('should expose all auth procedures', () => {
      const procedures = authRouter._def.procedures;
      const expectedProcedures = [
        'login',
        'extendSession',
        'logout',
        'generateResetLink',
        'validateResetLink',
        'resetPassword',
      ];

      expectedProcedures.forEach(proc => {
        expect(procedures).toHaveProperty(proc);
      });
    });

    it('should expose exactly 6 procedures', () => {
      const procedures = authRouter._def.procedures;
      const procedureCount = Object.keys(procedures).length;
      expect(procedureCount).toBe(6);
    });

    it('should have all procedures as mutations', () => {
      const procedures = authRouter._def.procedures;
      Object.values(procedures).forEach((proc: any) => {
        expect(proc._def.type).toBe('mutation');
      });
    });
  });

  // =============================================================================
  // Module Import Tests
  // =============================================================================

  describe('Module Import', () => {
    it('should be importable from index', () => {
      expect(() => {
        const { authRouter: imported } = require('../../trpc/index');
        expect(imported).toBeDefined();
      }).not.toThrow();
    });

    it('should have consistent exports', () => {
      // Import twice to ensure consistency
      const import1 = require('../../trpc/index');
      const import2 = require('../../trpc/index');
      
      expect(import1.authRouter).toBe(import2.authRouter);
    });

    it('should only export authRouter', () => {
      const exports = require('../../trpc/index');
      const exportKeys = Object.keys(exports);
      
      expect(exportKeys).toContain('authRouter');
      expect(exportKeys.length).toBe(1);
    });
  });

  // =============================================================================
  // Caller Creation Tests
  // =============================================================================

  describe('Caller Creation', () => {
    it('should support caller creation', () => {
      const mockCtx: any = {
        req: { ip: '127.0.0.1', headers: {} },
        res: { cookie: jest.fn(), clearCookie: jest.fn() },
        logger: {},
        user: null,
      };

      const caller = authRouter.createCaller(mockCtx);
      
      expect(caller).toBeDefined();
      expect(['object', 'function']).toContain(typeof caller);
    });

    it('should provide all procedures on caller', () => {
      const mockCtx: any = {
        req: { ip: '127.0.0.1', headers: {} },
        res: { cookie: jest.fn(), clearCookie: jest.fn() },
        logger: {},
        user: null,
      };

      const caller = authRouter.createCaller(mockCtx);
      
      expect(caller).toHaveProperty('login');
      expect(caller).toHaveProperty('extendSession');
      expect(caller).toHaveProperty('logout');
      expect(caller).toHaveProperty('generateResetLink');
      expect(caller).toHaveProperty('validateResetLink');
      expect(caller).toHaveProperty('resetPassword');
    });

    it('should have callable procedure methods', () => {
      const mockCtx: any = {
        req: { ip: '127.0.0.1', headers: {} },
        res: { cookie: jest.fn(), clearCookie: jest.fn() },
        logger: {},
        user: null,
      };

      const caller = authRouter.createCaller(mockCtx);
      
      expect(typeof caller.login).toBe('function');
      expect(typeof caller.extendSession).toBe('function');
      expect(typeof caller.logout).toBe('function');
      expect(typeof caller.generateResetLink).toBe('function');
      expect(typeof caller.validateResetLink).toBe('function');
      expect(typeof caller.resetPassword).toBe('function');
    });

    it('should support multiple independent callers', () => {
      const mockCtx1: any = {
        req: { ip: '192.168.1.1', headers: {} },
        res: { cookie: jest.fn(), clearCookie: jest.fn() },
        logger: {},
        user: null,
      };

      const mockCtx2: any = {
        req: { ip: '192.168.1.2', headers: {} },
        res: { cookie: jest.fn(), clearCookie: jest.fn() },
        logger: {},
        user: null,
      };

      const caller1 = authRouter.createCaller(mockCtx1);
      const caller2 = authRouter.createCaller(mockCtx2);
      
      expect(caller1).toBeDefined();
      expect(caller2).toBeDefined();
      expect(caller1).not.toBe(caller2);
    });
  });

  // =============================================================================
  // Integration Readiness Tests
  // =============================================================================

  describe('Integration Readiness', () => {
    it('should be ready for main router integration', () => {
      // Test that the router can be used as a sub-router
      expect(authRouter._def).toBeDefined();
      expect(authRouter._def.procedures).toBeDefined();
    });

    it('should maintain tRPC protocol compliance', () => {
      expect(authRouter).toHaveProperty('_def');
      expect(authRouter._def).toHaveProperty('procedures');
      expect(authRouter._def).toHaveProperty('_config');
    });

    it('should be compatible with tRPC router merging', () => {
      // The structure should be compatible with mergeRouters or router composition
      const procedures = authRouter._def.procedures;
      
      expect(Object.keys(procedures).length).toBeGreaterThan(0);
      Object.values(procedures).forEach((proc: any) => {
        expect(proc).toHaveProperty('_def');
      });
    });
  });

  // =============================================================================
  // Type Safety Tests
  // =============================================================================

  describe('Type Safety', () => {
    it('should maintain type-safe exports', () => {
      expect(authRouter).toBeDefined();
      expect(authRouter._def).toBeDefined();
      expect(authRouter._def.procedures).toBeDefined();
    });

    it('should have consistent procedure types', () => {
      const procedures = authRouter._def.procedures;
      
      Object.entries(procedures).forEach(([name, proc]: [string, any]) => {
        expect(typeof name).toBe('string');
        expect(proc).toHaveProperty('_def');
        expect(proc._def).toHaveProperty('type');
        expect(proc._def.type).toBe('mutation');
      });
    });

    it('should preserve router metadata', () => {
      expect(authRouter._def).toHaveProperty('_config');
      expect(authRouter._def).toHaveProperty('procedures');
    });
  });

  // =============================================================================
  // Public API Tests
  // =============================================================================

  describe('Public API', () => {
    it('should expose only the authRouter', () => {
      const exports = require('../../trpc/index');
      const exportNames = Object.keys(exports);
      
      expect(exportNames).toEqual(['authRouter']);
    });

    it('should not expose internal implementation details', () => {
      const exports = require('../../trpc/index');
      
      // Should not export individual procedures
      expect(exports).not.toHaveProperty('loginProcedure');
      expect(exports).not.toHaveProperty('logoutProcedure');
      expect(exports).not.toHaveProperty('extendSessionProcedure');
    });

    it('should provide a clean public interface', () => {
      expect(authRouter).toBeDefined();
      expect(typeof authRouter.createCaller).toBe('function');
      expect(authRouter._def.procedures).toBeDefined();
    });
  });

  // =============================================================================
  // Consistency Tests
  // =============================================================================

  describe('Consistency', () => {
    it('should have consistent router structure across imports', () => {
      const { authRouter: import1 } = require('../../trpc/index');
      const { authRouter: import2 } = require('../../trpc/auth.router');
      
      // Compare structure, not identity
      expect(import1._def.procedures).toEqual(import2._def.procedures);
    });

    it('should maintain procedure count across imports', () => {
      const { authRouter: fromIndex } = require('../../trpc/index');
      const { authRouter: fromRouter } = require('../../trpc/auth.router');
      
      const indexProcedures = Object.keys(fromIndex._def.procedures);
      const routerProcedures = Object.keys(fromRouter._def.procedures);
      
      expect(indexProcedures.length).toBe(routerProcedures.length);
    });

    it('should have identical procedure names across imports', () => {
      const { authRouter: fromIndex } = require('../../trpc/index');
      const { authRouter: fromRouter } = require('../../trpc/auth.router');
      
      const indexProcedures = Object.keys(fromIndex._def.procedures).sort();
      const routerProcedures = Object.keys(fromRouter._def.procedures).sort();
      
      expect(indexProcedures).toEqual(routerProcedures);
    });
  });

  // =============================================================================
  // Documentation Tests
  // =============================================================================

  describe('Documentation', () => {
    it('should have a well-structured router', () => {
      // Router should have clear structure for documentation
      const procedures = authRouter._def.procedures;
      const procedureNames = Object.keys(procedures);
      
      // Should have logical grouping (auth + password reset)
      const authProcedures = ['login', 'extendSession', 'logout'];
      const resetProcedures = ['generateResetLink', 'validateResetLink', 'resetPassword'];
      
      authProcedures.forEach(name => {
        expect(procedureNames).toContain(name);
      });
      
      resetProcedures.forEach(name => {
        expect(procedureNames).toContain(name);
      });
    });

    it('should follow naming conventions', () => {
      const procedures = authRouter._def.procedures;
      const procedureNames = Object.keys(procedures);
      
      // All procedure names should be camelCase
      procedureNames.forEach(name => {
        expect(name).toMatch(/^[a-z][a-zA-Z0-9]*$/);
      });
    });
  });
});
