import { env } from "@/lib/env";

export const DevelopmentLoginLink = () => {
  if (env.MOCK_AUTH !== "true" || env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="rounded-lg border border-dashed p-4">
      <h3 className="font-semibold">Development Mode</h3>
      <p className="text-sm text-muted-foreground">Mock Authentication is enabled.</p>
      <a href="/auth/dev/signin" className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80">
        Go to Developer Login
      </a>
    </div>
  );
};
