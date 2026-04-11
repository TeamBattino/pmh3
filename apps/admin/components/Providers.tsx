"use client";

import { queryClient } from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";
import { Toaster } from "@/components/ui/Sonner";
import { BackgroundOpsProvider } from "@/components/file-system/BackgroundOpsProvider";
import { BackgroundOpsDock } from "@/components/file-system/BackgroundOpsDock";

export function Providers({
  children,
  session,
}: PropsWithChildren<{ session: Session | null }>) {
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
