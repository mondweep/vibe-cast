# Stage 1: Build TypeScript
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Production with Playwright
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ ./dist/

# Run as non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

CMD ["node", "dist/index.js"]
