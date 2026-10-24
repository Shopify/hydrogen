import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';
import {stripVTControlCharacters} from 'node:util';

export const STARTUP_TIMEOUT_IN_MS = 120_000;
// Enough for the CLI's final error and its stack, without letting a chatty
// server flood the Playwright report.
const STARTUP_OUTPUT_TAIL_IN_CHARS = 4_000;
const SIGKILL_GRACE_PERIOD_IN_MS = 5_000;
// A transient startup crash recurring this many times in a row is not
// transient, so give up and surface it instead of retrying forever.
export const MAX_STARTUP_ATTEMPTS = 3;
const TUNNEL_URL_PATTERN = /(https:\/\/[\w-]+\.tryhydrogen\.dev)\b/;
const TUNNEL_POLL_INTERVAL_IN_MS = 1_000;
export const TUNNEL_READY_TIMEOUT_IN_MS = 90_000;
const TUNNEL_FETCH_TIMEOUT_IN_MS = 10_000;

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
    this.projectPath =
      options.projectPath ?? path.join(__dirname, '../../templates/skeleton');
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

  /**
   * Starts the dev server, retrying when it crashes before it is ready.
   *
   * Playwright workers start servers in the same project directory, and the
   * startup work they share on disk can collide. React Router's type
   * generation, for example, deletes and rewrites `.react-router/types` on
   * every start, and an overlapping start fails with ENOTEMPTY. Those crashes
   * are transient, so another attempt usually succeeds. Timeouts and Shopify
   * CLI setup errors are not retried because another attempt cannot fix them.
   */
  async start() {
    for (let attempt = 1; attempt < MAX_STARTUP_ATTEMPTS; attempt++) {
      try {
        return await this.startOnce();
      } catch (error) {
        if (!(error instanceof EarlyExitError)) throw error;
        console.log(
          `[test-server] ${error.summary} Retrying (attempt ${attempt + 1} of ${MAX_STARTUP_ATTEMPTS}).`,
        );
        await this.stop();
      }
    }

    return this.startOnce();
  }

  private async startOnce() {
    if (this.process) {
      throw new Error(`Server ${this.id} is already running`);
    }

    // Tunnel-based tests need a known port so cloudflared and Vite bind to
    // the same origin. Pre-allocate one to avoid depending on port 3000 being
    // free. Non-tunnel tests use port 0 (OS-assigned) for parallel safety.
    const allocatedPort =
      this.port ??
      (this.customerAccountPush ? await findAvailablePort() : OS_ASSIGNED_PORT);

    if (this.customerAccountPush) {
      console.log(
        `[test-server] Pre-allocated port ${allocatedPort} for tunnel test`,
      );
    }

    return new Promise((resolve, reject) => {
      const pnpmArgs = ['exec', 'shopify', 'hydrogen', 'dev'];
      if (this.customerAccountPush) {
        pnpmArgs.push('--customer-account-push');
      }

      if (this.envFile) {
        pnpmArgs.push('--env-file', this.envFile);
      }

      if (this.entry) {
        pnpmArgs.push('--entry', this.entry);
      }

      const {command, args} = getPnpmCommand(pnpmArgs);
      this.process = spawn(command, args, {
        cwd: this.projectPath,
        detached: true,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          SHOPIFY_HYDROGEN_FLAG_PORT: allocatedPort.toString(),
          INIT_CWD: this.projectPath,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let started = false;
      // The CLI's own error is the only clue to why startup failed, so keep
      // the end of its output until the server is ready.
      let startupOutput = '';
      const timeout = setTimeout(() => {
        if (!started) {
          this.stop();
          reject(
            new Error(
              `${this.startupLabel()} failed to start within ${STARTUP_TIMEOUT_IN_MS / 1000}s timeout.${describeStartupOutput(startupOutput)}`,
            ),
          );
        }
      }, STARTUP_TIMEOUT_IN_MS);

      let localUrl: string | undefined;
      let tunnelUrl: string | undefined;

      const handleOutput = (output: string) => {
        if (!started) {
          startupOutput = keepTail(startupOutput + output);
        }

        if (!localUrl) {
          const match = output.match(/(http:\/\/localhost:(\d+))/);
          // Reject port 0 — it means the server echoed back the requested
          // OS_ASSIGNED_PORT before actually binding to an ephemeral one.
          if (match && match[2] !== String(OS_ASSIGNED_PORT)) {
            localUrl = match[1];
          }
        }
        if (this.customerAccountPush && !tunnelUrl) {
          const match = output.match(TUNNEL_URL_PATTERN);
          if (match) {
            tunnelUrl = match[1];
            console.log(`[test-server] Captured tunnel URL: ${tunnelUrl}`);
          }
        }

        if (!started && output.includes('View') && output.includes('app:')) {
          started = true;
          clearTimeout(timeout);
          this.capturedUrl = tunnelUrl || localUrl;
          const port = this.capturedUrl?.match(/:(\d+)/)?.[1];
          if (port) {
            this.port = parseInt(port, 10);
          }
          if (!this.id) {
            this.id =
              this.port || parseInt((Math.random() * 1000).toFixed(0), 10);
          }
          console.log(
            `[test-server ${this.id}] Server started on ${this.capturedUrl} [${this.storeKey}]`,
          );
          if (tunnelUrl) {
            waitForTunnelReady(tunnelUrl).then(resolve, reject);
          } else {
            resolve(undefined);
          }
        }

        if (
          output.includes('log in to Shopify') ||
          output.includes('User verification code:')
        ) {
          clearTimeout(timeout);
          this.stop();
          reject(
            new Error(
              'Not logged in to Shopify CLI. Run: cd templates/skeleton && pnpm exec shopify auth login',
            ),
          );
        } else if (
          output.includes('Failed to prompt') ||
          output.includes('Select a shop to log in')
        ) {
          clearTimeout(timeout);
          this.stop();
          reject(
            new Error(
              'Storefront not linked. Run: cd templates/skeleton && pnpm exec shopify hydrogen link',
            ),
          );
        }
      };

      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          const output = data.toString();
          handleOutput(output);
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const output = data.toString();
          handleOutput(output);
        });
      }

      this.process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.process.on('exit', (code, signal) => {
        if (!started) {
          clearTimeout(timeout);
          const exitReason = signal
            ? `was killed by ${signal}`
            : `exited with code ${code}`;
          reject(
            new EarlyExitError(
              `${this.startupLabel()} ${exitReason} before it was ready.`,
              startupOutput,
            ),
          );
        }
      });
    });
  }

  /**
   * `id` is only assigned once the server reports its port, so startup
   * failures are labelled by store and project instead. Recipe fixtures share
   * a store, so the project directory is what tells them apart.
   */
  private startupLabel() {
    const store = this.storeKey ? ` for ${this.storeKey}` : '';
    return `Dev server${store} in ${path.basename(this.projectPath)}`;
  }

  stop() {
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
          process.kill(-pid, 'SIGKILL');
        } catch {
          // Process already dead
        }
        // Whether SIGKILL succeeded or the process was already dead,
        // we've done everything we can. Resolve to unblock teardown.
        this.process = undefined;
        resolve(false);
      }, SIGKILL_GRACE_PERIOD_IN_MS);

      this.process.on('exit', () => {
        clearTimeout(killTimeoutId);
        this.process = undefined;
        resolve(true);
      });

      // Kill the entire process group (negative PID) so child processes
      // (vite, workerd, etc.) are also terminated, not just the npm parent.
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        try {
          this.process.kill('SIGTERM');
        } catch {
          // Process already dead
        }
      }
    });
  }
}

