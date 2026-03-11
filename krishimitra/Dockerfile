FROM node:20-slim

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

# Copy application code
COPY server/ ./server/
COPY index.html ./

EXPOSE 3000

CMD ["node", "server/server.js"]
