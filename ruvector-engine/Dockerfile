# RuVector Engine - CloudRun Deployment
# GPU-less Serverless Media Recommendation Engine

FROM node:20-alpine

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create app directory with correct ownership
WORKDIR /app
RUN chown nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Install dependencies (as nodejs user)
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --only=production

# Copy source code (as nodejs user)
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs config/ ./config/

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "src/index.js"]
