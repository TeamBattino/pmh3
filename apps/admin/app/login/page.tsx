import { auth } from "@/lib/auth/auth-client";
import { redirect } from "next/navigation";
import { LoginButton } from "./LoginButton";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const { callbackUrl = "/" } = await searchParams;

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-rockingsoda text-3xl tracking-wide text-foreground">
            Pfadi Meilen Herrliberg
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access the admin.
          </p>
        </div>
        <div className="mt-8">
          <LoginButton callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
