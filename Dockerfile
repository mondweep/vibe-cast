# Build stage - build frontend
# Debian (glibc) base — @xenova/transformers -> onnxruntime-node ships glibc-only
# native binaries (needs ld-linux-x86-64.so.2), so Alpine/musl cannot run them.
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies. Regenerate the lockfile inside the Linux builder so
# platform-native optional deps (e.g. @rollup/rollup-linux-x64-gnu) resolve
# correctly — works around the npm optional-deps bug (npm/cli#4828) that omits
# non-host platform binaries when the lock is generated on macOS.
RUN rm -f package-lock.json && npm install --no-audit --no-fund

# Copy source code
COPY src ./src
COPY index.html ./
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js ./
# Client-safe Vite build-time env (Supabase publishable key + public URLs).
# Vite auto-loads .env.production in production build mode and inlines VITE_* vars.
COPY .env.production ./

# Build frontend (-> dist/) and bundle the backend to a single ESM file
# (-> dist/server/server.mjs). Bundling inlines all our imports so the runtime
# runs plain `node` with NO tsx — eliminating the intermittent tsx ESM resolver
# race (ERR_MODULE_NOT_FOUND on extensionless imports) that crashed startups.
RUN npm run build && npm run build:server

# Runtime stage - run full stack app (Debian/glibc — see builder note)
FROM node:20-slim

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only (regenerate lock to avoid cross-platform
# optional-dep gaps from the macOS-generated lock; --omit=dev keeps it lean)
RUN rm -f package-lock.json && npm install --omit=dev --no-audit --no-fund

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy source code (for backend server)
COPY src ./src

# Cloud Run sets PORT env var (default 8080), fallback to 3000
ENV PORT=${PORT:-8080}

# Expose port
EXPOSE ${PORT}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the prebundled API server with plain node (no tsx) — also serves the SPA.
CMD ["node", "dist/server/server.mjs"]
