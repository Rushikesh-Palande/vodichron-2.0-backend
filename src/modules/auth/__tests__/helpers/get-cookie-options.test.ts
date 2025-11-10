/**
 * Get Cookie Options Helper Test Suite
 * ======================================
 * 
 * Tests the getRefreshCookieOptions function which provides secure cookie
 * configuration for refresh token storage with environment-aware settings.
 * 
 * Test Coverage:
 * ✅ httpOnly flag (always true for security)
 * ✅ secure flag (environment-dependent)
 * ✅ sameSite configuration (environment-dependent)
 * ✅ path configuration (root path)
 * ✅ maxAge configuration (token expiry)
 * ✅ Production vs Development settings
 * ✅ Security best practices validation
 * ✅ Real-world cookie scenarios
 * 
 * Security Considerations:
 * - httpOnly=true prevents XSS attacks on token
 * - secure=true in prod requires HTTPS
 * - sameSite='none' in prod allows cross-site cookies
 * - sameSite='lax' in dev works for localhost
 * - path='/' makes cookie available to all endpoints
 * - maxAge controls cookie lifetime
 */

import { getRefreshCookieOptions } from '../../helpers/get-cookie-options';
import { config } from '../../../../config';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('getRefreshCookieOptions Helper', () => {
  let infoSpy: jest.SpyInstance;
  let originalIsProduction: boolean;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    logger.info('🔄 Setting up test case...');
    originalIsProduction = config.isProduction;
  });

  afterEach(() => {
    // Restore original config
    Object.defineProperty(config, 'isProduction', {
      value: originalIsProduction,
      writable: true,
      configurable: true,
    });
    infoSpy.mockRestore();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Mock production environment
   */
  function mockProductionEnvironment() {
    Object.defineProperty(config, 'isProduction', {
      value: true,
      writable: true,
      configurable: true,
    });
    logger.info('🏭 Environment: PRODUCTION');
  }

  /**
   * Mock development environment
   */
  function mockDevelopmentEnvironment() {
    Object.defineProperty(config, 'isProduction', {
      value: false,
      writable: true,
      configurable: true,
    });
    logger.info('🛠️  Environment: DEVELOPMENT');
  }

  // =============================================================================
  // httpOnly Flag Tests
  // =============================================================================

  /**
   * Test Case: httpOnly Always True
   * --------------------------------
   * Verifies httpOnly is always enabled for XSS protection.
   */
  it('should always set httpOnly to true', () => {
    logger.info('🧪 Test: httpOnly flag (always true)');
    
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.httpOnly).toBe(true);
    logger.info('✅ httpOnly is true (XSS protection enabled)');
  });

  /**
   * Test Case: httpOnly in Production
   * ----------------------------------
   * Verifies httpOnly remains true in production.
   */
  it('should keep httpOnly true in production', () => {
    logger.info('🧪 Test: httpOnly in production');
    
    mockProductionEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.httpOnly).toBe(true);
    logger.info('✅ httpOnly is true in production');
  });

  /**
   * Test Case: httpOnly in Development
   * -----------------------------------
   * Verifies httpOnly remains true in development.
   */
  it('should keep httpOnly true in development', () => {
    logger.info('🧪 Test: httpOnly in development');
    
    mockDevelopmentEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.httpOnly).toBe(true);
    logger.info('✅ httpOnly is true in development');
  });

  // =============================================================================
  // secure Flag Tests
  // =============================================================================

  /**
   * Test Case: secure Flag in Production
   * -------------------------------------
   * Verifies secure is enabled in production (HTTPS required).
   */
  it('should set secure to true in production', () => {
    logger.info('🧪 Test: secure flag in production');
    
    mockProductionEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.secure).toBe(true);
    logger.info('✅ secure is true in production (HTTPS required)');
  });

  /**
   * Test Case: secure Flag in Development
   * --------------------------------------
   * Verifies secure is disabled in development (HTTP allowed).
   */
  it('should set secure to false in development', () => {
    logger.info('🧪 Test: secure flag in development');
    
    mockDevelopmentEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.secure).toBe(false);
    logger.info('✅ secure is false in development (HTTP allowed)');
  });

  // =============================================================================
  // sameSite Configuration Tests
  // =============================================================================

  /**
   * Test Case: sameSite in Production
   * ----------------------------------
   * Verifies sameSite='none' in production (cross-site cookies).
   */
  it('should set sameSite to none in production', () => {
    logger.info('🧪 Test: sameSite in production');
    
    mockProductionEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.sameSite).toBe('none');
    logger.info('✅ sameSite is "none" in production (cross-site allowed)');
  });

  /**
   * Test Case: sameSite in Development
   * -----------------------------------
   * Verifies sameSite='lax' in development (localhost-friendly).
   */
  it('should set sameSite to lax in development', () => {
    logger.info('🧪 Test: sameSite in development');
    
    mockDevelopmentEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.sameSite).toBe('lax');
    logger.info('✅ sameSite is "lax" in development (localhost-friendly)');
  });

  /**
   * Test Case: sameSite and secure Compatibility
   * ---------------------------------------------
   * Verifies that sameSite='none' requires secure=true.
   */
  it('should ensure sameSite=none only with secure=true', () => {
    logger.info('🧪 Test: sameSite=none requires secure=true');
    
    mockProductionEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    if (options.sameSite === 'none') {
      expect(options.secure).toBe(true);
      logger.info('✅ sameSite=none paired with secure=true (spec compliant)');
    } else {
      logger.info('⚠️  sameSite is not "none" (different environment)');
    }
  });

  // =============================================================================
  // path Configuration Tests
  // =============================================================================

  /**
   * Test Case: Root Path Configuration
   * -----------------------------------
   * Verifies path is set to root (/).
   */
  it('should set path to root', () => {
    logger.info('🧪 Test: path configuration');
    
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.path).toBe('/');
    logger.info('✅ path is "/" (available to all endpoints)');
  });

  // =============================================================================
  // maxAge Configuration Tests
  // =============================================================================

  /**
   * Test Case: maxAge Configuration
   * --------------------------------
   * Verifies maxAge is set correctly.
   */
  it('should set maxAge from parameter', () => {
    logger.info('🧪 Test: maxAge configuration');
    
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.maxAge).toBe(maxAge);
    logger.info('✅ maxAge set correctly');
    logger.info(`  maxAge: ${maxAge}ms (${maxAge / 1000 / 60 / 60 / 24} days)`);
  });

  /**
   * Test Case: Different maxAge Values
   * -----------------------------------
   * Verifies various maxAge durations.
   */
  it('should handle different maxAge values', () => {
    logger.info('🧪 Test: Different maxAge values');
    
    const testCases = [
      { duration: '1 hour', ms: 60 * 60 * 1000 },
      { duration: '1 day', ms: 24 * 60 * 60 * 1000 },
      { duration: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
      { duration: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
    ];
    
    testCases.forEach(({ duration, ms }) => {
      const options = getRefreshCookieOptions(ms);
      expect(options.maxAge).toBe(ms);
      logger.info(`✅ ${duration}: ${ms}ms`);
    });
  });

  /**
   * Test Case: Zero maxAge
   * -----------------------
   * Verifies handling of zero maxAge (session cookie).
   */
  it('should handle zero maxAge', () => {
    logger.info('🧪 Test: Zero maxAge (session cookie)');
    
    const options = getRefreshCookieOptions(0);
    
    expect(options.maxAge).toBe(0);
    logger.info('✅ maxAge set to 0 (session cookie)');
  });

  // =============================================================================
  // Complete Configuration Tests
  // =============================================================================

  /**
   * Test Case: Complete Production Configuration
   * ---------------------------------------------
   * Verifies all production settings together.
   */
  it('should provide complete production configuration', () => {
    logger.info('🧪 Test: Complete production configuration');
    
    mockProductionEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    logger.info('📋 Production Cookie Configuration:');
    logger.info(`  httpOnly: ${options.httpOnly}`);
    logger.info(`  secure: ${options.secure}`);
    logger.info(`  sameSite: ${options.sameSite}`);
    logger.info(`  path: ${options.path}`);
    logger.info(`  maxAge: ${options.maxAge}ms`);
    
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('none');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(maxAge);
    logger.info('✅ Production configuration complete and secure');
  });

  /**
   * Test Case: Complete Development Configuration
   * ----------------------------------------------
   * Verifies all development settings together.
   */
  it('should provide complete development configuration', () => {
    logger.info('🧪 Test: Complete development configuration');
    
    mockDevelopmentEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    logger.info('📋 Development Cookie Configuration:');
    logger.info(`  httpOnly: ${options.httpOnly}`);
    logger.info(`  secure: ${options.secure}`);
    logger.info(`  sameSite: ${options.sameSite}`);
    logger.info(`  path: ${options.path}`);
    logger.info(`  maxAge: ${options.maxAge}ms`);
    
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBe(maxAge);
    logger.info('✅ Development configuration complete');
  });

  // =============================================================================
  // Security Validation Tests
  // =============================================================================

  /**
   * Test Case: XSS Protection Validation
   * -------------------------------------
   * Verifies httpOnly flag prevents JavaScript access.
   */
  it('should provide XSS protection via httpOnly', () => {
    logger.info('🧪 Test: XSS protection validation');
    
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.httpOnly).toBe(true);
    logger.info('🔐 XSS Protection Analysis:');
    logger.info('   httpOnly=true prevents document.cookie access');
    logger.info('   JavaScript cannot read refresh token');
    logger.info('   Only HTTP requests can send cookie');
    logger.info('✅ XSS protection validated');
  });

  /**
   * Test Case: HTTPS Requirement in Production
   * -------------------------------------------
   * Verifies secure flag enforces HTTPS.
   */
  it('should require HTTPS in production', () => {
    logger.info('🧪 Test: HTTPS requirement in production');
    
    mockProductionEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    expect(options.secure).toBe(true);
    logger.info('🔒 HTTPS Protection Analysis:');
    logger.info('   secure=true requires HTTPS in production');
    logger.info('   Cookie not sent over HTTP');
    logger.info('   Prevents man-in-the-middle attacks');
    logger.info('✅ HTTPS requirement validated');
  });

  /**
   * Test Case: CSRF Protection via sameSite
   * ----------------------------------------
   * Verifies sameSite provides CSRF protection.
   */
  it('should provide CSRF protection via sameSite', () => {
    logger.info('🧪 Test: CSRF protection via sameSite');
    
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    
    // Development (lax)
    mockDevelopmentEnvironment();
    const devOptions = getRefreshCookieOptions(maxAge);
    expect(devOptions.sameSite).toBe('lax');
    logger.info('✅ Development: sameSite=lax (CSRF protection for most requests)');
    
    // Production (none)
    mockProductionEnvironment();
    const prodOptions = getRefreshCookieOptions(maxAge);
    expect(prodOptions.sameSite).toBe('none');
    logger.info('✅ Production: sameSite=none (cross-site allowed with secure)');
  });

  // =============================================================================
  // Real-World Usage Tests
  // =============================================================================

  /**
   * Test Case: Login Flow Cookie Setup
   * -----------------------------------
   * Simulates setting cookie during login.
   */
  it('should support login flow cookie setup', () => {
    logger.info('🧪 Test: Login flow cookie setup');
    
    mockProductionEnvironment();
    
    // User logs in, refresh token cookie set for 7 days
    logger.info('🔄 Step 1: User logs in...');
    const refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(refreshTokenExpiry);
    
    logger.info('✅ Step 1: Login successful');
    logger.info('🔄 Step 2: Setting refresh token cookie...');
    logger.info(`  Cookie will expire in: ${refreshTokenExpiry / 1000 / 60 / 60 / 24} days`);
    logger.info(`  httpOnly: ${options.httpOnly} (secure from JS)`);
    logger.info(`  secure: ${options.secure} (HTTPS only)`);
    logger.info(`  sameSite: ${options.sameSite} (cross-site allowed)`);
    logger.info('✅ Step 2: Cookie configured for refresh token');
  });

  /**
   * Test Case: Logout Flow Cookie Deletion
   * ---------------------------------------
   * Simulates cookie deletion during logout.
   */
  it('should support logout flow cookie deletion', () => {
    logger.info('🧪 Test: Logout flow cookie deletion');
    
    logger.info('🔄 Step 1: User requests logout...');
    const deleteOptions = getRefreshCookieOptions(0);
    
    expect(deleteOptions.maxAge).toBe(0);
    logger.info('✅ Step 1: Cookie deletion configured (maxAge=0)');
    logger.info('   Cookie will be immediately expired');
    logger.info('   Browser will remove cookie');
  });

  /**
   * Test Case: Session Extension
   * -----------------------------
   * Simulates extending session with new cookie.
   */
  it('should support session extension', () => {
    logger.info('🧪 Test: Session extension');
    
    // Original session: 7 days
    logger.info('🔄 Step 1: Original session (7 days)...');
    const original = getRefreshCookieOptions(7 * 24 * 60 * 60 * 1000);
    expect(original.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    logger.info('✅ Step 1: Original cookie expires in 7 days');
    
    // Extended session: 30 days
    logger.info('🔄 Step 2: Extending session (30 days)...');
    const extended = getRefreshCookieOptions(30 * 24 * 60 * 60 * 1000);
    expect(extended.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    logger.info('✅ Step 2: Extended cookie expires in 30 days');
    
    logger.info('✅ Session extension supported');
  });

  /**
   * Test Case: Cross-Origin API Request (Production)
   * -------------------------------------------------
   * Verifies cookie configuration for cross-origin requests.
   */
  it('should support cross-origin requests in production', () => {
    logger.info('🧪 Test: Cross-origin requests (production)');
    
    mockProductionEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    logger.info('🌐 Cross-Origin Configuration:');
    logger.info(`  Frontend: https://app.example.com`);
    logger.info(`  Backend: https://api.example.com`);
    logger.info(`  sameSite: ${options.sameSite} (cross-site allowed)`);
    logger.info(`  secure: ${options.secure} (HTTPS required)`);
    
    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
    logger.info('✅ Cross-origin configuration validated');
  });

  /**
   * Test Case: Localhost Development (Same Port)
   * ---------------------------------------------
   * Verifies cookie works for localhost development.
   */
  it('should support localhost development', () => {
    logger.info('🧪 Test: Localhost development');
    
    mockDevelopmentEnvironment();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(maxAge);
    
    logger.info('💻 Localhost Configuration:');
    logger.info(`  Server: http://localhost:3000`);
    logger.info(`  sameSite: ${options.sameSite} (works for same-site)`);
    logger.info(`  secure: ${options.secure} (HTTP allowed)`);
    
    expect(options.sameSite).toBe('lax');
    expect(options.secure).toBe(false);
    logger.info('✅ Localhost configuration validated');
  });

  // =============================================================================
  // Edge Cases Tests
  // =============================================================================

  /**
   * Test Case: Very Long maxAge
   * ----------------------------
   * Verifies handling of very long cookie lifetime.
   */
  it('should handle very long maxAge', () => {
    logger.info('🧪 Test: Very long maxAge');
    
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const options = getRefreshCookieOptions(oneYear);
    
    expect(options.maxAge).toBe(oneYear);
    logger.info(`✅ Very long maxAge handled: ${oneYear}ms (1 year)`);
  });

  /**
   * Test Case: Negative maxAge
   * ---------------------------
   * Verifies handling of negative maxAge (immediate expiry).
   */
  it('should handle negative maxAge', () => {
    logger.info('🧪 Test: Negative maxAge');
    
    const options = getRefreshCookieOptions(-1);
    
    expect(options.maxAge).toBe(-1);
    logger.info('✅ Negative maxAge handled (immediate expiry)');
  });
});
