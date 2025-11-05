/**
 * Leave Calculation Helpers
 * =========================
 * Utility functions for leave-related calculations
 * 
 * Functions:
 * - Calculate leave days between two dates
 * - Generate random request number
 * - Extract name and email from formatted string
 */

/**
 * Calculate Leave Days
 * ====================
 * Calculates the number of leave days between start and end date (inclusive)
 * 
 * Logic:
 * - Includes both start and end dates
 * - Example: 2025-01-10 to 2025-01-12 = 3 days
 * 
 * @param startDate - Leave start date (YYYY-MM-DD)
 * @param endDate - Leave end date (YYYY-MM-DD)
 * @returns Number of leave days
 */
export function calculateLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate difference in milliseconds
  const diffTime = Math.abs(end.getTime() - start.getTime());
  
  // Convert to days and add 1 (to include both start and end date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return diffDays;
}

/**
 * Generate Random Request Number
 * ==============================
 * Generates a random 6-digit number for leave request tracking
 * 
 * @param digits - Number of digits (default 6)
 * @returns Random number with specified digits
 */
export function generateRandomRequestNumber(digits: number = 6): number {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Extract Name and Email
 * ======================
 * Extracts name and email from formatted string: "Name <email@example.com>"
 * 
 * @param formattedString - String in format "Name <email>"
 * @returns Object with name and email, or null if invalid format
 */
export function extractNameAndEmail(formattedString: string): { name: string; email: string } | null {
  // Regex to match "Name <email@example.com>"
  const regex = /^(.+?)\s*<([^>]+)>$/;
  const match = formattedString.match(regex);
  
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }
  
  return null;
}
