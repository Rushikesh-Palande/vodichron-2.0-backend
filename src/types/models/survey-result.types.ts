/**
 * Survey Result Model Type Definitions
 * =====================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Survey Result model.
 * Ensures type safety when storing and analyzing survey responses.
 * 
 * Interfaces:
 * - SurveyResultAttributes: Complete structure of a survey result record
 * - SurveyResultCreationAttributes: Optional fields for creating new survey results
 * 
 * Corresponding Model: survey-result.model.ts
 * Database Table: survey_results
 * 
 * Usage:
 * Used for capturing survey responses, analyzing feedback data,
 * and generating survey reports with type safety.
 */

import { Optional } from 'sequelize';

export interface SurveyResultAttributes {
  uuid: string;
  employeeId: string;
  surveyId: string;
  surveyResult: any; // JSON
  generalComment: string | null;
  createdAt: Date;
  createdBy: string;
}

export interface SurveyResultCreationAttributes
  extends Optional<SurveyResultAttributes, 'uuid' | 'surveyResult' | 'generalComment' | 'createdAt'> {}
