import {spawn, ChildProcess} from 'node:child_process';
import * as http from 'node:http';
import * as path from 'node:path';

interface ServerConfig {
  port: number;
  stop: () => Promise<void>;
}

let mockProcess: ChildProcess | null = null;
let mockServer: http.Server | null = null;

export async function startServer(): Promise<ServerConfig> {
  // For now, we'll create a simple mock HTTP server to make the tests pass
  // Later (task 2.3), we'll implement the real skeleton template server startup

  return new Promise((resolve, reject) => {
    mockServer = http.createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end('<html><body>Mock Skeleton Server</body></html>');
    });

    // Find an available port
    mockServer.listen(0, 'localhost', () => {
      const address = mockServer!.address();
      if (typeof address !== 'object' || !address) {
        reject(new Error('Failed to get server address'));
        return;
      }

      const port = address.port;

      // Stub: simulate spawning the skeleton template dev command
      // In task 2.3, this will be replaced with actual execa/spawn logic
      mockProcess = spawn('echo', ['Mock process started'], {
        stdio: 'pipe',
      });

      resolve({
        port,
        stop: async () => {
          return new Promise((resolveStop) => {
            if (mockServer) {
              mockServer.close(() => {
                mockServer = null;
                if (mockProcess) {
                  mockProcess.kill();
                  mockProcess = null;
                }
                resolveStop();
              });
            } else {
              resolveStop();
            }
          });
        },
      });
    });

    mockServer.on('error', reject);
  });
}
