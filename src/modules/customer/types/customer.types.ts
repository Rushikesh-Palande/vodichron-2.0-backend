/**
 * Customer Types and Interfaces
 * =============================
 * 
 * Defines TypeScript types and interfaces for customer-related operations.
 * These are used across services, controllers, and stores.
 */

/**
 * Customer Interface
 * ==================
 * Represents a customer record in the system
 */
export interface Customer {
  uuid: string;
  name: string;
  email: string;
  primaryContact: string;
  secondaryContact: string;
  country: string;
  timezone: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  hasAppAccess: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

/**
 * Customer Filter Interface
 * =========================
 * Used for filtering customers in list/search operations
 */
export interface CustomerFilters {
  country?: string | null;
  status?: string | null;
  search?: string;
}

/**
 * Customer Create Input
 * ====================
 * Input data for creating a new customer
 */
export interface CreateCustomerInput {
  name: string;
  primaryContact: string;
  secondaryContact: string;
  email: string;
  country: string;
  timezone: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

/**
 * Customer Update Input
 * ====================
 * Input data for updating a customer
 */
export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  uuid: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * Customer Resource Allocation
 * ============================
 * Represents a customer's resource allocation to projects
 */
export interface CustomerResourceAllocation {
  uuid: string;
  projectId: string;
  customerId: string;
  employeeId: string;
  startDate: string;
  projectName: string;
  customerName: string;
  employeeName: string;
  endDate: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  allocationCode: string;
  customerApprover: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

/**
 * Resource Allocation Partial
 * ===========================
 * Subset of CustomerResourceAllocation for specific operations
 */
export type ResourceAllocation = Pick<
  CustomerResourceAllocation,
  'employeeId' | 'customerId' | 'startDate' | 'endDate' | 'role' | 'customerApprover'
>;

/**
 * Customer With Resources Allocation
 * ==================================
 * Customer data combined with their resource allocations
 */
export interface CustomerWithResourcesAllocation {
  customer: Customer;
  resourceAllocations: CustomerResourceAllocation[];
}

/**
 * Application User Role
 * ====================
 * User roles used in the system
 */
export enum ApplicationUserRole {
  superUser = 'super_user',
  admin = 'admin',
  hr = 'hr',
  manager = 'manager',
  employee = 'employee',
  customer = 'customer'
}

/**
 * Super Users Array
 * =================
 * Array of roles that have super user privileges
 */
export const SUPER_USERS = [ApplicationUserRole.superUser];

/**
 * Customer Users Array
 * ====================
 * Array of roles that are customer users
 */
export const CUSTOMER_USERS = [ApplicationUserRole.customer];
