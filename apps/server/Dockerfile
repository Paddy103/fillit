# ── Stage 1: Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# ── Stage 2: Dependencies ────────────────────────────────────────────
FROM base AS deps

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for workspace packages we need
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Install all dependencies (including devDependencies for build)
# in a separate layer so we can copy only prod deps to final image
FROM base AS all-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# ── Stage 3: Build ───────────────────────────────────────────────────
FROM all-deps AS build

# Copy tsconfig files
COPY tsconfig.base.json ./
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY apps/server/tsconfig.json apps/server/tsconfig.json

# Copy source code
COPY packages/shared/src packages/shared/src
COPY apps/server/src apps/server/src

# Build shared package first (server depends on it)
RUN pnpm --filter @fillit/shared build

# Build server
RUN pnpm --filter @fillit/server build

# ── Stage 4: Production ─────────────────────────────────────────────
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json

# Copy production-only node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy compiled output
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Patch shared package.json exports to point to compiled dist output.
# In development, exports point to src/index.ts for TypeScript tooling,
# but at runtime Node needs the compiled JS files.
RUN cd packages/shared && \
    node -e " \
      const pkg = JSON.parse(require('fs').readFileSync('package.json','utf8')); \
      pkg.main = 'dist/index.js'; \
      pkg.types = 'dist/index.d.ts'; \
      pkg.exports = { '.': { types: './dist/index.d.ts', default: './dist/index.js' } }; \
      require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n'); \
    "

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/apps/server
CMD ["node", "dist/index.js"]
