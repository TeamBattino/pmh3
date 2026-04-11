/**
 * Byte formatter. Binary units keep round numbers familiar to anyone who's
 * looked at file sizes in a file manager. `1024 → "1 KB"`, `1_500_000 →
 * "1.4 MB"`.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / 1024 ** i;
  const rounded = value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[i]}`;
}
