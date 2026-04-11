import { cn } from "@/lib/cn";
import { auth } from "@/lib/auth/auth-client";
import { env } from "@/lib/env";
import { poppins, rockingsodaPlus } from "@/lib/fonts";
import { Providers } from "@/components/Providers";
import "./globals.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <head>
        {/*
         * Ship the public S3 URL prefix to the client so <img> tags built
         * from an `s3Key` resolve to the right origin. We do this via a meta
         * tag instead of NEXT_PUBLIC_* to avoid plumbing another env var
         * through the t3 env block — this value is public by design (it's
         * the read URL of the bucket).
         */}
        <meta
          name="pfadipuck-s3-public-url-base"
          content={env.S3_PUBLIC_URL_BASE}
        />
      </head>
      <body
        className={cn(
          rockingsodaPlus.variable,
          poppins.variable,
          "font-poppins antialiased bg-background text-foreground"
        )}
      >
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
