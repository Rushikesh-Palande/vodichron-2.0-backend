import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { EmployeeDocumentAttributes, EmployeeDocumentCreationAttributes } from '../types/models/employee-document.types';

/**
 * Employee Document Model
 * ----------------------
 * This model represents employee documents and files in the Vodichron HRMS system.
 * It directly corresponds to the "employee_docs" table schema.
 * Used for managing employee-submitted documents requiring HR approval.
 *
 * Fields:
 * - uuid: Unique identifier for the document record (VARCHAR 50, Primary Key).
 * - employeeId: Foreign key referencing the employees table (VARCHAR 50).
 * - documentType: Type/category of the document (VARCHAR 50).
 * - fileName: Name of the uploaded file (VARCHAR 100).
 * - hrApprovalStatus: Current approval status (ENUM: REQUESTED, APPROVED, REJECTED).
 * - hrApproverId: User ID of HR personnel who approved/rejected (VARCHAR 50).
 * - hrApprovalDate: Date when HR approval decision was made (DATE).
 * - hrApproverComments: HR personnel comments on approval/rejection (TEXT).
 * - createdAt: Timestamp when the document was uploaded.
 * - createdBy: User who uploaded the document (VARCHAR 40).
 * - updatedAt: Timestamp when the document record was last updated.
 * - updatedBy: User who last updated the document record (VARCHAR 40).
 * 
 * Use Cases:
 * - Document submission and approval workflow
 * - HR verification of employee documents
 * - Document audit trail
 */
class EmployeeDocument extends Model<EmployeeDocumentAttributes, EmployeeDocumentCreationAttributes> implements EmployeeDocumentAttributes {
  public uuid!: string;                                           // Unique identifier for the document record.
  public employeeId!: string;                                     // Foreign key referencing the employees table.
  public documentType!: string;                                   // Type/category of the document.
  public fileName!: string;                                       // Name of the uploaded file.
  public hrApprovalStatus!: 'REQUESTED' | 'APPROVED' | 'REJECTED'; // Current approval status.
  public hrApproverId!: string | null;                            // User ID of HR personnel who approved/rejected.
  public hrApprovalDate!: Date | null;                            // Date when HR approval decision was made.
  public hrApproverComments!: string | null;                      // HR personnel comments on approval/rejection.
  public createdAt!: Date;                                        // Timestamp when the document was uploaded.
  public createdBy!: string;                                      // User who uploaded the document.
  public updatedAt!: Date | null;                                 // Timestamp when the document record was last updated.
  public updatedBy!: string;                                      // User who last updated the document record.
}

EmployeeDocument.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table.
    // Links the document to a specific employee.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete documents when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing the employee',
    },
    // 'documentType' field: type or category of the document.
    // Examples: "Resume", "ID Proof", "Address Proof", "Educational Certificate"
    documentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Type/category of the document',
    },
    // 'fileName' field: name of the uploaded file.
    // Should include the file extension for proper identification.
    fileName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Name of the uploaded file',
    },
    // 'hrApprovalStatus' field: current status of HR approval.
    // REQUESTED: Document submitted, awaiting HR review
    // APPROVED: Document verified and approved by HR
    // REJECTED: Document rejected by HR (may need re-submission)
    hrApprovalStatus: {
      type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'REQUESTED',
      validate: {
        isIn: [['REQUESTED', 'APPROVED', 'REJECTED']],
      },
      comment: 'Current HR approval status of the document',
    },
    // 'hrApproverId' field: identifier of the HR personnel who reviewed the document.
    // Null until document is reviewed by HR.
    hrApproverId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'User ID of HR personnel who approved/rejected the document',
    },
    // 'hrApprovalDate' field: date when the HR approval decision was made.
    // Null until document is reviewed.
    hrApprovalDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when HR approval decision was made',
    },
    // 'hrApproverComments' field: comments or feedback from HR approver.
    // Used to provide reasons for rejection or additional notes.
    hrApproverComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'HR personnel comments on approval/rejection',
    },
    // 'createdAt' field: stores the timestamp when the document was uploaded.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who uploaded the document.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who uploaded the document',
    },
    // 'updatedAt' field: stores the timestamp when the document record was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // 'updatedBy' field: identifier of the user who last updated the document record.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who last updated the document record',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_docs',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_employee_docs_employee_id',
      },
      {
        fields: ['hrApprovalStatus'],
        name: 'idx_employee_docs_hr_approval_status',
      },
      {
        fields: ['documentType'],
        name: 'idx_employee_docs_document_type',
      },
    ],
  }
);

export default EmployeeDocument;
