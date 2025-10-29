import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { SurveyConfigAttributes, SurveyConfigCreationAttributes } from '../types/models/survey-config.types';

/**
 * Survey Config Model
 * -------------------
 * This model represents survey configurations in the Vodichron HRMS system.
 * It directly corresponds to the "survey_config" table schema.
 * Used for creating and managing employee and customer feedback surveys.
 *
 * Fields:
 * - uuid: Unique identifier for the survey configuration (VARCHAR 50, Primary Key).
 * - surveyType: Type of survey (ENUM: EMPLOYEE, CUSTOMER).
 * - surveyTitle: Title/name of the survey (VARCHAR 50).
 * - startDate: Survey start date (DATE, optional).
 * - endDate: Survey end date (DATE, optional).
 * - formDetails: JSON containing survey questions and form structure.
 * - recipientEmails: JSON array of email addresses to send survey to.
 * - createdAt: Timestamp when the survey was created.
 * - createdBy: User who created the survey (VARCHAR 40).
 * - updatedBy: User who last updated the survey (VARCHAR 40).
 * - updatedAt: Timestamp when the survey was last updated.
 * 
 * Use Cases:
 * - Employee satisfaction surveys
 * - Customer feedback collection
 * - Performance review questionnaires
 * - Exit interviews
 */
class SurveyConfig extends Model<SurveyConfigAttributes, SurveyConfigCreationAttributes> implements SurveyConfigAttributes {
  public uuid!: string;                      // Unique identifier for the survey configuration.
  public surveyType!: 'EMPLOYEE' | 'CUSTOMER'; // Type of survey (employee or customer).
  public surveyTitle!: string;               // Title/name of the survey.
  public startDate!: Date | null;            // Survey start date.
  public endDate!: Date | null;              // Survey end date.
  public formDetails!: any;                  // JSON containing survey questions and form structure.
  public recipientEmails!: any;              // JSON array of email addresses to send survey to.
  public createdAt!: Date;                   // Timestamp when the survey was created.
  public createdBy!: string;                 // User who created the survey.
  public updatedBy!: string | null;          // User who last updated the survey.
  public updatedAt!: Date | null;            // Timestamp when the survey was last updated.
}

SurveyConfig.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'surveyType' field: type of survey being conducted.
    // EMPLOYEE: Internal employee surveys (satisfaction, engagement, etc.)
    // CUSTOMER: External customer feedback surveys
    surveyType: {
      type: DataTypes.ENUM('EMPLOYEE', 'CUSTOMER'),
      allowNull: false,
      validate: {
        isIn: [['EMPLOYEE', 'CUSTOMER']],
      },
      comment: 'Type of survey (employee or customer)',
    },
    // 'surveyTitle' field: title or name of the survey.
    // Should be descriptive of the survey's purpose.
    surveyTitle: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      comment: 'Title/name of the survey',
    },
    // 'startDate' field: date when the survey becomes available.
    // Optional - survey can be created without immediate activation.
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Survey start date',
    },
    // 'endDate' field: date when the survey closes.
    // Optional - survey can remain open indefinitely.
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Survey end date',
    },
    // 'formDetails' field: JSON containing survey structure.
    // Includes questions, question types, options, validations, etc.
    formDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON containing survey questions and form structure',
    },
    // 'recipientEmails' field: JSON array of target recipient emails.
    // Can include specific employees or customer contacts.
    recipientEmails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of email addresses to send survey to',
    },
    // 'createdAt' field: stores the timestamp when the survey was created.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who created the survey.
    // Typically HR or management personnel.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who created the survey',
    },
    // 'updatedBy' field: identifier of the user who last updated the survey.
    updatedBy: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: 'User who last updated the survey',
    },
    // 'updatedAt' field: stores the timestamp when the survey was last updated.
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'survey_config',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom fields (createdAt, updatedAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['surveyType'],
        name: 'idx_survey_config_survey_type',
      },
      {
        fields: ['startDate', 'endDate'],
        name: 'idx_survey_config_dates',
      },
    ],
  }
);

export default SurveyConfig;
