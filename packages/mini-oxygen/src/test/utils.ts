import {join, resolve} from 'path';

import {writeFile, ensureDir} from 'fs-extra';

export interface Fixture {
  destroy(): Promise<void>;
}

export async function createFixture(name: string): Promise<Fixture> {
  const directory = resolve(__dirname, 'fixtures', name);

  function write(fileName: string, content: string) {
    return writeFile(join(directory, fileName), content);
  }

  await ensureDir(directory);
  writeFile(join(directory, '.gitignore'), '*');

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
    destroy: async () => {},
  };
}
