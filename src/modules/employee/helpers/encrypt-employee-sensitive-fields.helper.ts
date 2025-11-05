/**
 * Encrypt Employee Sensitive Fields Helper
 * =========================================
 * Encrypts multiple sensitive fields from employee object
 */

import { encrypt } from './encrypt.helper';

/**
 * Encrypt Sensitive Employee Fields
 * ---------------------------------
 * Convenience function to encrypt multiple sensitive fields from employee object.
 * Used in employee service to encrypt all sensitive data before storing to database.
 * 
 * Encrypts:
 * - PAN Card Number
 * - Bank Account Number
 * - Aadhaar Card Number
 * - PF Account Number
 * 
 * @param employee - Employee object with plain text sensitive fields
 * @returns Employee object with encrypted sensitive fields
 */
export async function encryptEmployeeSensitiveFields<T extends {
  panCardNumber?: string | null;
  bankAccountNumber?: string | null;
  aadhaarCardNumber?: string | null;
  pfAccountNumber?: string | null;
}>(employee: T): Promise<T> {
  return {
    ...employee,
    panCardNumber: employee.panCardNumber ? await encrypt(employee.panCardNumber) : null,
    bankAccountNumber: employee.bankAccountNumber ? await encrypt(employee.bankAccountNumber) : null,
    aadhaarCardNumber: employee.aadhaarCardNumber ? await encrypt(employee.aadhaarCardNumber) : null,
    pfAccountNumber: employee.pfAccountNumber ? await encrypt(employee.pfAccountNumber) : null,
  };
}