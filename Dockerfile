# Stage 1: Build arnis from source with GeoTIFF + 1.18+ format patches
FROM rust:1.77-bookworm AS arnis-builder

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone --depth 1 https://github.com/louis-e/arnis.git

COPY arnis-patch/geotiff-elevation.patch /build/
RUN cd arnis && git apply ../geotiff-elevation.patch
RUN cd arnis && cargo build --no-default-features --release

# Stage 2: Runtime
FROM node:20-bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl zip gdal-bin && \
    rm -rf /var/lib/apt/lists/*

COPY --from=arnis-builder /build/arnis/target/release/arnis /usr/local/bin/arnis
RUN chmod +x /usr/local/bin/arnis

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY assets/ ./assets/

RUN mkdir -p /app/output

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV OUTPUT_DIR=/app/output

CMD ["node", "backend/server.js"]
