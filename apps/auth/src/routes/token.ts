import { Hono } from "hono";
import { consumeAuthCode, findClient, storeAccessToken } from "../lib/db";
import { signJwt } from "../lib/jwt";
import { generateCode, verifyPkce, verifySecret } from "../lib/crypto";
import type { EnvConfig } from "../types";

/**
 * Parse client credentials from either the Authorization header (Basic auth)
 * or from the POST body (client_secret_post).
 */
function extractClientCredentials(
  c: any,
  bodyClientId?: string,
  bodyClientSecret?: string
): { clientId: string; clientSecret: string } | null {
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6));
    const [id, secret] = decoded.split(":");
    if (id && secret) return { clientId: decodeURIComponent(id), clientSecret: decodeURIComponent(secret) };
  }
  if (bodyClientId && bodyClientSecret) {
    return { clientId: bodyClientId, clientSecret: bodyClientSecret };
  }
  return null;
}

export function tokenRoutes(env: EnvConfig): Hono {
  const app = new Hono();

  app.post("/token", async (c) => {
    const body = await c.req.parseBody();

    const grantType = body.grant_type as string;
    if (grantType !== "authorization_code") {
      return c.json(
        { error: "unsupported_grant_type", error_description: "Only authorization_code is supported" },
        400
      );
    }

    // Extract client credentials
    const creds = extractClientCredentials(
      c,
      body.client_id as string,
      body.client_secret as string
    );
    if (!creds) {
      return c.json(
        { error: "invalid_client", error_description: "Missing client credentials" },
        401
      );
    }

    // Validate client
    const client = await findClient(creds.clientId);
    if (!client || !verifySecret(creds.clientSecret, client.clientSecretHash)) {
      return c.json(
        { error: "invalid_client", error_description: "Invalid client credentials" },
        401
      );
    }

    // Consume the auth code (atomic find + delete)
    const code = body.code as string;
    if (!code) {
      return c.json(
        { error: "invalid_request", error_description: "Missing code" },
        400
      );
    }

    const storedCode = await consumeAuthCode(code);
    if (!storedCode) {
      return c.json(
        { error: "invalid_grant", error_description: "Invalid or expired code" },
        400
      );
    }

    // Validate the code was issued to this client
    if (storedCode.clientId !== creds.clientId) {
      return c.json(
        { error: "invalid_grant", error_description: "Code was not issued to this client" },
        400
      );
    }

    // Validate redirect_uri matches
    const redirectUri = body.redirect_uri as string;
    if (redirectUri && redirectUri !== storedCode.redirectUri) {
      return c.json(
        { error: "invalid_grant", error_description: "redirect_uri mismatch" },
        400
      );
    }

    // PKCE verification
    if (storedCode.codeChallenge) {
      const codeVerifier = body.code_verifier as string;
      if (!codeVerifier) {
        return c.json(
          { error: "invalid_request", error_description: "Missing code_verifier" },
          400
        );
      }
      if (
        !verifyPkce(
          codeVerifier,
          storedCode.codeChallenge,
          storedCode.codeChallengeMethod
        )
      ) {
        return c.json(
          { error: "invalid_grant", error_description: "PKCE verification failed" },
          400
        );
      }
    }

    // Build the id_token JWT — only include nonce if it was sent
    const idTokenPayload: Record<string, unknown> = {
      iss: env.issuerUrl,
      sub: storedCode.userId,
      aud: creds.clientId,
      name: `${storedCode.userInfo.first_name} ${storedCode.userInfo.last_name}`,
      email: storedCode.userInfo.email,
      roles: storedCode.roles,
      primary_group_id: storedCode.userInfo.primary_group_id,
    };
    if (storedCode.nonce) {
      idTokenPayload.nonce = storedCode.nonce;
    }
    const idToken = await signJwt(idTokenPayload, "1h");

    // Generate an opaque access token and store it
    const accessToken = generateCode(48);
    await storeAccessToken({
      token: accessToken,
      userId: storedCode.userId,
      clientId: creds.clientId,
      userInfo: storedCode.userInfo,
      roles: storedCode.roles,
      scope: storedCode.scope,
      createdAt: new Date(),
    });

    return c.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      id_token: idToken,
      scope: storedCode.scope,
    });
  });

  return app;
}
