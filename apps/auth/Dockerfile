FROM oven/bun:1.3.11 AS base

FROM base AS installer
WORKDIR /app

# Copy workspace root files for dependency resolution
COPY package.json bun.lock ./
COPY apps/auth/package.json apps/auth/package.json
COPY packages/typescript-config/ packages/typescript-config/

RUN cd apps/auth && bun install

COPY apps/auth/src/ apps/auth/src/
COPY apps/auth/tsconfig.json apps/auth/tsconfig.json

RUN cd apps/auth && bun build src/index.ts --outdir dist --target bun

FROM base AS runner
WORKDIR /app
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=installer /app/apps/auth/dist/ ./dist/
EXPOSE 3002
ENV PORT=3002 HOSTNAME=0.0.0.0
CMD ["bun", "run", "dist/index.js"]
