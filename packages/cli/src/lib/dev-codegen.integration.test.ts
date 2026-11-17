import {once} from 'node:events';
import {writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {spawnCodegenProcess} from './codegen.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('resolves project inputs and an explicit config path when the storefront differs from cwd', async () => {
  await inTemporaryDirectory(async (rootDirectory) => {
    const launcher = join(rootDirectory, 'codegen.mjs');
    await writeFile(
      launcher,
      `import {readFileSync} from 'node:fs';
console.log(readFileSync('schema.graphql', 'utf8'));
const configFlag = process.argv.indexOf('--codegen-config-path');
console.log(readFileSync(process.argv[configFlag + 1], 'utf8'));`,
    );
    await writeFile(
      join(rootDirectory, 'schema.graphql'),
      'type Query { hello: String }',
    );
    const configFile = join(rootDirectory, 'codegen.config.json');
    await writeFile(configFile, 'Explicit configuration');
    vi.stubEnv('SHOPIFY_FLAG_JSON', '1');
    vi.spyOn(process, 'argv', 'get').mockReturnValue([
      process.execPath,
      launcher,
      'hydrogen',
      'dev',
    ]);
    const output: string[] = [];
    const child = spawnCodegenProcess({
      rootDirectory,
      configFilePath: relative(process.cwd(), configFile),
      onOutput: (message) => output.push(message),
    });
    try {
      const [code] = await once(child, 'close');
      expect(code).toBe(0);
      expect(output.join('')).toBe(
        'type Query { hello: String }\nExplicit configuration\n',
      );
    } finally {
      if (child.exitCode === null) child.kill();
    }
  });
});
