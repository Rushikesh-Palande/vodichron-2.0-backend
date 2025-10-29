/**
 * Session Model Types
 * ===================
 * Strongly-typed interfaces for the `sessions` table used to persist
 * refresh-session state for authenticated subjects.
 */

export interface SessionAttributes {
  uuid: string;                               // Primary key (UUID v4)
  subjectId: string;                          // application_users.uuid (employee) OR customers.uuid (customer)
  subjectType: 'employee' | 'customer';       // Subject discriminator
  tokenHash: string;                          // SHA-256 hash of the refresh token
  userAgent: string | null;                   // Client User-Agent string
  ipAddress: string | null;                   // Client IP address
  expiresAt: Date;                            // Refresh expiry timestamp
  createdAt: Date;                            // Creation timestamp
  revokedAt: Date | null;                     // Revocation timestamp (null if active)
}

export type SessionCreationAttributes = Omit<
  SessionAttributes,
  'uuid' | 'createdAt' | 'revokedAt'
> & {
  uuid?: string;
  createdAt?: Date;
  revokedAt?: Date | null;
};
