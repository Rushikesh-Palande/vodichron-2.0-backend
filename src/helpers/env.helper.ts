import { logger } from '../utils/logger';

/**
 * Environment Variable Helper Functions
 * ------------------------------------
 * 
 * This module provides type-safe environment variable access with:
 * - Required vs optional variable handling
 * - Default value support
 * - Type conversion (string, number, boolean, array)
 * - Validation and range checking
 * - Clear error messages for missing/invalid values
 * 
 * Benefits:
 * - Fail-fast on startup if required config is missing
 * - Type-safe configuration values
 * - Consistent error handling
 * - Prevents runtime errors from misconfiguration
 */

/**
 * Get String Environment Variable
 * ------------------------------
 * Retrieves a string environment variable with optional validation
 * 
 * @param key - Environment variable name
 * @param required - If true, exits process if variable is missing
 * @param defaultValue - Default value if variable is not set
 * @returns The environment variable value or default
 * @throws Process exits with code 1 if required variable is missing
 * 
 * @example
 * const host = getEnvVariable('DB_HOST'); // Required
 * const port = getEnvVariable('PORT', false, '3000'); // Optional with default
 */
export function getEnvVariable(key: string, required: boolean = true, defaultValue?: string): string {
  const value = process.env[key];
  
  if (!value) {
    if (required) {
      logger.error(`❌ Missing required environment variable: ${key}`);
      logger.info(`💡 Set ${key} in your .env file or environment`);
      process.exit(1);
    }
    if (defaultValue !== undefined) return defaultValue;
    return '';
  }
  
  return value;
}

/**
 * Get Number Environment Variable
 * ------------------------------
 * Retrieves and validates a numeric environment variable
 * 
 * @param key - Environment variable name
 * @param defaultValue - Default value if variable is not set
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns The parsed number value
 * @throws Process exits with code 1 if value is invalid or out of range
 * 
 * @example
 * const port = getEnvNumber('PORT', 3000, 1024, 65535);
 * const poolSize = getEnvNumber('DB_POOL_MAX', 10, 1, 100);
 */
export function getEnvNumber(key: string, defaultValue: number, min?: number, max?: number): number {
  const raw = getEnvVariable(key, false, defaultValue.toString());
  const parsed = parseInt(raw, 10);
  
  // Validate it's a number
  if (Number.isNaN(parsed)) {
    logger.error(`❌ Invalid number for ${key}: "${raw}"`);
    logger.info(`💡 ${key} must be a valid integer`);
    process.exit(1);
  }
  
  // Validate minimum value
  if (min !== undefined && parsed < min) {
    logger.error(`❌ ${key} must be >= ${min} (got: ${parsed})`);
    process.exit(1);
  }
  
  // Validate maximum value
  if (max !== undefined && parsed > max) {
    logger.error(`❌ ${key} must be <= ${max} (got: ${parsed})`);
    process.exit(1);
  }
  
  return parsed;
}

/**
 * Get Boolean Environment Variable
 * -------------------------------
 * Retrieves a boolean environment variable
 * 
 * @param key - Environment variable name
 * @param defaultValue - Default value if variable is not set
 * @returns Boolean value (case-insensitive "true" returns true)
 * 
 * @example
 * const enableLogging = getEnvBoolean('ENABLE_LOGGING', true);
 * const isProduction = getEnvBoolean('IS_PRODUCTION', false);
 */
export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const raw = getEnvVariable(key, false, defaultValue.toString());
  return raw.toLowerCase() === 'true';
}

/**
 * Get Array Environment Variable
 * -----------------------------
 * Retrieves and parses a comma-separated environment variable into an array
 * 
 * @param key - Environment variable name
 * @param defaultValue - Default array if variable is not set
 * @returns Array of trimmed, non-empty strings
 * 
 * @example
 * const origins = getEnvArray('CORS_ORIGIN', ['http://localhost:3000']);
 * // With env: CORS_ORIGIN="http://localhost:3000, http://example.com"
 * // Returns: ['http://localhost:3000', 'http://example.com']
 */
export function getEnvArray(key: string, defaultValue: string[]): string[] {
  const raw = getEnvVariable(key, false, defaultValue.join(','));
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
