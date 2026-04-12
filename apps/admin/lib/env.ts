import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().min(1),
    MONGODB_CONNECTION_STRING: z.string().min(1),
    MONGODB_DB_NAME: z.string().min(1),
    AUTH_OIDC_ISSUER: z.string().url(),
    AUTH_OIDC_CLIENT_ID: z.string().min(1),
    AUTH_OIDC_CLIENT_SECRET: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    // S3-compatible storage (Railway bucket in prod, MinIO in dev)
    S3_ENDPOINT: z.string().url(),
    S3_BUCKET: z.string().min(1),
    S3_REGION: z.string().min(1).default("auto"),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
  },
  client: {
    // Add NEXT_PUBLIC_ variables here
  },
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    MONGODB_CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    AUTH_OIDC_ISSUER: process.env.AUTH_OIDC_ISSUER,
    AUTH_OIDC_CLIENT_ID: process.env.AUTH_OIDC_CLIENT_ID,
    AUTH_OIDC_CLIENT_SECRET: process.env.AUTH_OIDC_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  },
  emptyStringAsUndefined: true,
});
