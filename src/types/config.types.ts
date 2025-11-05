/**
 * Configuration Type Definitions
 * ==============================
 * 
 * Purpose:
 * Defines TypeScript interfaces and types for application configuration.
 * Ensures type safety across all configuration settings used in the application.
 * 
 * Configuration Domains:
 * - Server: Port, host, environment settings
 * - Security: Session secrets, rate limiting, request size limits
 * - CORS: Cross-Origin Resource Sharing policies
 * - Logging: Log levels, formats, and request logging
 * - API: Versioning and prefix configuration
 * - Database: Connection settings and pool configuration
 * 
 * Usage:
 * These types are imported and used by the config/index.ts module
 * to validate and structure the application configuration loaded from environment variables.
 */

export type NodeEnv = 'development' | 'production' | 'test' | 'staging';

export interface ServerConfig {
  port: number;
  host: string;
  env: string;
}

export interface SecurityConfig {
  sessionSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  maxRequestSize: string;
  enableHelmet: boolean;
  trustedProxies: string[];
}

export interface CorsConfig {
  origin: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export interface LoggingConfig {
  level: string;
  enableRequestLogging: boolean;
  format: string;
}

export interface ApiConfig {
  prefix: string;
  version: string;
}

export interface JwtConfig {
  accessTokenExpiresIn: string;      // e.g., '30m', '1h', '2h'
  refreshTokenMaxAgeMs: number;      // in milliseconds (e.g., 7 days)
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  logging: boolean;
  timezone: string;
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    address: string;
  };
}

export interface AssetConfig {
  path: string;          // Path for storing uploaded assets (e.g., './assets')
  allowUpload: boolean;  // Allow/block uploads for the environment
}

export interface AppConfig {
  server: ServerConfig;
  isDevelopment: boolean;
  isProduction: boolean;
  security: SecurityConfig;
  cors: CorsConfig;
  logging: LoggingConfig;
  api: ApiConfig;
  jwt: JwtConfig;
  db: DatabaseConfig;
  email: EmailConfig;
  frontendUrl: string;
  asset: AssetConfig;
}
