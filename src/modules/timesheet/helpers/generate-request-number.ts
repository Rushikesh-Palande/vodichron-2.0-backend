/**
 * Generate Request Number Helper
 * ===============================
 * Generates random request numbers for timesheet tracking
 * 
 * Based on old vodichron helpers/common.ts randomNumber function
 */

/**
 * Generate Random Request Number
 * -------------------------------
 * Generates a random numeric string of specified length
 * Used for creating unique timesheet request numbers
 * 
 * @param length - Length of the numeric string to generate
 * @returns Random number of specified length
 * 
 * @example
 * generateRequestNumber(6) // Returns: 123456
 */
export function generateRequestNumber(length: number): number {
  let text = '';
  const possible = '0123456789';
  
  for (let i = 0; i < length; i++) {
    const sup = Math.floor(Math.random() * possible.length);
    // Avoid starting with 0 and avoid repeating the position index
    text += i > 0 && sup === i ? '0' : possible.charAt(sup);
  }
  
  return Number(text);
}
