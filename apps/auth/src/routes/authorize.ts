import { Hono } from "hono";
import type { Context } from "hono";
import { findClient, storePendingAuth } from "../lib/db";
import { buildAuthorizeUrl } from "../lib/midata";
import type { EnvConfig } from "../types";

export function authorizeRoutes(env: EnvConfig): Hono {
  const app = new Hono();

  async function handleAuthorize(c: Context) {
    // Read params from query string (GET) or body (POST)
    let clientId: string | undefined;
    let redirectUri: string | undefined;
    let responseType: string | undefined;
    let scope: string | undefined;
    let state: string | undefined;
    let nonce: string | undefined;
    let codeChallenge: string | undefined;
    let codeChallengeMethod: string | undefined;

    if (c.req.method === "POST") {
      const body = await c.req.parseBody();
      clientId = body.client_id as string;
      redirectUri = body.redirect_uri as string;
      responseType = body.response_type as string;
      scope = (body.scope as string) ?? "openid";
      state = body.state as string;
      nonce = body.nonce as string;
      codeChallenge = body.code_challenge as string;
      codeChallengeMethod = body.code_challenge_method as string;
    } else {
      clientId = c.req.query("client_id");
      redirectUri = c.req.query("redirect_uri");
      responseType = c.req.query("response_type");
      scope = c.req.query("scope") ?? "openid";
      state = c.req.query("state");
      nonce = c.req.query("nonce");
      codeChallenge = c.req.query("code_challenge");
      codeChallengeMethod = c.req.query("code_challenge_method");
    }

    // Track whether the client sent a state — if not, we won't send one
    // back in the callback. NextAuth manages state via cookies, not params.
    const clientSentState = !!state;

    console.log(
      `[authorize] ${c.req.method} client_id=${clientId} redirect_uri=${redirectUri}`
    );

    // Validate required params
    if (!clientId || !redirectUri) {
      return c.json(
        {
          error: "invalid_request",
          error_description:
            "Missing required parameters: client_id, redirect_uri",
        },
        400
      );
    }
    if (responseType && responseType !== "code") {
      return c.json(
        {
          error: "unsupported_response_type",
          error_description: "Only 'code' is supported",
        },
        400
      );
    }

    // Validate client
    const client = await findClient(clientId);
    if (!client) {
      return c.json(
        { error: "invalid_client", error_description: "Unknown client_id" },
        400
      );
    }

    // Validate redirect URI (normalize trailing slashes for comparison)
    const normalize = (u: string) => u.replace(/\/+$/, "");
    const match = client.redirectUris.some(
      (registered) => normalize(registered) === normalize(redirectUri)
    );
    if (!match) {
      return c.json(
        {
          error: "invalid_request",
          error_description: `redirect_uri not registered for this client. Got: ${redirectUri}`,
        },
        400
      );
    }

    // Generate an internal state to correlate the MiData callback
    const internalState = crypto.randomUUID();

    // Persist the downstream client's params in MongoDB (TTL-indexed)
    await storePendingAuth({
      state: internalState,
      clientId,
      redirectUri,
      clientState: clientSentState ? state! : "",
      scope: scope ?? "openid",
      nonce: nonce ?? undefined,
      codeChallenge: codeChallenge ?? undefined,
      codeChallengeMethod: codeChallengeMethod ?? undefined,
      createdAt: new Date(),
    });

    // Redirect to MiData
    const midataUrl = buildAuthorizeUrl(env, {
      state: internalState,
      callbackUrl: `${env.issuerUrl}/callback`,
    });

    return c.redirect(midataUrl);
  }

  // OIDC spec allows both GET and POST for the authorization endpoint
  app.get("/authorize", handleAuthorize);
  app.post("/authorize", handleAuthorize);

  return app;
}
