import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { SessionAttributes, SessionCreationAttributes } from '../types/models/session.types';

/**
 * Session Model
 * =============
 * This model persists refresh sessions for authenticated subjects in the
 * Vodichron HRMS system.
 *
 * Table: sessions
 * Fields:
 * - uuid: Primary key (VARCHAR 50), defaults to UUID v4
 * - subjectId: application_users.uuid (employee) OR customers.uuid (customer)
 * - subjectType: Subject discriminator (ENUM: employee, customer)
 * - tokenHash: SHA-256 hash of the refresh token (store hash, not raw token)
 * - userAgent: Client user-agent for audit logging
 * - ipAddress: Client IP for audit logging
 * - expiresAt: Refresh token expiry timestamp
 * - createdAt: Record creation timestamp
 * - revokedAt: Revocation timestamp (null if active)
 */
class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public uuid!: string;
  public subjectId!: string;
  public subjectType!: 'employee' | 'customer';
  public tokenHash!: string;
  public userAgent!: string | null;
  public ipAddress!: string | null;
  public expiresAt!: Date;
  public createdAt!: Date;
  public revokedAt!: Date | null;
}

Session.init(
  {
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    subjectId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'application_users.uuid (employee) OR customers.uuid (customer)',
    },
    subjectType: {
      type: DataTypes.ENUM('employee', 'customer'),
      allowNull: false,
      comment: 'Subject discriminator',
    },
    tokenHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: 'SHA-256 hash of refresh token',
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Client User-Agent',
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Client IP Address',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Refresh expiry timestamp',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Revocation timestamp, null if active',
    },
  },
  {
    tableName: 'sessions',
    sequelize,
    timestamps: false,
    indexes: [
      { fields: ['subjectId'], name: 'idx_sessions_subject' },
      { fields: ['tokenHash'], name: 'idx_sessions_token_hash', unique: true },
      { fields: ['expiresAt'], name: 'idx_sessions_expires' },
    ],
  }
);

export default Session;
