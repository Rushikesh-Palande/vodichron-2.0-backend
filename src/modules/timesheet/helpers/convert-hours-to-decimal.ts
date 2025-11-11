/**
 * Convert Hours to Decimal Helper
 * ================================
 * Converts time in HH:MM format to decimal hours
 */

/**
 * Convert Hours String to Decimal
 * --------------------------------
 * Converts time in HH:MM format to decimal hours
 * 
 * @param timeString - Time in HH:MM format (e.g., "08:30")
 * @returns Decimal hours (e.g., 8.5)
 * 
 * @example
 * convertHoursToDecimal("08:30") // Returns: 8.5
 * convertHoursToDecimal("10:15") // Returns: 10.25
 */
export function convertHoursToDecimal(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + (minutes / 60);
}
