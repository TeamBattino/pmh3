import { cn } from "@/lib/cn";
import { auth } from "@/lib/auth/auth-client";
import { poppins, londrina } from "@/lib/fonts";
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
      <body
        className={cn(
          londrina.variable,
          poppins.variable,
          "font-poppins antialiased bg-background text-foreground"
        )}
      >
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
