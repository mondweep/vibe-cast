# Cloud Run image: serves the demo site AND runs the demos live on request.
#
# Use this instead of the Netlify static deploy when you want the team to
# press a button and watch the code actually execute, rather than read
# captured output. Costs a container; the Netlify route costs nothing.
#
#   gcloud run deploy rvm-demos --source . --allow-unauthenticated --region <region>

# --- build stage -----------------------------------------------------------
FROM rust:1.94-slim-bookworm AS build

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# rvm is a sibling checkout, matching the layout the demos expect (../rvm).
ARG RVM_REV=78acb36d3d906b098b2074b8aecf9ff88c2af4e0
RUN git clone https://github.com/ruvnet/rvm.git /rvm \
    && git -C /rvm checkout --quiet ${RVM_REV}

# Demos resolve rvm at ../rvm relative to the workspace root.
WORKDIR /work/vibe-cast
RUN mkdir -p /work && ln -s /rvm /work/rvm

COPY Cargo.toml Cargo.lock ./
COPY demos ./demos
# Demo 4 is bare metal (aarch64 + QEMU) and is not built here; the site
# serves its captured boot output instead.
RUN cargo build --release --workspace

# --- runtime stage ---------------------------------------------------------
FROM python:3.12-slim-bookworm

RUN useradd --create-home --uid 10001 app
WORKDIR /app

COPY --from=build /work/vibe-cast/target/release/demo-* /app/bin/
COPY web /app/web

# Drop build artefacts that are not executables.
RUN find /app/bin -type f ! -perm -u+x -delete && chown -R app:app /app

USER app
ENV PORT=8080
EXPOSE 8080
CMD ["python3", "/app/web/server.py"]
