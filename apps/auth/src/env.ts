import type { EnvConfig } from "./types";

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function loadEnv(): EnvConfig {
  return {
    port: Number(optional("AUTH_PORT", "3002")),
    issuerUrl: required("AUTH_ISSUER_URL"),

    midataAuthorizeUrl: required("MIDATA_AUTHORIZE_URL"),
    midataTokenUrl: required("MIDATA_TOKEN_URL"),
    midataUserinfoUrl: required("MIDATA_USERINFO_URL"),
    midataClientId: required("MIDATA_CLIENT_ID"),
    midataClientSecret: required("MIDATA_CLIENT_SECRET"),

    mongoConnectionString: required("MONGODB_CONNECTION_STRING"),
    mongoDbName: required("MONGODB_DB_NAME"),

    signingKeyPem: process.env.AUTH_SIGNING_KEY_PEM,
  };
}
