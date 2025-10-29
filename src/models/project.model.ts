import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { ProjectAttributes, ProjectCreationAttributes } from '../types/models/project.types';

/**
 * Project Model
 * -------------
 * This model represents client projects in the Vodichron HRMS system.
 * It directly corresponds to the "projects" table schema.
 * Projects are work engagements where employees are allocated to deliver services to customers.
 *
 * Fields:
 * - uuid: Unique identifier for the project record (VARCHAR 40, Primary Key).
 * - name: Name of the project (VARCHAR 100).
 * - domain: Domain/industry of the project (VARCHAR 200, optional).
 * - description: Detailed description of the project (TEXT).
 * - location: Project location/site (VARCHAR 255).
 * - status: Current status of the project (ENUM: INITIATED, IN PROGRESS, COMPLETE, ON HOLD).
 * - createdAt: Timestamp when the project was created.
 * - startDate: Project start date (DATETIME, optional).
 * - endDate: Project end/completion date (DATETIME, optional).
 * - createdBy: User who created the project record (VARCHAR 40).
 * - updatedBy: User who last updated the project record (VARCHAR 40).
 * 
 * Relationships:
 * - Has many Resource Allocations (employees allocated to this project)
 * - Belongs to Customer (through Resource Allocation table)
 */
class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public uuid!: string;                                                    // Unique identifier for the project record.
  public name!: string;                                                    // Name of the project.
  public domain!: string | null;                                           // Domain/industry of the project.
  public description!: string;                                             // Detailed description of the project.
  public location!: string;                                                // Project location/site.
  public status!: 'INITIATED' | 'IN PROGRESS' | 'COMPLETE' | 'ON HOLD';   // Current status of the project.
  public createdAt!: Date;                                                 // Timestamp when the project was created.
  public startDate!: Date | null;                                          // Project start date.
  public endDate!: Date | null;                                            // Project end/completion date.
  public createdBy!: string;                                               // User who created the project record.
  public updatedBy!: string;                                               // User who last updated the project record.
}

Project.init(
  {
    // 'uuid' field: a string (VARCHAR 40) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(40),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'name' field: name of the project.
    // Should be descriptive and unique to identify the project easily.
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],  // Name must be between 2 and 100 characters
      },
      comment: 'Name of the project',
    },
    // 'domain' field: domain or industry vertical of the project.
    // Examples: "Healthcare", "Finance", "E-commerce", "Manufacturing"
    // Optional field as some projects may not have a specific domain classification.
    domain: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Domain/industry of the project',
    },
    // 'description' field: detailed description of the project.
    // Should include project objectives, scope, and key deliverables.
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Detailed description of the project',
    },
    // 'location' field: physical or virtual location where the project is executed.
    // Can be office location, client site, or "Remote".
    location: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Project location/site',
    },
    // 'status' field: current lifecycle status of the project.
    // INITIATED: Project has been created but not yet started
    // IN PROGRESS: Project is actively being worked on
    // COMPLETE: Project has been delivered and closed
    // ON HOLD: Project is temporarily paused
    status: {
      type: DataTypes.ENUM('INITIATED', 'IN PROGRESS', 'COMPLETE', 'ON HOLD'),
      allowNull: false,
      defaultValue: 'INITIATED',
      validate: {
        isIn: [['INITIATED', 'IN PROGRESS', 'COMPLETE', 'ON HOLD']],  // Validate enum values
      },
      comment: 'Current status of the project',
    },
    // 'createdAt' field: stores the timestamp when the project record was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'startDate' field: planned or actual start date of the project.
    // Optional as projects may be created before start date is finalized.
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Project start date',
    },
    // 'endDate' field: planned or actual completion date of the project.
    // Optional as end date may not be known at project initiation.
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Project end/completion date',
    },
    // 'createdBy' field: identifier of the user who created the project record.
    // Typically a project manager or admin UUID.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the project record',
    },
    // 'updatedBy' field: identifier of the user who last updated the project record.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the project record',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'projects',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom field (createdAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['name'],
        name: 'idx_projects_name',
      },
      {
        fields: ['status'],
        name: 'idx_projects_status',
      },
      {
        fields: ['domain'],
        name: 'idx_projects_domain',
      },
      {
        fields: ['startDate'],
        name: 'idx_projects_start_date',
      },
      {
        fields: ['endDate'],
        name: 'idx_projects_end_date',
      },
    ],
  }
);

export default Project;
