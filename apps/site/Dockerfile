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

# Runtime on Node, not Bun: Puck's rich-text SSR pipeline pulls in
# `@tiptap/html/server` → `happy-dom`, which uses Node's `vm.Script` to
# bootstrap globals (SyntaxError, RangeError, …) onto its synthetic Window.
# Bun's `vm` impl doesn't fully run that bootstrap, so the Window has no
# `SyntaxError` and the moment any tiptap extension parses HTML the render
# crashes with `new this.window.SyntaxError(...)` → "undefined is not a
# constructor". Node runs happy-dom correctly.
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=installer /app/apps/site/.next/standalone ./
COPY --from=installer /app/apps/site/.next/static ./apps/site/.next/static
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/site/server.js"]
