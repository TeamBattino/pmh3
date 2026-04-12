FROM oven/bun:1

WORKDIR /app

# Copy workspace root files for dependency resolution
COPY package.json bun.lock ./
COPY apps/auth/package.json apps/auth/package.json
COPY packages/typescript-config/ packages/typescript-config/

RUN cd apps/auth && bun install --frozen-lockfile --production

COPY apps/auth/src/ apps/auth/src/
COPY apps/auth/tsconfig.json apps/auth/tsconfig.json

EXPOSE 3002

CMD ["bun", "run", "apps/auth/src/index.ts"]
