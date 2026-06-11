FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g opencode-ai@1.14.30 pnpm@10.33.0

RUN useradd --create-home --shell /bin/bash bench

WORKDIR /workspace
COPY opencode-runner.ts /runner/
RUN chown -R bench:bench /runner

USER bench

ENTRYPOINT ["node", "/runner/opencode-runner.ts"]
