import { Optional } from 'sequelize';

/**
 * Experience Status Type
 * ----------------------
 * Defines the experience status of an employee
 */
export type ExperienceStatus = 'FRESHER' | 'EXPERIENCED';

/**
 * Employee Experience Attributes Interface
 * -----------------------------------------
 * Defines the structure of an Employee Experience record in the database
 */
export interface EmployeeExperienceAttributes {
  uuid: string;
  employeeId: string;
  experienceStatus: ExperienceStatus;
  company: string | null;
  position: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string;
}

/**
 * Employee Experience Creation Attributes Interface
 * -------------------------------------------------
 * Defines which fields are optional when creating a new Employee Experience record
 */
export interface EmployeeExperienceCreationAttributes
  extends Optional<
    EmployeeExperienceAttributes,
    | 'uuid'
    | 'company'
    | 'position'
    | 'startDate'
    | 'endDate'
    | 'createdAt'
    | 'updatedAt'
  > {}
