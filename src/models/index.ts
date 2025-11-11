/**
 * Models Index
 * ------------
 * This file imports and exports all models for the Vodichron HRMS system.
 * It ensures that all models are registered with Sequelize and defines relationships between models.
 */

import { logger, PerformanceTimer } from '../utils/logger';

logger.info('📦 Loading models and establishing relationships...');
const modelLoadTimer = new PerformanceTimer('modelLoading');

// Import all models
import User from './user.model';
import Employee from './employee.model';
import Leave from './leave.model';
import LeaveAllocation from './leave-allocation.model';
import Timesheet from './timesheet.model';
import WeeklyTimesheet from './weekly-timesheet.model';
import EmployeeDocument from './employee-document.model';
import EmployeeActivity from './employee-activity.model';
import OnlineStatus from './online-status.model';
import PasswordReset from './password-reset.model';
import Holiday from './holiday.model';
import Customer from './customer.model';
import Project from './project.model';
import ResourceAllocation from './resource-allocation.model';
import CustomerAccess from './customer-access.model';
import EmployeePreference from './employee-preference.model';
import MasterData from './master-data.model';
import SurveyConfig from './survey-config.model';
import SurveyResult from './survey-result.model';
import Session from './session.model';
import EmployeeEducationModel from '../modules/employee/models/employee-education.model';
import EmployeeExperienceModel from '../modules/employee/models/employee-experience.model';

logger.debug('✅ All 22 models imported successfully');

/**
 * Define Model Associations
 * -------------------------
 * Establishes relationships between models following business rules:
 * 
 * Employee Relationships:
 * - Employee has one User (one-to-one)
 * - Employee has many Leaves
 * - Employee has many Leave Allocations
 * - Employee has many Timesheets
 * - Employee has many Weekly Timesheets
 * - Employee has many Documents
 * - Employee has many Activities
 * - Employee has one Online Status (one-to-one)
 * - Employee has many Preferences
 * - Employee has many Survey Results
 * - Employee has many Resource Allocations
 * - Employee has many Education Records
 * - Employee has many Experience Records
 * 
 * Customer Relationships:
 * - Customer has many Projects (through Resource Allocation)
 * - Customer has many Resource Allocations
 * - Customer has one Customer Access (one-to-one)
 * 
 * Project Relationships:
 * - Project has many Resource Allocations
 * 
 * Survey Relationships:
 * - Survey Config has many Survey Results
 */

logger.info('🔗 Establishing model relationships and associations...');
const associationTimer = new PerformanceTimer('modelAssociations');

let associationCount = 0;

// User - Employee Relationship (one-to-one)
User.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});

Employee.hasOne(User, {
  foreignKey: 'employeeId',
  as: 'user',
});
associationCount += 2;
logger.debug('  ↔️ User ⟷ Employee (one-to-one)');

// Employee - Leave Relationship (one-to-many)
Employee.hasMany(Leave, {
  foreignKey: 'employeeId',
  as: 'leaves',
});

Leave.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → Leave (one-to-many)');

// Employee - Leave Allocation Relationship (one-to-many)
Employee.hasMany(LeaveAllocation, {
  foreignKey: 'employeeId',
  as: 'leaveAllocations',
});

LeaveAllocation.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → LeaveAllocation (one-to-many)');

// Employee - Timesheet Relationship (one-to-many)
Employee.hasMany(Timesheet, {
  foreignKey: 'employeeId',
  as: 'timesheets',
});

Timesheet.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → Timesheet (one-to-many)');

// Employee - Weekly Timesheet Relationship (one-to-many)
Employee.hasMany(WeeklyTimesheet, {
  foreignKey: 'employeeId',
  as: 'weeklyTimesheets',
});

WeeklyTimesheet.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → WeeklyTimesheet (one-to-many)');

// Employee - Document Relationship (one-to-many)
Employee.hasMany(EmployeeDocument, {
  foreignKey: 'employeeId',
  as: 'documents',
});

EmployeeDocument.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → EmployeeDocument (one-to-many)');

// Employee - Activity Relationship (one-to-many)
Employee.hasMany(EmployeeActivity, {
  foreignKey: 'employeeId',
  as: 'activities',
});

EmployeeActivity.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → EmployeeActivity (one-to-many)');

// Employee - Online Status Relationship (one-to-one)
Employee.hasOne(OnlineStatus, {
  foreignKey: 'employeeId',
  as: 'onlineStatus',
});

OnlineStatus.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee ⟷ OnlineStatus (one-to-one)');

// Employee - Preference Relationship (one-to-many)
Employee.hasMany(EmployeePreference, {
  foreignKey: 'employeeId',
  as: 'preferences',
});

