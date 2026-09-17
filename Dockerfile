# syntax=docker/dockerfile:1

# ── build ────────────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app

# Copy manifests first so the dependency layer caches independently of source.
COPY package.json package-lock.json ./
COPY packages/domain/package.json ./packages/domain/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci

COPY . .
# The domain is a project reference of the backend, so this builds both, in
# order, and fails if they disagree (ADR-004).
RUN npx tsc -b backend/tsconfig.json
RUN npm run build --workspace @somnus/frontend

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/domain/package.json ./packages/domain/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/backend/dist ./backend/dist
# The PWA is served from the same origin as the API: one deploy, no CORS.
COPY --from=build /app/frontend/dist ./backend/public

EXPOSE 8080
CMD ["node", "backend/dist/server.js"]
