/**
 * Employee Experience Store
 * ==========================
 * Database layer for employee experience operations
 * 
 * Responsibilities:
 * - Insert bulk experience records
 * - Query experience by employee
 * - Update and delete experience records
 * - Comprehensive logging and error handling
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

/**
 * Insert Employee Experience Records
 * ===================================
 * Inserts multiple experience records for an employee
 * 
 * @param employeeId - UUID of the employee
 * @param experienceRecords - Array of experience details
 * @param createdBy - UUID of user creating the records
 * @returns Number of records inserted
 */
export async function insertEmployeeExperience(
  employeeId: string,
  experienceRecords: Array<{
    experienceStatus: 'FRESHER' | 'EXPERIENCED';
    company?: string | null;
    position?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>,
  createdBy: string
): Promise<number> {
  const timer = new PerformanceTimer('insertEmployeeExperience');
  
  try {
    if (!experienceRecords || experienceRecords.length === 0) {
      logger.debug('💼 No experience records to insert', { employeeId });
      return 0;
    }

    logger.info('💼 Inserting experience records', {
      employeeId,
      recordCount: experienceRecords.length,
      operation: 'insertEmployeeExperience'
    });

    // Build bulk insert SQL with VALUES for each record
    const values = experienceRecords.map((exp) => {
      const uuid = uuidv4();
      const company = exp.company ? `'${exp.company.replace(/'/g, "''")}'` : 'NULL';
      const position = exp.position ? `'${exp.position.replace(/'/g, "''")}'` : 'NULL';
      const startDate = exp.startDate ? `'${exp.startDate}'` : 'NULL';
      const endDate = exp.endDate ? `'${exp.endDate}'` : 'NULL';

      return `(
        '${uuid}',
        '${employeeId}',
        '${exp.experienceStatus}',
        ${company},
        ${position},
        ${startDate},
        ${endDate},
        NOW(),
        '${createdBy}',
        '${createdBy}'
      )`;
    }).join(',');

    const sql = `
      INSERT INTO employee_experience (
        uuid,
        employeeId,
        experienceStatus,
        company,
        position,
        startDate,
        endDate,
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
    logDatabase('INSERT_EMPLOYEE_EXPERIENCE', employeeId, duration);

    logger.info('✅ Experience records inserted successfully', {
      employeeId,
      recordCount: experienceRecords.length,
      duration: `${duration}ms`
    });

    return experienceRecords.length;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_EMPLOYEE_EXPERIENCE_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to insert experience records', {
      employeeId,
      recordCount: experienceRecords?.length || 0,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while inserting experience records: ${error.message}`);
  }
}
