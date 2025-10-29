import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database';
import { SurveyResultAttributes, SurveyResultCreationAttributes } from '../types/models/survey-result.types';

/**
 * Survey Result Model
 * -------------------
 * This model represents survey responses submitted by employees in the Vodichron HRMS system.
 * It directly corresponds to the "employee_survey_results" table schema.
 * Stores completed survey responses with answers and comments.
 *
 * Fields:
 * - uuid: Unique identifier for the survey result (VARCHAR 50, Primary Key).
 * - employeeId: Foreign key referencing the employees table (VARCHAR 50).
 * - surveyId: Foreign key referencing the survey_config table (VARCHAR 50).
 * - surveyResult: JSON containing all survey answers.
 * - generalComment: Optional text comment from the respondent (TEXT).
 * - createdAt: Timestamp when the survey was submitted.
 * - createdBy: User who submitted the survey (VARCHAR 40).
 * 
 * Relationships:
 * - Belongs to Employee (survey respondent)
 * - Belongs to Survey Config (the survey template)
 */
class SurveyResult extends Model<SurveyResultAttributes, SurveyResultCreationAttributes> implements SurveyResultAttributes {
  public uuid!: string;                // Unique identifier for the survey result.
  public employeeId!: string;          // Foreign key referencing the employees table.
  public surveyId!: string;            // Foreign key referencing the survey_config table.
  public surveyResult!: any;           // JSON containing all survey answers.
  public generalComment!: string | null; // Optional text comment from the respondent.
  public createdAt!: Date;             // Timestamp when the survey was submitted.
  public createdBy!: string;           // User who submitted the survey.
}

SurveyResult.init(
  {
    // 'uuid' field: a string (VARCHAR 50) that serves as the primary key.
    // Automatically generated using UUID v4 if not provided.
    uuid: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => uuidv4(),
    },
    // 'employeeId' field: foreign key referencing the employees table.
    // Identifies who submitted the survey response.
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'employees',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete results when employee is deleted.
      onUpdate: 'CASCADE',  // Update employeeId when employee uuid changes.
      comment: 'Foreign key referencing the employee who submitted the survey',
    },
    // 'surveyId' field: foreign key referencing the survey_config table.
    // Links the response to the specific survey template.
    surveyId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'survey_config',
        key: 'uuid',
      },
      onDelete: 'CASCADE',  // Delete results when survey config is deleted.
      onUpdate: 'CASCADE',  // Update surveyId when survey config uuid changes.
      comment: 'Foreign key referencing the survey configuration',
    },
    // 'surveyResult' field: JSON containing all survey answers.
    // Structure matches the formDetails from survey_config.
    // Example: {"question1": "answer1", "question2": "answer2"}
    surveyResult: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON containing all survey answers',
    },
    // 'generalComment' field: optional free-text comment from respondent.
    // Allows employees to provide additional feedback not covered by survey questions.
    generalComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional text comment from the respondent',
    },
    // 'createdAt' field: stores the timestamp when the survey was submitted.
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // 'createdBy' field: identifier of the user who submitted the survey.
    // Typically same as employeeId for employee surveys.
    createdBy: {
      type: DataTypes.STRING(40),
      allowNull: false,
      comment: 'User who submitted the survey',
    },
  },
  {
    // Specify the table name in the database for this model.
    tableName: 'employee_survey_results',
    // Pass the Sequelize instance that connects to the database.
    sequelize,
    // Disable Sequelize's automatic timestamp fields (createdAt, updatedAt)
    // since we're using custom field (createdAt).
    timestamps: false,
    // Add indexes for better query performance
    indexes: [
      {
        fields: ['employeeId'],
        name: 'idx_survey_results_employee_id',
      },
      {
        fields: ['surveyId'],
        name: 'idx_survey_results_survey_id',
      },
      {
        fields: ['surveyId', 'employeeId'],
        name: 'idx_survey_results_survey_employee',
        unique: true,  // Prevent duplicate submissions
      },
    ],
  }
);

export default SurveyResult;
