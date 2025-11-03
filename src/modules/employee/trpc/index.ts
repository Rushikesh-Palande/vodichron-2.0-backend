import { router } from '../../../trpc/trpc';
import { getByIdProcedure } from './routers/crud/get-by-id.router';
import { listProcedure } from './routers/crud/list.router';
import { createEmployeeProcedure } from './routers/crud/create.router';
import { checkEmployeeExistProcedure } from './routers/crud/check-employee-exist.router';
import { checkEmployeeIdExistsProcedure } from './routers/crud/check-employee-id-exists.router';
import { updateEmployeeProcedure } from './routers/crud/update.router';
import { deleteEmployeeProcedure } from './routers/crud/delete.router';
import { searchManagerAssignmentProcedure } from './routers/search/search-manager-assignment.router';
import { searchAllEmployeesProcedure } from './routers/search/search-all-employees.router';
import { searchRoleAssignmentProcedure } from './routers/search/search-role-assignment.router';
import { getSelfDocumentsProcedure } from './routers/documents/get-self-documents.router';
import { deleteEmployeeDocumentProcedure } from './routers/documents/delete-employee-document.router';

/**
 * Vodichron HRMS Employee tRPC Router
 * ===================================
 * Handles employee-related operations for the Vodichron HRMS system using tRPC.
 * 
 * Features:
 * - Type-safe API with automatic validation
 * - Role-based access control (RBAC)
 * - Comprehensive logging and audit trail
 * - Performance monitoring
 * - Sensitive data encryption/decryption
 * 
 * Procedures:
 * - getById: Fetch employee profile by UUID
 * - list: Fetch paginated list of employees with filters
 * - create: Create a new employee record
 * - checkEmployeeExist: Check if employee email already exists
 * - update: Update an existing employee record
 * - delete: Delete an employee record
 * - searchManagerAssignment: Search employees for manager/director assignment
 * - searchAll: General employee search by keyword
 * - searchRoleAssignment: Search employees for role assignment (without roles)
 * - getSelfDocuments: Fetch employee's own documents with HR approval details
 * - deleteEmployeeDocument: Delete employee document (self OR HR/SuperUser)
 */
export const employeeRouter = router({
  getById: getByIdProcedure,
  list: listProcedure,
  create: createEmployeeProcedure,
  checkEmployeeExist: checkEmployeeExistProcedure,
  checkEmployeeIdExists: checkEmployeeIdExistsProcedure,
  update: updateEmployeeProcedure,
  delete: deleteEmployeeProcedure,
  searchManagerAssignment: searchManagerAssignmentProcedure,
  searchAll: searchAllEmployeesProcedure,
  searchRoleAssignment: searchRoleAssignmentProcedure,
  getSelfDocuments: getSelfDocumentsProcedure,
  deleteEmployeeDocument: deleteEmployeeDocumentProcedure,
});
