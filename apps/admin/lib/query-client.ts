import { isServer, QueryClient } from "@tanstack/react-query";

/**
 * Why this file isn't just `new QueryClient()`:
 *
 * A module-level singleton leaks between server requests during SSR of
 * client components — one request's React Query cache becomes another
 * request's starting state. Concretely, that caused the Documents
 * sidebar to render with a previous render's folder list for the first
 * ~1s after a page refresh, before the client-side refetch replaced it.
 *
 * The fix is TanStack's recommended SSR pattern:
 *   - On the server: a **fresh** QueryClient per call to `getQueryClient`.
 *     Each request gets its own cache, and `initialData` passed to
 *     `useQuery` hooks is honoured (because the cache is empty).
 *   - In the browser: a stable module-level singleton so SPA navigations
 *     continue to share a single cache across page components.
 */

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Small freshness window so the first client render after SSR
        // doesn't immediately refetch everything the server just sent.
        staleTime: 30 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Use this inside `<Providers>` when constructing the root
 * `<QueryClientProvider>`. Anywhere else, prefer `useQueryClient()` from
 * `@tanstack/react-query`.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

/**
 * Legacy browser-only convenience. Lets existing client-side event
 * handlers keep calling `queryClient.invalidateQueries(...)` without a
 * hook. Safe because those handlers only run in the browser, where the
 * singleton is stable.
 *
 * Touching this during SSR is a bug — the proxy throws to make that
 * loud instead of silently sharing cache across requests.
 */
export const queryClient: QueryClient = new Proxy({} as QueryClient, {
  get(_target, prop, receiver) {
    if (isServer) {
      throw new Error(
        "lib/query-client.ts: `queryClient` is browser-only. Use " +
          "`useQueryClient()` from `@tanstack/react-query` inside a " +
          "component, or `getQueryClient()` from this module when " +
          "constructing a `<QueryClientProvider>`."
      );
    }
    // Use the singleton, not getQueryClient(), so we don't redundantly
    // re-enter the branch check on every property access.
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    const value = Reflect.get(browserQueryClient, prop, browserQueryClient);
    if (typeof value === "function") return value.bind(browserQueryClient);
    return value;
  },
});
