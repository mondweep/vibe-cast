FROM node:20-slim

# Install build tools needed for better-sqlite3 native module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

# Copy application code
COPY server/ ./server/
COPY index.html ./

EXPOSE 3000

CMD ["node", "server/server.js"]
