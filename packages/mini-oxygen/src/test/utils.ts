import {join, resolve} from 'path';

import {writeFile, ensureDir, remove} from 'fs-extra';
import getPort from 'get-port';

export interface Fixture {
  destroy(): Promise<void>;
  port: number;
  paths: {
    root: string;
    config: string;
    assets: string;
    workerFile: string;
  };
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
  await writeFile(join(directory, '.gitignore'), '*');
  await writeFile(
    join(directory, 'mini-oxygen.config.json'),
    JSON.stringify(
      {
        port: 3000,
        workerFile: 'worker.mjs',
        watch: true,
        env: {TESTING: 123, HELLO: 12345},
        autoReload: true,
      },
      null,
      2,
    ),
  );

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

  return {
    paths,
    port: await getPort(),
    destroy: async () => {
      await remove(directory);
    },
  };
}
