"use client";

import { getQueryClient } from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { PropsWithChildren, useState } from "react";
import { Toaster } from "@/components/ui/Sonner";
import { BackgroundOpsProvider } from "@/components/file-system/BackgroundOpsProvider";
import { BackgroundOpsDock } from "@/components/file-system/BackgroundOpsDock";

export function Providers({
  children,
  session,
}: PropsWithChildren<{ session: Session | null }>) {
  // `useState` with a lazy initializer ensures we build the QueryClient
  // exactly once per Providers instance. On the server that's "once per
  // request" (fresh cache, no cross-request leak); in the browser it's
  // "once for the lifetime of the tab" (shared cache across SPA nav).
  const [queryClient] = useState(() => getQueryClient());

  return (
    <SessionProvider basePath="/auth" session={session}>
      <QueryClientProvider client={queryClient}>
        <BackgroundOpsProvider>
          {children}
          <BackgroundOpsDock />
        </BackgroundOpsProvider>
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  );
}
