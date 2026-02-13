/**
 * Generate initials from display name or username
 * - If display_name exists: use first letter of first word + first letter of last word
 * - Otherwise: use first 2 characters of username
 * @param displayName - User's display name (optional)
 * @param username - User's username (required fallback)
 * @returns 2-character uppercase initials
 */
export function getAvatarInitials(displayName: string | null | undefined, username: string): string {
  if (displayName && displayName.trim()) {
    const words = displayName.trim().split(/\s+/);
    
    if (words.length >= 2) {
      // First letter of first word + first letter of last word
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      // Single word: use first 2 letters
      return words[0].slice(0, 2).toUpperCase();
    }
  }
  
  // Fallback to username
  return username.slice(0, 2).toUpperCase();
}
