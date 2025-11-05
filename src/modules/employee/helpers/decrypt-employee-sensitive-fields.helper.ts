/**
 * Decrypt Employee Sensitive Fields Helper
 * =========================================
 * Decrypts multiple sensitive fields from employee object
 */

import { decrypt } from './decrypt.helper';

/**
 * Decrypt Sensitive Employee Fields
 * ---------------------------------
 * Convenience function to decrypt multiple sensitive fields from employee object.
 * Used in employee service to decrypt all sensitive data before sending to client.
 * 
 * Decrypts:
 * - PAN Card Number
 * - Bank Account Number
 * - Aadhaar Card Number
 * - PF Account Number
 * 
 * @param employee - Employee object with encrypted sensitive fields
 * @returns Employee object with decrypted sensitive fields
 */
export async function decryptEmployeeSensitiveFields<T extends {
  panCardNumber?: string | null;
  bankAccountNumber?: string | null;
  aadhaarCardNumber?: string | null;
  pfAccountNumber?: string | null;
}>(employee: T): Promise<T> {
  return {
    ...employee,
    panCardNumber: employee.panCardNumber ? await decrypt(employee.panCardNumber) : null,
    bankAccountNumber: employee.bankAccountNumber ? await decrypt(employee.bankAccountNumber) : null,
    aadhaarCardNumber: employee.aadhaarCardNumber ? await decrypt(employee.aadhaarCardNumber) : null,
    pfAccountNumber: employee.pfAccountNumber ? await decrypt(employee.pfAccountNumber) : null,
  };
}