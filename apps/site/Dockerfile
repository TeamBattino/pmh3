FROM oven/bun:1.3.11 AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN bunx turbo prune @pfadipuck/site --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN bun install
COPY --from=builder /app/out/full/ .
# No env validation on the site app today, but we pin the Mongo vars for
# symmetry with admin and future-proofing if strict env validation is added.
ENV MONGODB_CONNECTION_STRING=mongodb://build.invalid:27017 \
    MONGODB_DB_NAME=build
RUN bun run build --filter=@pfadipuck/site

FROM base AS runner
WORKDIR /app
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=installer /app/apps/site/.next/standalone ./
COPY --from=installer /app/apps/site/.next/static ./apps/site/.next/static
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["bun", "run", "apps/site/server.js"]
