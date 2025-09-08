import {execa, type ExecaChildProcess} from 'execa';
import getPort from 'get-port';
import * as path from 'node:path';
import * as http from 'node:http';

interface ServerConfig {
  port: number;
  stop: () => Promise<void>;
}

export async function startServer(): Promise<ServerConfig> {
  // Get an available port
  const port = await getPort();

  // Path to skeleton template
  const skeletonPath = path.resolve(__dirname, '../../templates/skeleton');

  // Start the skeleton dev server
  const serverProcess: ExecaChildProcess = execa(
    'npm',
    ['run', 'dev', '--', '--port', String(port)],
    {
      cwd: skeletonPath,
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
      stdio: 'pipe',
      reject: false,
    },
  );

  // Wait for server to be ready
  const isServerReady = async (
    maxAttempts = 60,
    delayMs = 1000,
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://localhost:${port}/`);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }

      // Check if process has exited
      if (serverProcess.exitCode !== null) {
        throw new Error(
          `Server process exited with code ${serverProcess.exitCode}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return false;
  };

  // Wait for server to start
  const ready = await isServerReady();
  if (!ready) {
    serverProcess.kill();
    throw new Error('Server failed to start within timeout');
  }

  return {
    port,
    stop: async () => {
      serverProcess.kill('SIGTERM');

      // Give it time to shutdown gracefully
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force kill if still running
      if (serverProcess.exitCode === null) {
        serverProcess.kill('SIGKILL');
      }
    },
  };
}
