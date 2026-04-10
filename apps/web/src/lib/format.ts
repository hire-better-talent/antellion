export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Relative time string with a numeric sort key.
 * Used by the dashboard to display and sort recent activity.
 */
export function timeAgo(date: Date): { label: string; sortKey: number } {
  const ms = Date.now() - date.getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return { label: "just now", sortKey: ms };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { label: `${minutes}m ago`, sortKey: ms };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { label: `${hours}h ago`, sortKey: ms };
  const days = Math.floor(hours / 24);
  return { label: `${days}d ago`, sortKey: ms };
}
