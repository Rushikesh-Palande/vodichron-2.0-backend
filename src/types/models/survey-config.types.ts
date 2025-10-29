/**
 * Survey Config Model Type Definitions
 * =====================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Survey Config model.
 * Ensures type safety when creating and managing surveys.
 * 
 * Interfaces:
 * - SurveyConfigAttributes: Complete structure of a survey configuration record
 * - SurveyConfigCreationAttributes: Optional fields for creating new surveys
 * 
 * Corresponding Model: survey-config.model.ts
 * Database Table: survey_config
 * 
 * Usage:
 * Used for employee satisfaction surveys, customer feedback collection,
 * performance reviews, and exit interviews with type safety.
 */

import { Optional } from 'sequelize';

export interface SurveyConfigAttributes {
  uuid: string;
  surveyType: 'EMPLOYEE' | 'CUSTOMER';
  surveyTitle: string;
  startDate: Date | null;
  endDate: Date | null;
  formDetails: any; // JSON
  recipientEmails: any; // JSON
  createdAt: Date;
  createdBy: string;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export interface SurveyConfigCreationAttributes
  extends Optional<SurveyConfigAttributes, 'uuid' | 'startDate' | 'endDate' | 'formDetails' | 'recipientEmails' | 'createdAt' | 'updatedBy' | 'updatedAt'> {}
