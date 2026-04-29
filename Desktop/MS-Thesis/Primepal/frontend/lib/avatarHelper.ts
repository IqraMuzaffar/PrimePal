/**
 * Avatar helper - handles avatar generation and fallbacks
 * Prevents 404 errors from broken avatar services
 */

export function getAvatarUrl(name: string | null | undefined, fallbackUrl?: string): string {
  if (!name) return "/avatars/default.svg";

  // If a specific fallback is provided, use it
  if (fallbackUrl) return fallbackUrl;

  // Try dicebear API as secondary (not primary since it may timeout)
  // Only use if name is available
  if (name) {
    // Use initials-based avatar which is more reliable
    const encoded = encodeURIComponent(name);
    return `https://api.dicebear.com/8.x/initials/svg?seed=${encoded}&backgroundColor=random`;
  }

  return "/avatars/default.svg";
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarBackgroundColor(name: string | null | undefined): string {
  if (!name) return "bg-gray-400";

  const colors = [
    "bg-red-400",
    "bg-blue-400",
    "bg-green-400",
    "bg-yellow-400",
    "bg-purple-400",
    "bg-pink-400",
    "bg-indigo-400",
    "bg-teal-400",
  ];

  // Use hash of name to get consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}
