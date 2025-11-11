/**
 * Validate Time Format Helper
 * ============================
 * Validates if a string is in valid HH:MM format
 */

/**
 * Validate Time Format
 * ---------------------
 * Validates if a string is in valid HH:MM format
 * 
 * @param timeString - Time string to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * validateTimeFormat("08:30") // Returns: true
 * validateTimeFormat("8:30")  // Returns: true
 * validateTimeFormat("25:00") // Returns: false
 */
export function validateTimeFormat(timeString: string): boolean {
  const regex = /^([0-9]{1,2}):([0-5][0-9])$/;
  const match = timeString.match(regex);
  
  if (!match) return false;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  return hours >= 0 && hours <= 24 && minutes >= 0 && minutes <= 59;
}
