import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STARTUP_TIMEOUT_IN_MS = 120_000;
const SIGKILL_GRACE_PERIOD_IN_MS = 5_000;
// Accept both tunnel hostnames: cloudflared quick-tunnels expose a
// *.trycloudflare.com URL, while the Shopify CLI `--customer-account-push`
// flag produced *.tryhydrogen.dev URLs via a Shopify-managed tunnel.
const TUNNEL_URL_PATTERN = /(https:\/\/[\w-]+\.(?:trycloudflare\.com|tryhydrogen\.dev))\b/;
const TUNNEL_POLL_INTERVAL_IN_MS = 1_000;
export const TUNNEL_READY_TIMEOUT_IN_MS = 90_000;
const TUNNEL_FETCH_TIMEOUT_IN_MS = 10_000;
const fixturesRoot = fileURLToPath(new URL(".", import.meta.url));
const HYDROGEN_EXAMPLE_ROOT = path.resolve(fixturesRoot, "../..");

// Status codes that indicate the tunnel is NOT routing to the origin yet.
// Includes Cloudflare's proprietary 520-530 range (origin unreachable) and
// standard gateway errors (502, 504) which Cloudflare's edge also returns
// when the tunnel connector hasn't stabilized. A healthy Hydrogen dev server
// never produces these codes — they always come from the proxy layer.
const TUNNEL_NOT_READY_STATUS_CODES = new Set([502, 504, ...range(520, 530)]);

// Passing port 0 to the OS (via listen(0)) tells it to assign any available
// ephemeral port. This is a standard POSIX convention.
const OS_ASSIGNED_PORT = 0;

type DevServerOptions = {
  id?: number;
  port?: number;
  projectPath?: string;
  customerAccountPush?: boolean;
  envFile?: string;
  storeKey?: string;
  entry?: string;
};

export class DevServer {
  process: ReturnType<typeof spawn> | undefined;
  tunnelProcess: ReturnType<typeof spawn> | undefined;
  port: number | undefined;
  projectPath: string;
  customerAccountPush: boolean;
  capturedUrl?: string;
  id?: number;
  envFile?: string;
  storeKey?: string;
  entry?: string;

  constructor(options: DevServerOptions = {}) {
    this.id = options.id;
    this.storeKey = options.storeKey;
    this.port = options.port;
    this.projectPath = options.projectPath ?? HYDROGEN_EXAMPLE_ROOT;
    this.customerAccountPush = options.customerAccountPush ?? false;
    this.envFile = options.envFile;
    this.entry = options.entry;
  }

  getUrl() {
    if (this.capturedUrl) return this.capturedUrl;
    if (this.port === undefined) {
      throw new Error(
        `Server ${this.id} has not started yet — cannot determine URL with dynamic port allocation`,
      );
    }
    return `http://localhost:${this.port}`;
  }

