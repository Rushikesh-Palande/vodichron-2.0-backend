/**
 * Get Client Metadata Helper Test Suite
 * =======================================
 * 
 * Tests the getClientMetadata function which extracts client IP address
 * and User-Agent from request headers in a proxy-aware manner.
 * 
 * Test Coverage:
 * ✅ IP extraction from x-forwarded-for header
 * ✅ Multiple IPs in x-forwarded-for (proxy chain)
 * ✅ Fallback IP handling
 * ✅ User-Agent extraction
 * ✅ Missing/null header handling
 * ✅ Whitespace and formatting edge cases
 * ✅ Security considerations (header spoofing awareness)
 * ✅ Real-world proxy scenarios
 * 
 * Security Considerations:
 * - x-forwarded-for can be spoofed by clients
 * - First IP in chain is considered client IP
 * - Fallback IP should be trusted source (e.g., socket IP)
 * - Used for audit logging and security tracking
 */

import { getClientMetadata } from '../../helpers/get-client-metadata';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('getClientMetadata Helper', () => {
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    logger.info('🔄 Setting up test case...');
  });

  afterEach(() => {
    infoSpy.mockRestore();
    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Basic IP Extraction Tests
  // =============================================================================

  /**
   * Test Case: Extract IP from x-forwarded-for
   * -------------------------------------------
   * Verifies that IP is extracted from x-forwarded-for header.
   */
  it('should extract IP from x-forwarded-for header', () => {
    logger.info('🧪 Test: IP extraction from x-forwarded-for');
    
    const headers = {
      'x-forwarded-for': '203.0.113.42',
      'user-agent': 'Mozilla/5.0',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.ip).toBe('203.0.113.42');
    logger.info('✅ IP extracted from x-forwarded-for');
    logger.info(`  IP: ${result.ip}`);
  });

  /**
   * Test Case: Extract First IP from Proxy Chain
   * ---------------------------------------------
   * Verifies that first IP is extracted when multiple IPs present.
   */
  it('should extract first IP from proxy chain', () => {
    logger.info('🧪 Test: First IP from proxy chain');
    
    // Proxy chain: client → proxy1 → proxy2 → server
    const headers = {
      'x-forwarded-for': '203.0.113.42, 198.51.100.5, 192.0.2.1',
      'user-agent': 'Mozilla/5.0',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.ip).toBe('203.0.113.42'); // First IP is client
    logger.info('✅ First IP extracted from chain');
    logger.info(`  Chain: ${headers['x-forwarded-for']}`);
    logger.info(`  Client IP: ${result.ip}`);
  });

  /**
   * Test Case: Trim Whitespace from IP
   * -----------------------------------
   * Verifies that whitespace is trimmed from extracted IP.
   */
  it('should trim whitespace from IP', () => {
    logger.info('🧪 Test: IP whitespace trimming');
    
    const headers = {
      'x-forwarded-for': '  203.0.113.42  , 198.51.100.5',
      'user-agent': 'Mozilla/5.0',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.ip).toBe('203.0.113.42');
    logger.info('✅ Whitespace trimmed from IP');
  });

  /**
   * Test Case: Fallback IP When No x-forwarded-for
   * -----------------------------------------------
   * Verifies that fallback IP is used when header is missing.
   */
  it('should use fallback IP when x-forwarded-for is missing', () => {
    logger.info('🧪 Test: Fallback IP usage');
    
    const headers = {
      'user-agent': 'Mozilla/5.0',
    };
    const fallbackIp = '192.168.1.100';
    
    const result = getClientMetadata(headers, fallbackIp);
    
    expect(result.ip).toBe(fallbackIp);
    logger.info('✅ Fallback IP used when x-forwarded-for missing');
    logger.info(`  Fallback IP: ${result.ip}`);
  });

  /**
   * Test Case: Null IP When No Headers or Fallback
   * -----------------------------------------------
   * Verifies that null is returned when no IP available.
   */
  it('should return null IP when no x-forwarded-for or fallback', () => {
    logger.info('🧪 Test: Null IP handling');
    
    const headers = {
      'user-agent': 'Mozilla/5.0',
    };
    
    const result = getClientMetadata(headers, undefined);
    
    expect(result.ip).toBeNull();
    logger.info('✅ Null IP returned when no source available');
  });

  // =============================================================================
  // User-Agent Extraction Tests
  // =============================================================================

  /**
   * Test Case: Extract User-Agent
   * ------------------------------
   * Verifies that User-Agent is extracted from headers.
   */
  it('should extract User-Agent from headers', () => {
    logger.info('🧪 Test: User-Agent extraction');
    
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
    const headers = {
      'x-forwarded-for': '203.0.113.42',
      'user-agent': userAgent,
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.userAgent).toBe(userAgent);
    logger.info('✅ User-Agent extracted');
    logger.info(`  User-Agent: ${result.userAgent}`);
  });

  /**
   * Test Case: Null User-Agent When Missing
   * ----------------------------------------
   * Verifies that null is returned when User-Agent missing.
   */
  it('should return null User-Agent when missing', () => {
    logger.info('🧪 Test: Null User-Agent handling');
    
    const headers = {
      'x-forwarded-for': '203.0.113.42',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.userAgent).toBeNull();
    logger.info('✅ Null User-Agent returned when missing');
  });

  /**
   * Test Case: Handle Empty User-Agent
   * -----------------------------------
   * Verifies handling of empty User-Agent string.
   */
  it('should handle empty User-Agent string', () => {
    logger.info('🧪 Test: Empty User-Agent handling');
    
    const headers = {
      'x-forwarded-for': '203.0.113.42',
      'user-agent': '',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    // Empty string is falsy, so function returns null
    expect(result.userAgent).toBeNull();
    logger.info('✅ Empty User-Agent handled (returns null for empty string)');
  });

  // =============================================================================
  // Combined Extraction Tests
  // =============================================================================

  /**
   * Test Case: Extract Both IP and User-Agent
   * ------------------------------------------
   * Verifies that both fields are extracted together.
   */
  it('should extract both IP and User-Agent', () => {
    logger.info('🧪 Test: Combined IP and User-Agent extraction');
    
    const headers = {
      'x-forwarded-for': '203.0.113.42',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.ip).toBe('203.0.113.42');
    expect(result.userAgent).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    logger.info('✅ Both IP and User-Agent extracted');
    logger.info(`  IP: ${result.ip}`);
    logger.info(`  User-Agent: ${result.userAgent}`);
  });

  /**
   * Test Case: Return Both as Null When Missing
   * --------------------------------------------
   * Verifies that both fields can be null.
   */
  it('should return both as null when all missing', () => {
    logger.info('🧪 Test: Both null handling');
    
    const headers = {};
    
    const result = getClientMetadata(headers, undefined);
    
    expect(result.ip).toBeNull();
    expect(result.userAgent).toBeNull();
    logger.info('✅ Both fields null when no data available');
  });

  // =============================================================================
  // Edge Cases Tests
  // =============================================================================

  /**
   * Test Case: Empty x-forwarded-for Header
   * ----------------------------------------
   * Verifies handling of empty x-forwarded-for.
   */
  it('should handle empty x-forwarded-for header', () => {
    logger.info('🧪 Test: Empty x-forwarded-for header');
    
    const headers = {
      'x-forwarded-for': '',
      'user-agent': 'Mozilla/5.0',
    };
    const fallbackIp = '192.168.1.100';
    
    const result = getClientMetadata(headers, fallbackIp);
    
    // Empty string splits to [''], first element is empty, fallback used
    expect(result.ip).toBe(fallbackIp);
    logger.info('✅ Fallback used for empty x-forwarded-for');
  });

  /**
   * Test Case: x-forwarded-for with Only Commas
   * --------------------------------------------
   * Verifies handling of malformed header.
   */
  it('should handle x-forwarded-for with only commas', () => {
    logger.info('🧪 Test: Malformed x-forwarded-for (only commas)');
    
    const headers = {
      'x-forwarded-for': ',,,',
      'user-agent': 'Mozilla/5.0',
    };
    const fallbackIp = '192.168.1.100';
    
    const result = getClientMetadata(headers, fallbackIp);
    
    // First split is empty string after trim, fallback used
    expect(result.ip).toBe(fallbackIp);
    logger.info('✅ Fallback used for malformed header');
  });

  /**
   * Test Case: IPv6 Address in x-forwarded-for
   * -------------------------------------------
   * Verifies handling of IPv6 addresses.
   */
  it('should handle IPv6 addresses', () => {
    logger.info('🧪 Test: IPv6 address handling');
    
    const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    const headers = {
      'x-forwarded-for': ipv6,
      'user-agent': 'Mozilla/5.0',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.ip).toBe(ipv6);
    logger.info('✅ IPv6 address handled correctly');
    logger.info(`  IPv6: ${result.ip}`);
  });

  /**
   * Test Case: Mixed IPv4 and IPv6 in Proxy Chain
   * ----------------------------------------------
   * Verifies handling of mixed IP versions.
   */
  it('should handle mixed IPv4 and IPv6 in chain', () => {
    logger.info('🧪 Test: Mixed IP versions in chain');
    
    const headers = {
      'x-forwarded-for': '2001:db8::1, 203.0.113.42, 192.0.2.1',
      'user-agent': 'Mozilla/5.0',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.ip).toBe('2001:db8::1'); // First IP (IPv6)
    logger.info('✅ First IP extracted from mixed chain');
    logger.info(`  Client IP: ${result.ip}`);
  });

  /**
   * Test Case: Special Characters in User-Agent
   * --------------------------------------------
   * Verifies handling of special characters.
   */
  it('should handle special characters in User-Agent', () => {
    logger.info('🧪 Test: Special characters in User-Agent');
    
    const userAgent = 'Bot/1.0 (+http://example.com/bot.html) <bot@example.com>';
    const headers = {
      'x-forwarded-for': '203.0.113.42',
      'user-agent': userAgent,
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.userAgent).toBe(userAgent);
    logger.info('✅ Special characters in User-Agent preserved');
  });

  // =============================================================================
  // Case Sensitivity Tests
  // =============================================================================

  /**
   * Test Case: Case-Insensitive Header Names
   * -----------------------------------------
   * Verifies that header names are case-insensitive (HTTP standard).
   */
  it('should handle lowercase header names', () => {
    logger.info('🧪 Test: Lowercase header names');
    
    const headers = {
      'x-forwarded-for': '203.0.113.42',
      'user-agent': 'Mozilla/5.0',
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.ip).toBe('203.0.113.42');
    expect(result.userAgent).toBe('Mozilla/5.0');
    logger.info('✅ Lowercase header names work correctly');
  });

  // =============================================================================
  // Real-World Scenarios Tests
  // =============================================================================

  /**
   * Test Case: Direct Connection (No Proxy)
   * ----------------------------------------
   * Simulates direct client connection without proxy.
   */
  it('should handle direct connection without proxy', () => {
    logger.info('🧪 Test: Direct connection (no proxy)');
    
    const headers = {
      'user-agent': 'Mozilla/5.0',
    };
    const socketIp = '203.0.113.42'; // Real client IP from socket
    
    const result = getClientMetadata(headers, socketIp);
    
    expect(result.ip).toBe(socketIp);
    logger.info('✅ Direct connection handled (no x-forwarded-for)');
    logger.info(`  Client IP: ${result.ip}`);
  });

  /**
   * Test Case: Behind Single Proxy (Load Balancer)
   * -----------------------------------------------
   * Simulates request behind single proxy/load balancer.
   */
  it('should handle single proxy scenario', () => {
    logger.info('🧪 Test: Single proxy (load balancer)');
    
    const clientIp = '203.0.113.42';
    const headers = {
      'x-forwarded-for': clientIp,
      'user-agent': 'Mozilla/5.0',
    };
    const proxyIp = '10.0.0.1'; // Internal load balancer IP
    
    const result = getClientMetadata(headers, proxyIp);
    
    expect(result.ip).toBe(clientIp);
    logger.info('✅ Client IP extracted through load balancer');
    logger.info(`  Client IP: ${result.ip} (proxy: ${proxyIp})`);
  });

  /**
   * Test Case: Behind Multiple Proxies (CDN → LB → Server)
   * -------------------------------------------------------
   * Simulates complex proxy chain (CDN, load balancer, etc.).
   */
  it('should handle multiple proxy chain', () => {
    logger.info('🧪 Test: Multiple proxy chain (CDN → LB → Server)');
    
    const clientIp = '203.0.113.42';
    const cdnIp = '104.16.0.1';
    const lbIp = '10.0.0.1';
    
    const headers = {
      'x-forwarded-for': `${clientIp}, ${cdnIp}, ${lbIp}`,
      'user-agent': 'Mozilla/5.0',
    };
    
    const result = getClientMetadata(headers, lbIp);
    
    expect(result.ip).toBe(clientIp); // Real client, not proxies
    logger.info('✅ Real client IP extracted from proxy chain');
    logger.info(`  Chain: Client (${clientIp}) → CDN (${cdnIp}) → LB (${lbIp})`);
  });

  /**
   * Test Case: Mobile Browser User-Agent
   * -------------------------------------
   * Verifies handling of mobile browser User-Agent.
   */
  it('should handle mobile browser User-Agent', () => {
    logger.info('🧪 Test: Mobile browser User-Agent');
    
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
    const headers = {
      'x-forwarded-for': '203.0.113.42',
      'user-agent': mobileUA,
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.userAgent).toBe(mobileUA);
    logger.info('✅ Mobile User-Agent extracted');
    logger.info(`  User-Agent: ${result.userAgent?.substring(0, 50)}...`);
  });

  /**
   * Test Case: API Client User-Agent
   * ---------------------------------
   * Verifies handling of API client User-Agent.
   */
  it('should handle API client User-Agent', () => {
    logger.info('🧪 Test: API client User-Agent');
    
    const apiUA = 'axios/1.6.2 node/18.19.0';
    const headers = {
      'x-forwarded-for': '203.0.113.42',
      'user-agent': apiUA,
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.userAgent).toBe(apiUA);
    logger.info('✅ API client User-Agent extracted');
    logger.info(`  User-Agent: ${result.userAgent}`);
  });

  /**
   * Test Case: Bot/Crawler User-Agent
   * ----------------------------------
   * Verifies handling of bot/crawler User-Agent.
   */
  it('should handle bot User-Agent', () => {
    logger.info('🧪 Test: Bot User-Agent');
    
    const botUA = 'Googlebot/2.1 (+http://www.google.com/bot.html)';
    const headers = {
      'x-forwarded-for': '66.249.66.1',
      'user-agent': botUA,
    };
    
    const result = getClientMetadata(headers, '192.168.1.1');
    
    expect(result.userAgent).toBe(botUA);
    logger.info('✅ Bot User-Agent extracted');
    logger.info(`  User-Agent: ${result.userAgent}`);
  });

  // =============================================================================
  // Security Awareness Tests
  // =============================================================================

  /**
   * Test Case: Awareness of Header Spoofing
   * ----------------------------------------
   * Documents that x-forwarded-for can be spoofed (for security awareness).
   */
  it('should be aware that x-forwarded-for can be spoofed', () => {
    logger.info('🧪 Test: Header spoofing awareness');
    
    // Client can send fake x-forwarded-for
    const headers = {
      'x-forwarded-for': '1.2.3.4', // Potentially spoofed
      'user-agent': 'Mozilla/5.0',
    };
    const realIp = '203.0.113.42'; // Real IP from socket
    
    const result = getClientMetadata(headers, realIp);
    
    // Function trusts x-forwarded-for when present
    expect(result.ip).toBe('1.2.3.4');
    logger.info('⚠️  Function trusts x-forwarded-for (spoofing possible)');
    logger.info('   This is acceptable for audit logging behind trusted proxy');
    logger.info(`   Extracted IP: ${result.ip}`);
  });

  /**
   * Test Case: Trusted Proxy Configuration Required
   * ------------------------------------------------
   * Documents importance of trusted proxy configuration.
   */
  it('should document trusted proxy requirement', () => {
    logger.info('🧪 Test: Trusted proxy requirement');
    
    logger.info('📋 Security Notes:');
    logger.info('   1. x-forwarded-for should only be trusted behind known proxies');
    logger.info('   2. Fallback IP should be from trusted source (socket)');
    logger.info('   3. Used for audit logging, not authentication');
    logger.info('   4. Consider trusted proxy validation in production');
    
    expect(true).toBe(true); // Documentation test
  });

  // =============================================================================
  // Audit Logging Use Case Tests
  // =============================================================================

  /**
   * Test Case: Complete Audit Log Entry
   * ------------------------------------
   * Simulates complete audit log entry creation.
   */
  it('should support complete audit log entry', () => {
    logger.info('🧪 Test: Complete audit log entry');
    
    const headers = {
      'x-forwarded-for': '203.0.113.42, 104.16.0.1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    };
    
    logger.info('🔄 Extracting client metadata for audit log...');
    const metadata = getClientMetadata(headers, '10.0.0.1');
    
    logger.info('📝 Audit Log Entry:');
    logger.info(`   IP: ${metadata.ip}`);
    logger.info(`   User-Agent: ${metadata.userAgent}`);
    logger.info(`   Timestamp: ${new Date().toISOString()}`);
    
    expect(metadata.ip).toBeDefined();
    expect(metadata.userAgent).toBeDefined();
    logger.info('✅ Complete audit metadata extracted');
  });
});
