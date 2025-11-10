/**
 * Jest Global Setup File
 * =======================
 * 
 * This file runs once before all test suites start.
 * It configures the global test environment for the entire test run.
 * 
 * Responsibilities:
 * - Set test environment variables
 * - Configure global test timeouts
 * - Set up global mocks
 * - Configure console output for tests
 * 
 * Note: This is different from beforeAll/afterAll which run per test file.
 * This runs ONCE for the entire Jest process.
 */

import { logger } from '../utils/logger';

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Set NODE_ENV to 'test' to ensure test-specific behavior
 * This prevents production database connections, email sending, etc.
 */
process.env.NODE_ENV = 'test';

/**
 * Suppress console logs during tests (unless explicitly enabled)
 * This keeps test output clean and focused on test results
 */
if (!process.env.VERBOSE_TESTS) {
  // Keep console.error for critical issues
  // Suppress info, log, warn for cleaner output
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// =============================================================================
// Test Timeout Configuration
// =============================================================================

/**
 * Global test timeout (30 seconds)
 * Database operations and external API calls may take time
 */
jest.setTimeout(30000);

// =============================================================================
// Global Test Utilities
// =============================================================================

/**
 * Global test helper to check if logger was called with a substring
 * This helper is used across multiple test files
 * 
 * @param spy - Jest spy on logger method
 * @param substring - Text to search for in log calls
 * @returns true if substring found in any log call
 */
global.wasLogged = (spy: jest.SpyInstance, substring: string): boolean => {
  return spy.mock.calls.some((call) =>
    call.some((arg: unknown) => {
      let message = '';
      if (typeof arg === 'string') {
        // Handle string messages
        message = arg.replace(/✅|❌|🔄|⚠️|💥|🔐|🔒/g, '').trim();
      } else if (arg && typeof arg === 'object') {
        // Handle winston's object format
        const obj = arg as Record<string, unknown>;
        if ('message' in obj && typeof obj.message === 'string') {
          message = obj.message.replace(/✅|❌|🔄|⚠️|💥|🔐|🔒/g, '').trim();
        }
      }
      return message.includes(substring);
    })
  );
};

// =============================================================================
// Global Type Declarations
// =============================================================================

declare global {
  function wasLogged(spy: jest.SpyInstance, substring: string): boolean;
}

// =============================================================================
// Test Lifecycle Logging
// =============================================================================

logger.info('🧪 Jest test environment initialized', {
  type: 'TEST_SETUP',
  nodeEnv: process.env.NODE_ENV,
  timestamp: new Date().toISOString(),
});

// =============================================================================
// Cleanup on Test Completion
// =============================================================================

/**
 * Runs after all tests complete
 * Clean up any resources, close connections, etc.
 */
afterAll(async () => {
  logger.info('🏁 All tests completed', {
    type: 'TEST_TEARDOWN',
    timestamp: new Date().toISOString(),
  });
  
  // Allow async operations to complete before exit
  await new Promise((resolve) => setTimeout(resolve, 500));
});
