# Storefront Benchmark Harness

Dockerized OpenCode harness for checking whether an isolated consumer agent can use Hydrogen from the outside.

## Run

OpenCode is the representative benchmark backend because it exercises a consumer-market agent tool with its own tool loop, skill discovery, permissions, thinking display, JSON events, and session export.

```bash
LLM_API_TOKEN=<token> LLM_API_BASE_URL=<url> pnpm benchmark:harness "Reply with ok"
```

Artifacts are written inside `.storefront-benchmark-workspace/`:

- `benchmark-opencode-events.jsonl` — raw `opencode run --format json` event stream.
- `benchmark-opencode-session.json` — `opencode export` session data when a session id is available.
- `benchmark-opencode-output.json` — harness summary.

While the container runs, the runner writes compact `[opencode] ...` event summaries and `[workspace] ...` file-change summaries to Docker stdout/stderr so you can watch tool calls, high-level actions, and generated-file changes live. The raw JSON event stream is still written to `benchmark-opencode-events.jsonl` for later debugging.

Docker runs have a configured host-side timeout. If a run stops producing live event summaries for several minutes, assume it may be wedged and inspect Docker stats/logs before waiting for the full timeout.

By default, OpenCode runs with `--pure --format json --thinking --dangerously-skip-permissions`. The runner closes stdin for the child process so `opencode run` starts from the prompt argument instead of waiting for interactive input. The container owns the isolation boundary; OpenCode owns agent behavior.

Before every OpenCode run, the host wrapper deletes `.storefront-benchmark-workspace/`, copies `workspace-template/` into it, builds `packages/hydrogen`, and packs the current package into `.storefront-benchmark-workspace/vendor/hydrogen.tgz`. The seeded app declares:

```json
"@shopify/hydrogen": "file:./vendor/hydrogen.tgz"
```

This keeps the fake dependency fully inside the Docker-mounted `/workspace` while exercising a normal package-manager install path. Inside the container, `pnpm install` extracts the tarball into `node_modules/@shopify/hydrogen/`, including the packaged `skills/` directory.

The Docker run mounts `/workspace/node_modules` as an anonymous container volume. Generated source files, lockfiles, and benchmark artifacts persist to `.storefront-benchmark-workspace/`, but container-installed dependencies do not. This avoids Linux native optional dependencies (for example Rolldown bindings) leaking into the macOS host workspace. To run the generated app locally after a benchmark, run `pnpm install` in `.storefront-benchmark-workspace/` first.

The current template seeds:

- A Vite + TypeScript + Tailwind + React Router framework-mode app.
- React Router example public vendor assets for Standard Actions, Standard Events, consent tracking, and the storefront banner. `app/root.tsx` loads `/standard-actions.js` and `/standard-actions-tools.js` so `window.Shopify.actions` exists before generated Hydrogen code runs.
- `AGENTS.md` with benchmark-only agent instructions.
- `.opencode/skills/benchmark-canary/SKILL.md` to verify skill discovery/loading.

Required LLM environment variables:

- `LLM_API_TOKEN` is the API token passed to OpenCode's Anthropic-compatible provider config.
- `LLM_API_BASE_URL` is the Anthropic-compatible HTTPS base URL passed to OpenCode. It must not include credentials, query parameters, or a fragment.

Use a scoped, short-lived `LLM_API_TOKEN` when possible. OpenCode needs direct provider credentials for this harness, and the benchmark intentionally grants broad agent permissions inside the container.

Optional OpenCode environment variables:

- `OPENCODE_MODEL` defaults to `anthropic/claude-opus-4-6`.
- `OPENCODE_VARIANT` passes through to `opencode run --variant`.
- `BENCHMARK_DISABLE_THINKING=true` omits `--thinking`.
- `BENCHMARK_OPENCODE_EVENTS_PATH`, `BENCHMARK_OPENCODE_SESSION_PATH`, and `BENCHMARK_OPENCODE_OUTPUT_PATH` override artifact paths.

Optional flags:

- `--workspace <path>` mounts a specific generated workspace into the container.
- `--image <tag>` overrides the Docker image tag.
- `--skip-build` reuses an existing local image.

The host wrapper checks Docker before building. If Docker is installed but the daemon is not reachable, the wrapper automatically tries a running default Colima socket at `~/.colima/default/docker.sock`. If neither path works, start Docker Desktop or Rancher Desktop, then retry. If you prefer Colima and it is not installed, run `brew install colima docker docker-buildx`, then `colima start`.

## Scope

Phase 2 intentionally uses OpenCode instead of rebuilding an agent tool loop in the harness. The seeded workspace verifies that OpenCode can read `AGENTS.md`, local skills, and a realistic React Router app with a local npm-style Hydrogen tarball dependency. The expected setup flow inside Docker is `pnpm install`, `pnpm hydrogen setup`, then the `hydrogen-setup` skill.
