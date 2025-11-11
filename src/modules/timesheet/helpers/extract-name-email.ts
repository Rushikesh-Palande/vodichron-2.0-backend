/**
 * Extract Name and Email Helper
 * ==============================
 * Parses approver details from database format
 * 
 * Based on old vodichron helpers/common.ts extractNameAndEmail function
 */

/**
 * Extract Name and Email from String
 * -----------------------------------
 * Parses a string in format "Name <email@example.com>" and extracts components
 * Used for parsing approver details from database
 * 
 * @param inputString - String in format "Name <email>"
 * @returns Object with name and email, or false if invalid format
 * 
 * @example
 * extractNameAndEmail("John Doe <john@example.com>")
 * // Returns: { name: "John Doe", email: "john@example.com" }
 */
export function extractNameAndEmail(inputString: string): { name: string; email: string } | false {
  const regex = /(.+?) <(.+?)>/;
  const match = inputString.match(regex);

  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    return { name, email };
  }
  
  return false;
}
