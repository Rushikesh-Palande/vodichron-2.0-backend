/**
 * Employee Customer Allocation Store
 * ===================================
 * Database queries for employee-customer resource allocation
 * 
 * Purpose:
 * - Check if employee is allocated to a customer
 * - Fetch customer details for leave approval workflow
 * - Support customer approver functionality
 * 
 * Database Tables:
 * - project_resource_allocation (main table)
 * - customers (joined for customer details)
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../../../database';
import { logger, PerformanceTimer, logDatabase } from '../../../utils/logger';

/**
 * Employee Customer Details Interface
 * ====================================
 * Represents customer allocation information for an employee
 */
export interface EmployeeCustomerDetails {
  customerId: string;
  customerName: string;
  email: string;
  customerApprover: boolean | null;
}

/**
 * Get Employee Customer Details
 * ==============================
 * 
 * Fetches active customer allocation details for an employee.
 * Used in leave approval workflow to determine if customer approval is required.
 * 
 * Business Logic:
 * - Only returns ACTIVE allocations
 * - Employee can be allocated to only one customer at a time (business rule)
 * - Customer must have customerApprover flag set to be added as approver
 * 
 * Database Query:
 * --------------
 * SELECT: customerId, customerApprover, customerName, email
 * FROM: project_resource_allocation (pra)
 * LEFT JOIN: customers (c)
 * WHERE: employeeId = ? AND status = 'ACTIVE'
 * LIMIT: 1 (assumes single active allocation)
 * 
 * @param employeeId - UUID of the employee
 * @returns Customer details if employee is allocated, null otherwise
 * @throws Error if database operation fails
 */
export async function getEmployeeCustomerDetails(
  employeeId: string
): Promise<EmployeeCustomerDetails | null> {
  const timer = new PerformanceTimer('getEmployeeCustomerDetails');
  
  try {
    logger.debug('🔍 Fetching employee customer allocation', {
      employeeId,
      operation: 'getEmployeeCustomerDetails'
    });

    // ==========================================================================
    // SQL Query: Fetch Active Customer Allocation
    // ==========================================================================
    // Joins project_resource_allocation with customers table
    // Filters by employeeId and ACTIVE status
    // Returns customer details including customerApprover flag
    const sql = `
      SELECT 
        pra.customerId,
        pra.customerApprover,
        c.name AS customerName,
        c.email
      FROM project_resource_allocation pra
      LEFT JOIN customers c ON pra.customerId = c.uuid
      WHERE pra.employeeId = :employeeId 
        AND pra.status = 'ACTIVE'
      LIMIT 1
    `;

    const result = await sequelize.query<EmployeeCustomerDetails>(sql, {
      replacements: { employeeId },  // Parameterized query for security
      type: QueryTypes.SELECT,        // Specify query type
      raw: true,                       // Return raw data
    });

    const duration = timer.end();
    logDatabase('SELECT_EMPLOYEE_CUSTOMER_DETAILS', employeeId, duration);

    // ==========================================================================
    // Process Result
    // ==========================================================================
    if (result.length === 0) {
      logger.debug('❌ No customer allocation found', {
        employeeId,
        duration: `${duration}ms`
      });
      return null;
    }

    logger.debug('✅ Customer allocation found', {
      employeeId,
      customerId: result[0].customerId,
      customerName: result[0].customerName,
      customerApprover: result[0].customerApprover,
      duration: `${duration}ms`
    });

    return result[0];

  } catch (error: any) {
    // ==========================================================================
    // Error Handling
    // ==========================================================================
    const duration = timer.end();
    logDatabase('SELECT_EMPLOYEE_CUSTOMER_ERROR', employeeId, duration, error);
    
    logger.error('❌ Failed to fetch employee customer details', {
      employeeId,
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Re-throw error to be handled by service layer
    throw new Error(`Database error while fetching employee customer details: ${error.message}`);
  }
}
