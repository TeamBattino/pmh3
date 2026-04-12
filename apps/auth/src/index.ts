import { Hono } from "hono";
import { logger } from "hono/logger";
import { loadEnv } from "./env";
import { initKeys } from "./lib/jwt";
import { initDb } from "./lib/db";
import { discoveryRoutes } from "./routes/discovery";
import { authorizeRoutes } from "./routes/authorize";
import { callbackRoutes } from "./routes/callback";
import { tokenRoutes } from "./routes/token";
import { userinfoRoutes } from "./routes/userinfo";

const env = loadEnv();

// Initialize keys and database before accepting requests
await initKeys(env.signingKeyPem);
await initDb(env.mongoConnectionString, env.mongoDbName);

const app = new Hono();

app.use("*", logger());

// Mount routes
app.route("/", discoveryRoutes(env));
app.route("/", authorizeRoutes(env));
app.route("/", callbackRoutes(env));
app.route("/", tokenRoutes(env));
app.route("/", userinfoRoutes());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

console.log(`Auth service listening on port ${env.port}`);
console.log(`Issuer: ${env.issuerUrl}`);
console.log(`MiData upstream: ${env.midataAuthorizeUrl}`);

export default {
  port: env.port,
  fetch: app.fetch,
};
