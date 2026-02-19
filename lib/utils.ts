/**
 * Utility functions for AI Caregiver Co-Pilot
 */

/**
 * Merge class names for Tailwind CSS
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
