FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g opencode-ai@1.14.30 pnpm@10.33.0

RUN useradd --create-home --shell /bin/bash bench

WORKDIR /workspace
COPY opencode-runner.ts entrypoint.sh /runner/
RUN chown -R bench:bench /runner \
  && chmod +x /runner/entrypoint.sh

# No USER directive: the entrypoint starts as root to fix ownership of the
# anonymous node_modules volume, then drops to bench via setpriv.
ENTRYPOINT ["/runner/entrypoint.sh"]
