import {describe, expect, it, vi, afterEach} from 'vitest';
import {startServer} from '../../e2e/helpers/server';
import * as http from 'node:http';

describe('startServer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start the skeleton dev server and return port and stop function', async () => {
    const server = await startServer();

    expect(server).toHaveProperty('port');
    expect(typeof server.port).toBe('number');
    expect(server.port).toBeGreaterThan(0);
    expect(server.port).toBeLessThanOrEqual(65535);

    expect(server).toHaveProperty('stop');
    expect(typeof server.stop).toBe('function');
  });

  it('should respond with HTTP 200 on GET / within 30 seconds', async () => {
    const server = await startServer();

    const response = await new Promise<http.IncomingMessage>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server did not respond within 30 seconds'));
        }, 30000);

        http
          .get(`http://localhost:${server.port}/`, (res) => {
            clearTimeout(timeout);
            resolve(res);
          })
          .on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
      },
    );

    expect(response.statusCode).toBe(200);

    await server.stop();
  });

  it('should clean up the server process when stop is called', async () => {
    const server = await startServer();

    await server.stop();

    // Verify the port is no longer listening
    await expect(
      new Promise((resolve, reject) => {
        http
          .get(`http://localhost:${server.port}/`, (res) => {
            resolve(res);
          })
          .on('error', (err) => {
            reject(err);
          });
      }),
    ).rejects.toThrow();
  });
});
