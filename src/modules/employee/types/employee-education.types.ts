import { Optional } from 'sequelize';

/**
 * Employee Education Attributes Interface
 * ----------------------------------------
 * Defines the structure of an Employee Education record in the database
 */
export interface EmployeeEducationAttributes {
  uuid: string;
  employeeId: string;
  institution: string;
  degreeCourse: string;
  startYear: string;
  endYear: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
}

/**
 * Employee Education Creation Attributes Interface
 * ------------------------------------------------
 * Defines which fields are optional when creating a new Employee Education record
 */
export interface EmployeeEducationCreationAttributes
  extends Optional<
    EmployeeEducationAttributes,
    'uuid' | 'createdAt' | 'updatedAt'
  > {}
