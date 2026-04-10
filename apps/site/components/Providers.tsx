"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";
import { ParallaxProvider } from "react-scroll-parallax";

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ParallaxProvider>{children}</ParallaxProvider>
    </QueryClientProvider>
  );
}