EmployeePreference.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → EmployeePreference (one-to-many)');

// Employee - Survey Result Relationship (one-to-many)
Employee.hasMany(SurveyResult, {
  foreignKey: 'employeeId',
  as: 'surveyResults',
});

SurveyResult.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → SurveyResult (one-to-many)');

// Customer - Customer Access Relationship (one-to-one)
Customer.hasOne(CustomerAccess, {
  foreignKey: 'customerId',
  as: 'access',
});

CustomerAccess.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer',
});
associationCount += 2;
logger.debug('  ↔️ Customer ⟷ CustomerAccess (one-to-one)');

// Customer - Resource Allocation Relationship (one-to-many)
Customer.hasMany(ResourceAllocation, {
  foreignKey: 'customerId',
  as: 'resourceAllocations',
});

ResourceAllocation.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer',
});
associationCount += 2;
logger.debug('  ↔️ Customer → ResourceAllocation (one-to-many)');

// Project - Resource Allocation Relationship (one-to-many)
Project.hasMany(ResourceAllocation, {
  foreignKey: 'projectId',
  as: 'resourceAllocations',
});

ResourceAllocation.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project',
});
associationCount += 2;
logger.debug('  ↔️ Project → ResourceAllocation (one-to-many)');

// Employee - Resource Allocation Relationship (one-to-many)
Employee.hasMany(ResourceAllocation, {
  foreignKey: 'employeeId',
  as: 'resourceAllocations',
});

ResourceAllocation.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → ResourceAllocation (one-to-many)');

// Survey Config - Survey Result Relationship (one-to-many)
SurveyConfig.hasMany(SurveyResult, {
  foreignKey: 'surveyId',
  as: 'results',
});

SurveyResult.belongsTo(SurveyConfig, {
  foreignKey: 'surveyId',
  as: 'survey',
});
associationCount += 2;
logger.debug('  ↔️ SurveyConfig → SurveyResult (one-to-many)');

// Employee - Education Relationship (one-to-many)
Employee.hasMany(EmployeeEducationModel, {
  foreignKey: 'employeeId',
  as: 'education',
});

EmployeeEducationModel.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → EmployeeEducation (one-to-many)');

// Employee - Experience Relationship (one-to-many)
Employee.hasMany(EmployeeExperienceModel, {
  foreignKey: 'employeeId',
  as: 'experience',
});

EmployeeExperienceModel.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'employee',
});
associationCount += 2;
logger.debug('  ↔️ Employee → EmployeeExperience (one-to-many)');

const associationDuration = associationTimer.end({ associationCount });
logger.info(`✅ Model associations established successfully (${associationCount} associations, ${associationDuration}ms)`);

const totalDuration = modelLoadTimer.end({ 
  models: 22, 
  associations: associationCount 
});
logger.info('🎉 Models module initialized successfully', {
  totalModels: 22, 
  totalAssociations: associationCount,
  loadTime: `${totalDuration}ms`,
  models: [
    'User', 'Employee', 'Leave', 'LeaveAllocation', 'Timesheet',
    'WeeklyTimesheet', 'EmployeeDocument', 'EmployeeActivity',
    'OnlineStatus', 'PasswordReset', 'Holiday', 'Customer',
    'Project', 'ResourceAllocation', 'CustomerAccess',
    'EmployeePreference', 'MasterData', 'SurveyConfig', 'SurveyResult', 'Session',
    'EmployeeEducation', 'EmployeeExperience'
  ]
});

// Export all models
export {
  User,
  Employee,
  Leave,
  LeaveAllocation,
  Timesheet,
  WeeklyTimesheet,
  EmployeeDocument,
  EmployeeActivity,
  OnlineStatus,
  PasswordReset,
  Holiday,
  Customer,
  Project,
  ResourceAllocation,
  CustomerAccess,
  EmployeePreference,
  MasterData,
  SurveyConfig,
  SurveyResult,
  Session,
  EmployeeEducationModel,
  EmployeeExperienceModel,
};

// Export default object with all models for convenience
export default {
  User,
  Employee,
  Leave,
  LeaveAllocation,
  Timesheet,
  WeeklyTimesheet,
  EmployeeDocument,
  EmployeeActivity,
  OnlineStatus,
  PasswordReset,
  Holiday,
  Customer,
  Project,
  ResourceAllocation,
  CustomerAccess,
  EmployeePreference,
  MasterData,
  SurveyConfig,
  SurveyResult,
  Session,
  EmployeeEducation: EmployeeEducationModel,
  EmployeeExperience: EmployeeExperienceModel,
};
