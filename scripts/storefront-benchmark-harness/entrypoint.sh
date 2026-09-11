#!/bin/bash
set -euo pipefail

# Docker creates the anonymous node_modules volume root-owned: the /workspace
# bind mount shadows image content at that path, so Docker's ownership copy-up
# never runs. Chown it here as root so the unprivileged bench user can install
# dependencies, then drop privileges for the benchmark itself.
mkdir -p /workspace/node_modules
chown bench:bench /workspace/node_modules

# Docker resolves HOME for the entrypoint user (root). The runner writes the
# OpenCode config under $HOME, so it must point at bench's home after the drop.
export HOME=/home/bench

exec setpriv --reuid=bench --regid=bench --init-groups node /runner/opencode-runner.ts "$@"
