import {spawn} from 'node:child_process';
import path from 'node:path';

const STARTUP_TIMEOUT_IN_MS = 120_000;
const SIGKILL_GRACE_PERIOD_IN_MS = 5_000;

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

  constructor(options: DevServerOptions = {}) {
    this.id = options.id;
    this.storeKey = options.storeKey;
    this.port = options.port;
    this.projectPath =
      options.projectPath ?? path.join(__dirname, '../../templates/skeleton');
    this.customerAccountPush = options.customerAccountPush ?? false;
    this.envFile = options.envFile;
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

  start() {
    if (this.process) {
      throw new Error(`Server ${this.id} is already running`);
    }

    return new Promise((resolve, reject) => {
      // Spawn `shopify hydrogen dev` directly instead of via `npm run dev`
      // so we have full control over flags. The skeleton's npm script includes
      // `--codegen` which causes file write conflicts under parallel execution.
      const args = ['shopify', 'hydrogen', 'dev'];
      if (this.customerAccountPush) {
        args.push('--customer-account-push');
      }

      if (this.envFile) {
        args.push('--env-file', this.envFile);
      }

      this.process = spawn('npx', args, {
        cwd: this.projectPath,
        detached: true,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          SHOPIFY_HYDROGEN_FLAG_PORT: (
            this.port ?? OS_ASSIGNED_PORT
          ).toString(),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
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

      let localUrl: string | undefined;
      let tunnelUrl: string | undefined;

      const handleOutput = (output: string) => {
        if (!localUrl) {
          const match = output.match(/(http:\/\/localhost:(\d+))/);
          // Reject port 0 — it means the server echoed back the requested
          // OS_ASSIGNED_PORT before actually binding to an ephemeral one.
          if (match && match[2] !== String(OS_ASSIGNED_PORT)) {
            localUrl = match[1];
          }
        }
        if (this.customerAccountPush && !tunnelUrl) {
          tunnelUrl = output.match(/(https:\/\/[^\s]+)/)?.[1];
        }

        if (!started && output.includes('success')) {
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
          // Give the tunnel a bit more time to ensure everything is ready
          setTimeout(resolve, tunnelUrl ? 5000 : 0);
        }

        if (
          output.includes('log in to Shopify') ||
          output.includes('User verification code:')
        ) {
          clearTimeout(timeout);
          this.stop();
          reject(
            new Error(
              'Not logged in to Shopify CLI. Run: cd templates/skeleton && npx shopify auth login',
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
              'Storefront not linked. Run: cd templates/skeleton && npx shopify hydrogen link',
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

      this.process.on('exit', (code) => {
        if (!started) {
          clearTimeout(timeout);
          reject(new Error(`Server ${this.id} exited with code ${code}`));
        }
      });
    });
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
