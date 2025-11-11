/**
 * Employee Education Store
 * =========================
 * Database layer for employee education operations
 * 
 * Responsibilities:
 * - Insert bulk education records
 * - Query education by employee
 * - Update and delete education records
 * - Comprehensive logging and error handling
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

/**
 * Insert Employee Education Records
 * ==================================
 * Inserts multiple education records for an employee
 * 
 * @param employeeId - UUID of the employee
 * @param educationRecords - Array of education details
 * @param createdBy - UUID of user creating the records
 * @returns Number of records inserted
 */
export async function insertEmployeeEducation(
  employeeId: string,
  educationRecords: Array<{
    institution: string;
    degreeCourse: string;
    startYear: string;
    endYear: string;
  }>,
  createdBy: string
): Promise<number> {
  const timer = new PerformanceTimer('insertEmployeeEducation');
  
  try {
    if (!educationRecords || educationRecords.length === 0) {
      logger.debug('📚 No education records to insert', { employeeId });
      return 0;
    }

    logger.info('📚 Inserting education records', {
      employeeId,
      recordCount: educationRecords.length,
      operation: 'insertEmployeeEducation'
    });

    // Build bulk insert SQL with VALUES for each record
    const values = educationRecords.map((edu) => {
      const uuid = uuidv4();
      return `(
        '${uuid}',
        '${employeeId}',
        '${edu.institution.replace(/'/g, "''")}',
        '${edu.degreeCourse.replace(/'/g, "''")}',
        '${edu.startYear}',
        '${edu.endYear}',
        NOW(),
        '${createdBy}',
        '${createdBy}'
      )`;
    }).join(',');

    const sql = `
      INSERT INTO employee_education (
        uuid,
        employeeId,
        institution,
        degreeCourse,
        startYear,
        endYear,
        createdAt,
        createdBy,
        updatedBy
      )
      VALUES ${values}
    `;

    await sequelize.query(sql, {
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE_EDUCATION', employeeId, duration);

    logger.info('✅ Education records inserted successfully', {
      employeeId,
      recordCount: educationRecords.length,
      duration: `${duration}ms`
    });

    return educationRecords.length;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE_EDUCATION_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to insert education records', {
      employeeId,
      recordCount: educationRecords?.length || 0,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while inserting education records: ${error.message}`);
  }
}