/** The dev server process ended before it reported that it was ready. */
class EarlyExitError extends Error {
  /** One line for logs: what happened and the CLI's final line of output. */
  readonly summary: string;

  constructor(reason: string, startupOutput: string) {
    super(`${reason}${describeStartupOutput(startupOutput)}`);
    this.name = 'EarlyExitError';
    const lastOutputLine = stripVTControlCharacters(startupOutput)
      .trim()
      .split('\n')
      .at(-1);
    this.summary = lastOutputLine ? `${reason} ${lastOutputLine}` : reason;
  }
}

function keepTail(output: string) {
  return output.slice(-STARTUP_OUTPUT_TAIL_IN_CHARS);
}

function describeStartupOutput(output: string) {
  const readableOutput = stripVTControlCharacters(output).trim();
  return readableOutput
    ? `\nLast dev server output:\n${readableOutput}`
    : '\nThe dev server produced no output.';
}

function getPnpmCommand(args: string[]) {
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath?.includes('pnpm')) {
    return npmExecPath.match(/\.[cm]?js$/)
      ? {command: process.execPath, args: [npmExecPath, ...args]}
      : {command: npmExecPath, args};
  }

  const executable = process.env.PNPM_HOME
    ? path.join(
        process.env.PNPM_HOME,
        process.platform === 'win32' ? 'pnpm.CMD' : 'pnpm',
      )
    : 'pnpm';

  return {command: executable, args};
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
        method: 'HEAD',
        redirect: 'manual',
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
  return Array.from({length: end - start + 1}, (_, i) => start + i);
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
      server.once('error', () => tryPort(port + 1));
      server.listen(port, () => {
        server.close(() => resolve(port));
      });
    };
    tryPort(DEFAULT_PORT_RANGE_START);
  });
}
