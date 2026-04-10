FROM oven/bun:1 AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN bunx turbo prune @pfadipuck/site --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN bun install
COPY --from=builder /app/out/full/ .
RUN bun run build --filter=@pfadipuck/site

FROM base AS runner
WORKDIR /app
RUN apt update && apt install -y curl
COPY --from=installer /app/apps/site/.next/standalone ./
COPY --from=installer /app/apps/site/.next/static ./apps/site/.next/static
EXPOSE 3000
CMD ["bun", "run", "apps/site/server.js"]
