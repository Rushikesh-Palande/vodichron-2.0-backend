/**
 * Format Approver Detail Helper
 * ==============================
 * Formats approver name and email into standard format
 */

/**
 * Format Approver Detail String
 * ------------------------------
 * Formats approver name and email into standard format
 * Used for storing approver details in database
 * 
 * @param name - Approver name
 * @param email - Approver email
 * @returns Formatted string "Name <email@example.com>"
 * 
 * @example
 * formatApproverDetail("John Doe", "john@example.com")
 * // Returns: "John Doe <john@example.com>"
 */
export function formatApproverDetail(name: string, email: string): string {
  return `${name} <${email}>`;
}
