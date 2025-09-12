import {spawn, type ChildProcess} from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerOptions {
  port?: number;
  projectPath?: string;
}

class DevServer {
  private process: ChildProcess | null = null;
  private port: number;
  private projectPath: string;

  constructor(options: ServerOptions = {}) {
    this.port = options.port ?? 3000;
    this.projectPath =
      options.projectPath ?? path.join(__dirname, '../templates/skeleton');
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      console.log(
        `Starting dev server at http://localhost:${this.port} from ${this.projectPath}`,
      );

      this.process = spawn('npm', ['run', 'dev'], {
        cwd: this.projectPath,
        env: {
          ...process.env,
          PORT: this.port.toString(),
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

      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`[dev-server]: ${output}`);

        if (
          !started &&
          (output.includes('Local:') ||
            output.includes(`http://localhost:${this.port}`))
        ) {
          started = true;
          clearTimeout(timeout);
          setTimeout(() => resolve(), 2000);
        }
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`[dev-server error]: ${data.toString()}`);
      });

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

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      console.log('Stopping dev server...');

      this.process!.on('exit', () => {
        this.process = null;
        resolve();
      });

      this.process!.kill('SIGTERM');

      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }
}

export const devServer = new DevServer();

export async function startDevServer(options?: ServerOptions): Promise<void> {
  const server = new DevServer(options);
  await server.start();
  return server as any;
}

export async function stopDevServer(server: any): Promise<void> {
  if (server && typeof server.stop === 'function') {
    await server.stop();
  }
}
