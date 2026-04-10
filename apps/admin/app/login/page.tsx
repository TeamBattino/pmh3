import { DevelopmentLoginLink } from "@/components/security/dev/DevSignInLink";
import { auth, signIn, signOut } from "@/lib/auth/auth-client";
import { env } from "@/lib/env";

export default async function Page() {
  if (env.NODE_ENV !== "development") {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Development only
      </div>
    );
  }

  const session = await auth();

  const permissions = session?.user?.permissions;

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Session</h2>
        <pre className="rounded-lg border bg-muted p-4 text-sm overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Permissions</h2>
        <pre className="rounded-lg border bg-muted p-4 text-sm overflow-auto">
          {JSON.stringify(permissions, null, 2)}
        </pre>
      </div>

      <div className="flex flex-wrap gap-3">
        <form
          action={async () => {
            "use server";
            await signIn("keycloak");
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-sidebar-primary text-sidebar-primary-foreground shadow hover:bg-sidebar-primary/90"
          >
            Sign in with Keycloak
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Sign out
          </button>
        </form>
      </div>

      <DevelopmentLoginLink />
    </div>
  );
}
