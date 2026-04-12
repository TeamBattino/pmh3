import { Hono } from "hono";
import { consumePendingAuth, findPendingAuth, storeAuthCode } from "../lib/db";
import { exchangeCode, fetchUserInfo } from "../lib/midata";
import { mapRoles, rolesAllowClient } from "../lib/role-mapper";
import { generateCode } from "../lib/crypto";
import type { EnvConfig, StoredAuthCode } from "../types";

export function callbackRoutes(env: EnvConfig): Hono {
  const app = new Hono();

  app.get("/callback", async (c) => {
    const internalState = c.req.query("state");
    const midataCode = c.req.query("code");
    const error = c.req.query("error");

    if (error) {
      const desc = c.req.query("error_description") ?? "Authentication denied";
      // Try to redirect back to the client with the error
      if (internalState) {
        const pending = await findPendingAuth(internalState);
        if (pending) {
          await consumePendingAuth(internalState);
          const url = new URL(pending.redirectUri);
          url.searchParams.set("error", error);
          url.searchParams.set("error_description", desc);
          url.searchParams.set("iss", env.issuerUrl);
          if (pending.clientState) {
            url.searchParams.set("state", pending.clientState);
          }
          return c.redirect(url.toString());
        }
      }
      return c.json({ error, error_description: desc }, 400);
    }

    if (!internalState || !midataCode) {
      return c.json(
        { error: "invalid_request", error_description: "Missing state or code" },
        400
      );
    }

    // Atomically consume the pending authorization
    const pending = await consumePendingAuth(internalState);
    if (!pending) {
      return c.json(
        { error: "invalid_request", error_description: "Unknown or expired state" },
        400
      );
    }

    try {
      // Exchange code with MiData
      const tokens = await exchangeCode(
        env,
        midataCode,
        `${env.issuerUrl}/callback`
      );

      // Fetch user info from MiData
      const userInfo = await fetchUserInfo(env, tokens.access_token);

      // Map MiData groups → internal roles
      const roles = await mapRoles(userInfo);

      // Map MiData groups → internal roles (log for debugging)
      console.log(
        `[callback] user=${userInfo.id} groups=${JSON.stringify(
          userInfo.roles?.map((r) => ({ group_id: r.group_id, role_class: r.role_class }))
        )} → matched roles: ${JSON.stringify(roles)}`
      );

      // Check if any role grants access to the requesting client
      const allowed = await rolesAllowClient(roles, pending.clientId);
      if (!allowed) {
        const url = new URL(pending.redirectUri);
        url.searchParams.set("error", "access_denied");
        url.searchParams.set(
          "error_description",
          "You do not have access to this application"
        );
        url.searchParams.set("iss", env.issuerUrl);
        if (pending.clientState) {
          url.searchParams.set("state", pending.clientState);
        }
        return c.redirect(url.toString());
      }

      // Generate our own auth code
      const code = generateCode();

      const storedCode: StoredAuthCode = {
        code,
        clientId: pending.clientId,
        userId: String(userInfo.id),
        userInfo,
        roles,
        redirectUri: pending.redirectUri,
        codeChallenge: pending.codeChallenge,
        codeChallengeMethod: pending.codeChallengeMethod,
        nonce: pending.nonce,
        scope: pending.scope,
        createdAt: new Date(),
      };

      await storeAuthCode(storedCode);

      // Redirect back to the downstream client
      const url = new URL(pending.redirectUri);
      url.searchParams.set("code", code);
      // RFC 9207: oauth4webapi v3+ requires iss in the authorization response
      url.searchParams.set("iss", env.issuerUrl);
      // Only include state if the client originally sent one
      if (pending.clientState) {
        url.searchParams.set("state", pending.clientState);
      }
      return c.redirect(url.toString());
    } catch (err) {
      console.error("Callback error:", err);
      const url = new URL(pending.redirectUri);
      url.searchParams.set("error", "server_error");
      url.searchParams.set(
        "error_description",
        "Failed to authenticate with upstream provider"
      );
      url.searchParams.set("iss", env.issuerUrl);
      if (pending.clientState) {
        url.searchParams.set("state", pending.clientState);
      }
      return c.redirect(url.toString());
    }
  });

  return app;
}
