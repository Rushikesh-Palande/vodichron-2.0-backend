/**
 * Validate Date Range Helper
 * ===========================
 * Validates if end date is after or equal to start date
 */

/**
 * Validate Date Range
 * --------------------
 * Validates if end date is after or equal to start date
 * 
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns true if valid, false otherwise
 * 
 * @example
 * validateDateRange("2024-01-01", "2024-01-31") // Returns: true
 * validateDateRange("2024-01-31", "2024-01-01") // Returns: false
 */
export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end >= start;
}
