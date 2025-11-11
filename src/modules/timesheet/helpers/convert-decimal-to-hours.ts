/**
 * Convert Decimal to Hours Helper
 * ================================
 * Converts decimal hours to HH:MM format
 */

/**
 * Convert Decimal to Hours String
 * --------------------------------
 * Converts decimal hours to HH:MM format
 * 
 * @param decimalHours - Hours in decimal format (e.g., 8.5)
 * @returns Time in HH:MM format (e.g., "08:30")
 * 
 * @example
 * convertDecimalToHours(8.5) // Returns: "08:30"
 * convertDecimalToHours(10.25) // Returns: "10:15"
 */
export function convertDecimalToHours(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
