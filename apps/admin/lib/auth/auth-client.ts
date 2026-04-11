import { getDbService } from "@/lib/db/db";
import { env } from "@/lib/env";
import type { Permission } from "@/lib/security/security-config";
import NextAuth from "next-auth";

const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/auth",
  providers: [
    {
      id: "oidc",
      name: "OIDC",
      type: "oidc",
      issuer: env.AUTH_OIDC_ISSUER,
      clientId: env.AUTH_OIDC_CLIENT_ID,
      clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
      // Preserve the `roles` claim from the id_token onto the NextAuth user
      // object, so the `jwt` callback below can pick it up.
      profile(profile) {
        return {
          id: profile.sub as string,
          name: (profile.name as string) ?? null,
          email: (profile.email as string) ?? null,
          roles: (profile.roles as string[]) ?? [],
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, profile, user, trigger, session }) {
      if (trigger === "update" && session?.roles) {
        token.roles = session.roles;
      }

      if (user) {
        token.roles = (user as any).roles || (profile as any)?.roles;
      }

      if (token.roles && !token.permissions) {
        token.permissions = await fetchPermissions(token.roles as string[]);
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.roles = token.roles;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
});

async function fetchPermissions(roles: string[]): Promise<Permission[]> {
  const db = await getDbService();
  const config = await db.getSecurityConfig();

  const permissionSet = new Set<string>(
    config?.roles
      ?.filter((r) => roles.includes(r.name))
      .flatMap((r) => r.permissions || []) || []
  );

  return Array.from(permissionSet) as Permission[];
}

export { auth, handlers, signIn, signOut };
