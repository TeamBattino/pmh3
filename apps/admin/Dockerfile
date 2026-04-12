FROM oven/bun:1.3.11 AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN bunx turbo prune @pfadipuck/admin --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN bun install
COPY --from=builder /app/out/full/ .
# Env vars required by `@t3-oss/env-nextjs` strict validation at module load.
# `next build` never actually talks to Mongo or OIDC (lazy db + ISR), so these
# are placeholders — real runtime values are provided by the container env.
ENV AUTH_SECRET=build-placeholder \
    MONGODB_CONNECTION_STRING=mongodb://build.invalid:27017 \
    MONGODB_DB_NAME=build \
    AUTH_OIDC_ISSUER=http://build.invalid/default \
    AUTH_OIDC_CLIENT_ID=build-placeholder \
    AUTH_OIDC_CLIENT_SECRET=build-placeholder \
    S3_ENDPOINT=http://build.invalid \
    S3_BUCKET=build-placeholder \
    S3_REGION=auto \
    S3_ACCESS_KEY_ID=build-placeholder \
    S3_SECRET_ACCESS_KEY=build-placeholder
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
# they must be real values (not placeholders). Pipe Railway's env var in as
# a build arg.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN bun run build --filter=@pfadipuck/admin

FROM base AS runner
WORKDIR /app
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=installer /app/apps/admin/.next/standalone ./
COPY --from=installer /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=installer /app/apps/admin/public ./apps/admin/public
EXPOSE 3001
ENV PORT=3001 HOSTNAME=0.0.0.0
CMD ["bun", "run", "apps/admin/server.js"]
