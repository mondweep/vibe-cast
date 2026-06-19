# Multi-stage build for SkyWatch gateway service
# Stage 1: Build TypeScript
FROM node:22-alpine AS build
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY types ./types
COPY tsconfig.json tsconfig.build.json ./

# Build TypeScript to dist/
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy dependency files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy the browser front-end (served at GET /)
COPY public ./public

# Set environment
ENV NODE_ENV=production

# Run as non-root user
USER nodejs

# Expose gateway port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
