/**
 * Converts a Next.js optional catch-all params array into the database key
 * under which Puck pages are stored (always begins with `/`, never has a
 * trailing slash, collapses empty to `/`).
 *
 *   puckPathToKey([])                -> "/"
 *   puckPathToKey(["about"])         -> "/about"
 *   puckPathToKey(["a", "b", "c"])   -> "/a/b/c"
 */
export function puckPathToKey(puckPath: string[] | undefined): string {
  return "/" + (puckPath ?? []).join("/");
}
