import {spawn} from 'node:child_process';
import path from 'node:path';

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
  port: number;
  projectPath: string;
  customerAccountPush: boolean;
  capturedUrl?: string;
  id?: number;
  envFile?: string;
  storeKey?: string;

  constructor(options: DevServerOptions = {}) {
    this.id = options.id;
    this.storeKey = options.storeKey;
    this.port = options.port ?? 3100;
    this.projectPath =
      options.projectPath ?? path.join(__dirname, '../../templates/skeleton');
    this.customerAccountPush = options.customerAccountPush ?? false;
    this.envFile = options.envFile;
  }

  getUrl() {
    return this.capturedUrl || `http://localhost:${this.port}`;
  }

  start() {
    if (this.process) {
      throw new Error(`Server ${this.id} is already running`);
    }

    return new Promise((resolve, reject) => {
      const args = ['run', 'dev', '--'];
      if (this.customerAccountPush) {
        args.push('--customer-account-push');
      }

      if (this.envFile) {
        args.push('--env-file', this.envFile);
      }

      this.process = spawn('npm', args, {
        cwd: this.projectPath,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          SHOPIFY_HYDROGEN_FLAG_PORT: this.port.toString(),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          this.stop();
          reject(new Error(`Server ${this.id} failed to start within timeout`));
        }
      }, 60000);

      let localUrl: string | undefined;
      let tunnelUrl: string | undefined;

      const handleOutput = (output: string) => {
        if (!localUrl) {
          localUrl = output.match(/(http:\/\/localhost:\d+)/)?.[1];
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
          // !started && console.log(output);
          handleOutput(output);
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const output = data.toString();
          // !started && console.log(output);
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
      if (!this.process) return resolve(false);
      console.log(`[test-server ${this.id}] Stopping server...`);

      this.process.on('exit', () => {
        this.process = undefined;
        resolve(true);
      });

      this.process.kill('SIGTERM');

      setTimeout(() => {
        this.process?.kill('SIGKILL');
      }, 5000);
    });
  }
}