  async start() {
    if (this.process) {
      throw new Error(`Server ${this.id} is already running`);
    }

    // Tunnel-based tests need a known port so cloudflared and Vite bind to
    // the same origin. Pre-allocate one to avoid depending on port 3000 being
    // free. Non-tunnel tests use port 0 (OS-assigned) for parallel safety.
    const allocatedPort =
      this.port ?? (this.customerAccountPush ? await findAvailablePort() : OS_ASSIGNED_PORT);

    if (this.customerAccountPush) {
      console.log(`[test-server] Pre-allocated port ${allocatedPort} for tunnel test`);
    }

    // Parse the env file (replaces the CLI's --env-file flag): vite.config.ts
    // reads HYDROGEN_E2E_ENV_VARS and passes it to oxygen({ env }), so only the
    // env-file vars reach the worker, not the whole process.env (CI secrets).
    const envFileVars = this.envFile ? await parseEnvFile(this.envFile) : {};

    const { promise, resolve, reject } = Promise.withResolvers<void>();

    // Use react-router's own dev script (the Shopify CLI 4.x dropped
    // `shopify hydrogen dev`). NO_COLOR keeps Vite's readiness banner plain so
    // the port regex matches — CI enables colour, which bolds the port.
    const args = ["exec", "react-router", "dev", "--port", String(allocatedPort)];
    if (this.customerAccountPush) {
      args.push("--strictPort");
    }

    this.process = spawn("pnpm", args, {
      cwd: this.projectPath,
      detached: true,
      env: {
        ...process.env,
        NODE_ENV: "development",
        NO_COLOR: "1",
        INIT_CWD: this.projectPath,
        ...(this.entry ? { HYDROGEN_E2E_ENTRY: this.entry } : {}),
        ...(this.envFile ? { HYDROGEN_E2E_ENV_VARS: JSON.stringify(envFileVars) } : {}),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        this.stop();
        reject(
          new Error(
            `Server ${this.id} failed to start within ${STARTUP_TIMEOUT_IN_MS / 1000}s timeout`,
          ),
        );
      }
    }, STARTUP_TIMEOUT_IN_MS);

    // Vite prints "➜  Local:   http://localhost:PORT/" once ready. Take the
    // first non-zero port: port 0 is the OS_ASSIGNED_PORT echoed back before an
    // ephemeral one is bound, and it can share a chunk with the real URL.
    const handleOutput = (output: string) => {
      if (started) return;
      let match: RegExpMatchArray | undefined;
      for (const candidate of output.matchAll(/http:\/\/localhost:(\d+)/g)) {
        if (candidate[1] !== String(OS_ASSIGNED_PORT)) {
          match = candidate;
          break;
        }
      }
      if (!match) return;

      started = true;
      clearTimeout(timeout);
      const localUrl = match[0];
      const port = parseInt(match[1], 10);
      this.port = port;
      if (!this.id) {
        this.id = port || parseInt((Math.random() * 1000).toFixed(0), 10);
      }

      if (this.customerAccountPush) {
        // Spawn a cloudflared quick-tunnel (replaces --customer-account-push).
        this.startTunnel(port).then(
          (tunnelUrl) => {
            this.capturedUrl = tunnelUrl;
            console.log(`[test-server ${this.id}] Tunnel started: ${tunnelUrl} [${this.storeKey}]`);
            waitForTunnelReady(tunnelUrl).then(resolve, reject);
          },
          (error) => {
            this.stop();
            reject(error);
          },
        );
        return;
      }

      this.capturedUrl = localUrl;
      console.log(`[test-server ${this.id}] Server started on ${localUrl} [${this.storeKey}]`);
      resolve(undefined);
    };

    this.process.stdout?.on("data", (data) => handleOutput(data.toString()));
    this.process.stderr?.on("data", (data) => handleOutput(data.toString()));

    this.process.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    this.process.on("exit", (code) => {
      if (!started) {
        clearTimeout(timeout);
        reject(new Error(`Server ${this.id} exited with code ${code}`));
      }
    });

    return promise;
  }

  /**
   * Spawns a cloudflared quick-tunnel exposing the local dev server. Resolves
   * with the tunnel URL once cloudflared prints it. Replaces the
   * `--customer-account-push` tunnel that the Shopify Hydrogen CLI used to run.
   */
  private startTunnel(localPort: number): Promise<string> {
    const { promise, resolve, reject } = Promise.withResolvers<string>();

    this.tunnelProcess = spawn(
      "cloudflared",
      ["tunnel", "--url", `http://localhost:${localPort}`],
      {
        cwd: this.projectPath,
        detached: true,
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    const tunnelTimeout = setTimeout(() => {
      this.stopTunnel();
      reject(new Error(`Tunnel failed to start within ${TUNNEL_READY_TIMEOUT_IN_MS / 1000}s`));
    }, TUNNEL_READY_TIMEOUT_IN_MS);

    const handleTunnelOutput = (output: string) => {
      const match = output.match(TUNNEL_URL_PATTERN);
      if (match) {
        clearTimeout(tunnelTimeout);
        resolve(match[1]);
      }
    };

    this.tunnelProcess.stdout?.on("data", (data) => handleTunnelOutput(data.toString()));
    this.tunnelProcess.stderr?.on("data", (data) => handleTunnelOutput(data.toString()));
    this.tunnelProcess.on("error", (error) => {
      clearTimeout(tunnelTimeout);
      reject(error);
    });

    return promise;
  }

  private stopTunnel() {
    if (!this.tunnelProcess?.pid) {
      this.tunnelProcess = undefined;
      return;
    }
    try {
      process.kill(-this.tunnelProcess.pid, "SIGTERM");
    } catch {
      // Process already dead
    }
    this.tunnelProcess = undefined;
  }

  stop() {
    this.stopTunnel();
    return new Promise((resolve) => {
      if (!this.process?.pid) {
        this.process = undefined;
        return resolve(false);
      }

      // Capture PID upfront to avoid non-null assertion races between
      // the exit handler (which clears this.process) and the SIGKILL timeout.
      const pid = this.process.pid;
      console.log(`[test-server ${this.id}] Stopping server...`);

      // If the process already exited (e.g. dev server crashed during a test),
      // the exit listener would never fire and this promise would hang forever.
      if (this.process.exitCode !== null) {
        this.process = undefined;
        return resolve(true);
      }

      const killTimeoutId = setTimeout(() => {
        try {
          process.kill(-pid, "SIGKILL");
        } catch {
          // Process already dead
        }
        // Whether SIGKILL succeeded or the process was already dead,
        // we've done everything we can. Resolve to unblock teardown.
        this.process = undefined;
        resolve(false);
      }, SIGKILL_GRACE_PERIOD_IN_MS);

      this.process.on("exit", () => {
        clearTimeout(killTimeoutId);
        this.process = undefined;
        resolve(true);
      });

      // Kill the entire process group (negative PID) so child processes
      // (vite, workerd, etc.) are also terminated, not just the npm parent.
      try {
        process.kill(-pid, "SIGTERM");
      } catch {
        try {
          this.process.kill("SIGTERM");
        } catch {
          // Process already dead
        }
      }
    });
  }
}

/**
 * Parses a KEY="value" env file into a record. Replaces the `--env-file` flag
 * the Shopify Hydrogen CLI used to accept. The result is JSON-encoded into
 * HYDROGEN_E2E_ENV_VARS, which vite.config.ts passes to oxygen({ env }).
 */
async function parseEnvFile(filePath: string): Promise<Record<string, string>> {
  const content = await readFile(filePath, "utf8");
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip a single layer of matching surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) vars[key] = value;
  }
  return vars;
}

