/**
 * DiceBear Avatar Generator Utility
 * Generates procedurally-created avatars seeded by student name or ID
 */

export type AvatarStyle = "bottts" | "fun-emoji" | "pixel-art" | "adventurer" | "lorelei";

/**
 * Generate a DiceBear avatar URL for a student
 * @param studentName - Student name used as seed for consistent avatars
 * @param style - Avatar style (default: bottts for fun, colorful robots)
 * @returns Full URL to the DiceBear SVG
 */
export function generateAvatarUrl(studentName: string, style: AvatarStyle = "bottts"): string {
  const seed = encodeURIComponent(studentName.trim());
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

/**
 * Get a random avatar style for variety
 */
export function getRandomAvatarStyle(): AvatarStyle {
  const styles: AvatarStyle[] = ["bottts", "fun-emoji", "pixel-art", "adventurer"];
  return styles[Math.floor(Math.random() * styles.length)];
}
