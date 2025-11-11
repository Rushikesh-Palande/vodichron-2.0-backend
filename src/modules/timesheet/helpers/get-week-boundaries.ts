/**
 * Get Week Boundaries Helper
 * ===========================
 * Calculates week start (Monday) and end (Sunday) for a given date
 */

/**
 * Get Week Start and End Dates
 * -----------------------------
 * Calculates week start (Monday) and end (Sunday) for a given date
 * 
 * @param date - Date to calculate week boundaries for
 * @returns Object with weekStartDate and weekEndDate (YYYY-MM-DD format)
 * 
 * @example
 * getWeekBoundaries(new Date("2024-01-15"))
 * // Returns: { weekStartDate: "2024-01-15", weekEndDate: "2024-01-21" }
 */
export function getWeekBoundaries(date: Date): { weekStartDate: string; weekEndDate: string } {
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust if Sunday
  
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diff);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return {
    weekStartDate: weekStart.toISOString().split('T')[0],
    weekEndDate: weekEnd.toISOString().split('T')[0]
  };
}
