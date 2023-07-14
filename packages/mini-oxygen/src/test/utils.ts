import {join, resolve} from 'path';
import http from 'http';
import type {IncomingMessage} from 'http';

import {Mock} from 'vitest';
import {writeFile, ensureDir, remove} from 'fs-extra';

export interface Fixture {
  destroy(): Promise<void>;
  paths: {
    root: string;
    config: string;
    assets: string;
    workerFile: string;
  };
  updateWorker: () => Promise<void>;
}

export async function createFixture(name: string): Promise<Fixture> {
  const directory = resolve(__dirname, 'fixtures', name);
  const paths = {
    root: directory,
    config: join(directory, 'mini-oxygen.config.json'),
    workerFile: join(directory, 'worker.mjs'),
    assets: join(directory, 'assets'),
  };

  await ensureDir(directory);
  await ensureDir(paths.assets);
  await writeFile(join(directory, '.gitignore'), '*');

  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify(
      {
        name: 'test-worker',
        version: '1.0.0',
        description: 'A test worker',
        main: 'worker.mjs',
        license: 'MIT',
        type: 'module',
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(directory, 'worker.mjs'),
    `
export default {
  async fetch(request, environment, context) {
    if (new URL(request.url).pathname === '/html') {
      return new Response('<html><body>Hello, world</body>', {
        headers: {"Content-Type": "text/html"}
      });
    }

    return new Response(JSON.stringify(environment), {
      headers: {"Content-Type": "application/json"}
    });
  }
}
    `.trim(),
  );

  await writeFile(
    join(paths.assets, 'star.svg'),
    `<svg><polygon points="100,10 40,198 190,78 10,78 160,198" style="fill:gold;"/></svg>`.trim(),
  );

  return {
    paths,
    destroy: async () => {
      await remove(paths.assets);
      await remove(directory);
    },
    updateWorker: () => {
      return writeFile(
        join(directory, 'worker.mjs'),
        `
export default {
  async fetch(request, environment, context) {
    return new Response('<html><body><q>Forty-two</q> said Deep Thought, with infinite majesty and calm.</body>', {
      headers: {"Content-Type": "text/html"}
    });
  }
}
        `,
      );
    },
  };
}

export async function sendRequest(port: number, path: string) {
  return new Promise((resolve, _reject) => {
    http.get(`http://localhost:${port}${path}`, (response) => {
      let data = '';
      response
        .on('data', (chunk) => {
          data += chunk;
        })
        .on('end', () => {
          resolve({
            mimeType: response.headers['content-type'],
            data,
          });
        });
    });
  });
}

export function createMockProxyServer(port: number): http.Server {
  const onRequest = (_req: IncomingMessage, res: any) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    res.writeHead(200, {'Content-Type': 'text/plain; charset=UTF-8'});
    res.end('bogus content', 'utf8');
  };

  return http.createServer(onRequest).listen(port);
}
