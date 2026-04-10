FROM oven/bun:1 AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN bunx turbo prune @pfadipuck/admin --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN bun install
COPY --from=builder /app/out/full/ .
RUN bun run build --filter=@pfadipuck/admin

FROM base AS runner
WORKDIR /app
RUN apt update && apt install -y curl
COPY --from=installer /app/apps/admin/.next/standalone ./
COPY --from=installer /app/apps/admin/.next/static ./apps/admin/.next/static
EXPOSE 3001
CMD ["bun", "run", "apps/admin/server.js"]
