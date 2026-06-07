# Build stage - build frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY index.html ./
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js ./

# Build frontend
RUN npm run build

# Runtime stage - run full stack app
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

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

# Start API server (via tsx, which runs TypeScript directly) — also serves the SPA frontend
CMD ["npx", "tsx", "src/api/server.ts"]
