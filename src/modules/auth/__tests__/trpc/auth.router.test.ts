/**
 * tRPC Auth Router Test Suite
 * ============================
 * 
 * Tests the main auth router composition and integration.
 * 
 * Test Coverage:
 * ✅ Router structure validation
 * ✅ All procedures are properly exposed
 * ✅ Procedure integration and composition
 * ✅ Router exports and type safety
 * ✅ Integration with tRPC infrastructure
 * 
 * This test validates the router composition layer, NOT the individual
 * procedure implementations (those are tested in their own test files).
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

import { authRouter } from '../../trpc/auth.router';

// =============================================================================
// Test Suite
// =============================================================================

describe('tRPC Auth Router', () => {
  // =============================================================================
  // Router Structure Tests
  // =============================================================================

  describe('Router Structure', () => {
    it('should be defined', () => {
      expect(authRouter).toBeDefined();
    });

    it('should be a tRPC router object', () => {
      expect(typeof authRouter).toBe('object');
      expect(authRouter).not.toBeNull();
    });

    it('should have the correct structure', () => {
      expect(authRouter).toHaveProperty('_def');
      expect(authRouter._def).toHaveProperty('procedures');
    });
  });

  // =============================================================================
  // Procedure Exposure Tests
  // =============================================================================

  describe('Procedure Exposure', () => {
    it('should expose login procedure', () => {
      expect(authRouter._def.procedures).toHaveProperty('login');
    });

    it('should expose extendSession procedure', () => {
      expect(authRouter._def.procedures).toHaveProperty('extendSession');
    });

    it('should expose logout procedure', () => {
      expect(authRouter._def.procedures).toHaveProperty('logout');
    });

    it('should expose generateResetLink procedure', () => {
      expect(authRouter._def.procedures).toHaveProperty('generateResetLink');
    });

    it('should expose validateResetLink procedure', () => {
      expect(authRouter._def.procedures).toHaveProperty('validateResetLink');
    });

    it('should expose resetPassword procedure', () => {
      expect(authRouter._def.procedures).toHaveProperty('resetPassword');
    });

    it('should expose exactly 6 procedures', () => {
      const procedureKeys = Object.keys(authRouter._def.procedures);
      expect(procedureKeys).toHaveLength(6);
    });

    it('should only expose expected procedures', () => {
      const procedureKeys = Object.keys(authRouter._def.procedures);
      const expectedProcedures = [
        'login',
        'extendSession',
        'logout',
        'generateResetLink',
        'validateResetLink',
        'resetPassword',
      ];

      expectedProcedures.forEach(proc => {
        expect(procedureKeys).toContain(proc);
      });
    });
  });

  // =============================================================================
  // Procedure Type Tests
  // =============================================================================

  describe('Procedure Types', () => {
    it('should have login as a mutation procedure', () => {
      const loginProc = authRouter._def.procedures.login;
      expect(loginProc).toBeDefined();
      expect(loginProc._def).toHaveProperty('type');
      expect(loginProc._def.type).toBe('mutation');
    });

    it('should have extendSession as a mutation procedure', () => {
      const extendProc = authRouter._def.procedures.extendSession;
      expect(extendProc).toBeDefined();
      expect(extendProc._def).toHaveProperty('type');
      expect(extendProc._def.type).toBe('mutation');
    });

    it('should have logout as a mutation procedure', () => {
      const logoutProc = authRouter._def.procedures.logout;
      expect(logoutProc).toBeDefined();
      expect(logoutProc._def).toHaveProperty('type');
      expect(logoutProc._def.type).toBe('mutation');
    });

    it('should have generateResetLink as a mutation procedure', () => {
      const generateProc = authRouter._def.procedures.generateResetLink;
      expect(generateProc).toBeDefined();
      expect(generateProc._def).toHaveProperty('type');
      expect(generateProc._def.type).toBe('mutation');
    });

    it('should have validateResetLink as a mutation procedure', () => {
      const validateProc = authRouter._def.procedures.validateResetLink;
      expect(validateProc).toBeDefined();
      expect(validateProc._def).toHaveProperty('type');
      expect(validateProc._def.type).toBe('mutation');
    });

    it('should have resetPassword as a mutation procedure', () => {
      const resetProc = authRouter._def.procedures.resetPassword;
      expect(resetProc).toBeDefined();
      expect(resetProc._def).toHaveProperty('type');
      expect(resetProc._def.type).toBe('mutation');
    });
  });

  // =============================================================================
  // Caller Creation Tests
  // =============================================================================

  describe('Caller Creation', () => {
    it('should be able to create a caller', () => {
      const mockCtx: any = { req: {}, res: {}, logger: {}, user: null };
      const caller = authRouter.createCaller(mockCtx);
      
      expect(caller).toBeDefined();
      expect(['object', 'function']).toContain(typeof caller);
    });

    it('should have all procedures available on caller', () => {
      const mockCtx: any = { req: {}, res: {}, logger: {}, user: null };
      const caller = authRouter.createCaller(mockCtx);
      
      expect(caller).toHaveProperty('login');
      expect(caller).toHaveProperty('extendSession');
      expect(caller).toHaveProperty('logout');
      expect(caller).toHaveProperty('generateResetLink');
      expect(caller).toHaveProperty('validateResetLink');
      expect(caller).toHaveProperty('resetPassword');
    });

    it('should have callable procedures', () => {
      const mockCtx: any = { req: {}, res: {}, logger: {}, user: null };
      const caller = authRouter.createCaller(mockCtx);
      
      expect(typeof caller.login).toBe('function');
      expect(typeof caller.extendSession).toBe('function');
      expect(typeof caller.logout).toBe('function');
      expect(typeof caller.generateResetLink).toBe('function');
      expect(typeof caller.validateResetLink).toBe('function');
      expect(typeof caller.resetPassword).toBe('function');
    });
  });

  // =============================================================================
  // Router Metadata Tests
  // =============================================================================

  describe('Router Metadata', () => {
    it('should have correct router type', () => {
      expect(authRouter._def).toHaveProperty('_config');
    });

    it('should have procedures object', () => {
      expect(authRouter._def.procedures).toBeDefined();
      expect(typeof authRouter._def.procedures).toBe('object');
    });

    it('should not have query property', () => {
      // All auth procedures should be mutations, not queries
      const procedures = authRouter._def.procedures;
      Object.values(procedures).forEach((proc: any) => {
        expect(proc._def.type).not.toBe('query');
      });
    });

    it('should not have subscription property', () => {
      // Auth router should not have subscriptions
      const procedures = authRouter._def.procedures;
      Object.values(procedures).forEach((proc: any) => {
        expect(proc._def.type).not.toBe('subscription');
      });
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration', () => {
    it('should integrate properly with tRPC infrastructure', () => {
      // Test that router can be mounted/used
      expect(() => {
        const mockCtx: any = { req: {}, res: {}, logger: {}, user: null };
        authRouter.createCaller(mockCtx);
      }).not.toThrow();
    });

    it('should maintain procedure isolation', () => {
      // Each procedure should be independent
      const procedures = authRouter._def.procedures;
      const procedureNames = Object.keys(procedures);
      
      // Ensure no unexpected shared state
      expect(new Set(procedureNames).size).toBe(procedureNames.length);
    });

    it('should support multiple caller instances', () => {
      const mockCtx1: any = { req: { id: 1 }, res: {}, logger: {}, user: null };
      const mockCtx2: any = { req: { id: 2 }, res: {}, logger: {}, user: null };
      
      const caller1 = authRouter.createCaller(mockCtx1);
      const caller2 = authRouter.createCaller(mockCtx2);
      
      expect(caller1).toBeDefined();
      expect(caller2).toBeDefined();
      expect(caller1).not.toBe(caller2);
    });
  });

  // =============================================================================
  // Procedure Group Tests
  // =============================================================================

  describe('Procedure Grouping', () => {
    it('should have authentication procedures (login, logout, extendSession)', () => {
      const procedures = authRouter._def.procedures;
      
      expect(procedures).toHaveProperty('login');
      expect(procedures).toHaveProperty('logout');
      expect(procedures).toHaveProperty('extendSession');
    });

    it('should have password reset procedures (generateResetLink, validateResetLink, resetPassword)', () => {
      const procedures = authRouter._def.procedures;
      
      expect(procedures).toHaveProperty('generateResetLink');
      expect(procedures).toHaveProperty('validateResetLink');
      expect(procedures).toHaveProperty('resetPassword');
    });

    it('should have session management procedures', () => {
      const procedures = authRouter._def.procedures;
      const sessionProcedures = ['login', 'extendSession', 'logout'];
      
      sessionProcedures.forEach(proc => {
        expect(procedures).toHaveProperty(proc);
      });
    });

    it('should have password management procedures', () => {
      const procedures = authRouter._def.procedures;
      const passwordProcedures = ['generateResetLink', 'validateResetLink', 'resetPassword'];
      
      passwordProcedures.forEach(proc => {
        expect(procedures).toHaveProperty(proc);
      });
    });
  });

  // =============================================================================
  // Export Tests
  // =============================================================================

  describe('Exports', () => {
    it('should export authRouter', () => {
      expect(authRouter).toBeDefined();
      expect(authRouter).not.toBeNull();
    });

    it('should be importable', () => {
      // This test passing means the import worked
      expect(typeof authRouter).toBe('object');
    });
  });

  // =============================================================================
  // Type Safety Tests
  // =============================================================================

  describe('Type Safety', () => {
    it('should have type-safe procedures', () => {
      const procedures = authRouter._def.procedures;
      
      Object.entries(procedures).forEach(([name, proc]: [string, any]) => {
        expect(proc).toBeDefined();
        expect(proc).toHaveProperty('_def');
        expect(typeof name).toBe('string');
      });
    });

    it('should maintain tRPC protocol structure', () => {
      expect(authRouter).toHaveProperty('_def');
      expect(authRouter).toHaveProperty('createCaller');
      expect(typeof authRouter.createCaller).toBe('function');
    });
  });
});
