import type { EnvConfig, MiDataUserInfo } from "../types";

/** Scopes for the authorize redirect (space-delimited per OAuth spec). */
const AUTHORIZE_SCOPES = "openid email with_roles name";

/** Scope for the profile endpoint X-Scope header (single value). */
const PROFILE_SCOPE = "with_roles";

/**
 * Build the MiData authorize URL that we redirect the user to.
 * We pass our own callback as redirect_uri and forward the original
 * client's state so we can correlate on return.
 */
export function buildAuthorizeUrl(
  env: EnvConfig,
  params: {
    state: string;
    callbackUrl: string;
  }
): string {
  const url = new URL(env.midataAuthorizeUrl);
  url.searchParams.set("client_id", env.midataClientId);
  url.searchParams.set("redirect_uri", params.callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", AUTHORIZE_SCOPES);
  url.searchParams.set("state", params.state);
  return url.toString();
}

/**
 * Exchange an authorization code from MiData for tokens.
 * MiData returns an opaque access_token (not a JWT).
 */
export async function exchangeCode(
  env: EnvConfig,
  code: string,
  callbackUrl: string
): Promise<{ access_token: string; token_type: string; expires_in?: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
    client_id: env.midataClientId,
    client_secret: env.midataClientSecret,
  });

  const res = await fetch(env.midataTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiData token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Fetch the user's profile from MiData's userinfo endpoint using the
 * opaque access token.
 */
export async function fetchUserInfo(
  env: EnvConfig,
  accessToken: string
): Promise<MiDataUserInfo> {
  const res = await fetch(env.midataUserinfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Scope": PROFILE_SCOPE,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiData userinfo failed (${res.status}): ${text}`);
  }

  return res.json();
}