// Cloudflare quick-tunnels propagate across edge servers gradually. A single
// successful probe can hit one edge while the browser hits another that hasn't
// propagated yet (Error 1016). Require consecutive successes to confirm the
// tunnel is stable across the edge network.
const CONSECUTIVE_SUCCESSES_REQUIRED = 3;

async function waitForTunnelReady(url: string): Promise<void> {
  const startTimeInMs = Date.now();
  let consecutiveSuccesses = 0;

  while (Date.now() - startTimeInMs < TUNNEL_READY_TIMEOUT_IN_MS) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(TUNNEL_FETCH_TIMEOUT_IN_MS),
      });

      if (TUNNEL_NOT_READY_STATUS_CODES.has(response.status)) {
        consecutiveSuccesses = 0;
        const elapsedInMs = Date.now() - startTimeInMs;
        console.log(
          `[tunnel-health] ${url} returned ${response.status} after ${(elapsedInMs / 1000).toFixed(1)}s — tunnel not yet routing`,
        );
      } else {
        consecutiveSuccesses++;
        const elapsedInMs = Date.now() - startTimeInMs;
        console.log(
          `[tunnel-health] ${url} responded with status ${response.status} after ${(elapsedInMs / 1000).toFixed(1)}s — ${consecutiveSuccesses}/${CONSECUTIVE_SUCCESSES_REQUIRED} consecutive`,
        );
        if (consecutiveSuccesses >= CONSECUTIVE_SUCCESSES_REQUIRED) {
          console.log(`[tunnel-health] Tunnel is stable — proceeding`);
          return;
        }
      }
    } catch (error: unknown) {
      consecutiveSuccesses = 0;
      const elapsedInMs = Date.now() - startTimeInMs;
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `[tunnel-health] ${url} not ready after ${(elapsedInMs / 1000).toFixed(1)}s: ${message}`,
      );
    }
    await new Promise((r) => setTimeout(r, TUNNEL_POLL_INTERVAL_IN_MS));
  }

  const actualElapsedInMs = Date.now() - startTimeInMs;
  throw new Error(
    `[tunnel-health] ${url} did not stabilize within ${(actualElapsedInMs / 1000).toFixed(1)}s (limit: ${TUNNEL_READY_TIMEOUT_IN_MS / 1000}s)`,
  );
}

/** Inclusive integer range: range(1, 3) → [1, 2, 3] */
function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const DEFAULT_PORT_RANGE_START = 3100;
const PORT_RANGE_SIZE = 100;

/**
 * Finds an available port in the 3100-3200 range. Uses the same low range as
 * the CLI's default (3000+) because cloudflared quick-tunnels have been
 * observed to fail with high ephemeral ports (50000+) on some systems.
 */
function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port > DEFAULT_PORT_RANGE_START + PORT_RANGE_SIZE) {
        return reject(
          new Error(
            `No available port in range ${DEFAULT_PORT_RANGE_START}-${DEFAULT_PORT_RANGE_START + PORT_RANGE_SIZE}`,
          ),
        );
      }
      const server = createServer();
      server.once("error", () => tryPort(port + 1));
      server.listen(port, () => {
        server.close(() => resolve(port));
      });
    };
    tryPort(DEFAULT_PORT_RANGE_START);
  });
}
