/**
 * Master Data Types
 * =================
 * Type definitions for master data module
 * 
 * Master data includes:
 * - designation: Employee designation options
 * - department: Department options
 * - leaveType: Leave type options
 * - And other system-wide configuration data
 */

/**
 * Master Field Interface
 * ----------------------
 * Represents a single master data field with its values
 */
export interface MasterField {
  /**
   * Name/key of the master field
   * Examples: 'designation', 'department', 'leaveType'
   */
  name: string;

  /**
   * Array of possible values for this field
   * Examples: ['Software Engineer', 'Senior Developer', ...]
   */
  value: string[];
}

/**
 * Master Data Response
 * --------------------
 * Response structure for GET master data endpoint
 */
export interface MasterDataResponse {
  success: boolean;
  message: string;
  data: MasterField[];
  timestamp: string;
}
