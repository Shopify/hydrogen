import {spawn} from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DevServer {
  constructor(options = {}) {
    this.process = null;
    this.port = options.port ?? 3000;
    this.projectPath =
      options.projectPath ?? path.join(__dirname, '../templates/skeleton');
    this.customerAccountPush = options.customerAccountPush ?? false;
    this.capturedUrl = null;
  }

  getUrl() {
    return this.capturedUrl || `http://localhost:${this.port}`;
  }

  async start() {
    if (this.process) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      const mode = this.customerAccountPush ? 'tunnel mode' : 'localhost mode';
      console.log(
        `Starting dev server in ${mode} at port ${this.port} from ${this.projectPath}`,
      );

      const args = ['run', 'dev'];
      if (this.customerAccountPush) {
        args.push('--', '--customer-account-push');
      }

      this.process = spawn('npm', args, {
        cwd: this.projectPath,
        env: {
          ...process.env,
          SHOPIFY_HYDROGEN_FLAG_PORT: this.port.toString(),
          NODE_ENV: 'development',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          this.stop();
          reject(new Error('Server failed to start within timeout'));
        }
      }, 30000);

      let localUrl;
      let tunnelUrl;

      const handleOutput = (output) => {
        if (!localUrl) {
          localUrl = output.match(/(http:\/\/localhost:\d+)/)?.[1];
        }
        if (this.customerAccountPush && !tunnelUrl) {
          tunnelUrl = output.match(/(https:\/\/[^\s]+)/)?.[1];
        }

        if (!started && output.includes('─ success ─')) {
          started = true;
          clearTimeout(timeout);
          this.capturedUrl = tunnelUrl || localUrl;
          console.log(`[dev-server]: ✓ Captured URL: ${this.capturedUrl}`);
          // Give the tunnel a bit more time to ensure everything is ready
          setTimeout(resolve, tunnelUrl ? 5000 : 500);
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
          !started && console.log(output);
          handleOutput(output);
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const output = data.toString();
          !started && console.log(output);
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
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  }

  async stop() {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      console.log('Stopping dev server...');

      this.process.on('exit', () => {
        this.process = null;
        resolve();
      });

      this.process.kill('SIGTERM');

      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }
}

export async function startDevServer(options) {
  const server = new DevServer(options);
  await server.start();
  return server;
}

export async function stopDevServer(server) {
  if (server && typeof server.stop === 'function') {
    await server.stop();
  }
}
