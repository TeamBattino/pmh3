import { Hono } from "hono";
import { getJwks } from "../lib/jwt";
import type { EnvConfig } from "../types";

export function discoveryRoutes(env: EnvConfig): Hono {
  const app = new Hono();

  app.get("/.well-known/openid-configuration", (c) => {
    const issuer = env.issuerUrl;
    return c.json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "profile", "email", "roles"],
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post",
      ],
      claims_supported: [
        "sub",
        "name",
        "email",
        "roles",
        "primary_group_id",
      ],
      code_challenge_methods_supported: ["S256", "plain"],
      grant_types_supported: ["authorization_code"],
      authorization_response_iss_parameter_supported: true,
    });
  });

  app.get("/.well-known/jwks.json", (c) => {
    return c.json(getJwks());
  });

  return app;
}
