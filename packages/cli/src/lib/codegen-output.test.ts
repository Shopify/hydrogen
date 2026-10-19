import {expect, it, vi} from 'vitest';
import {
  inTemporaryDirectory,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {codegen} from './codegen.js';

// These tests exercise GraphQL generation; React Router typegen is independent.
vi.mock('child_process', () => ({execSync: vi.fn(), exec: vi.fn()}));

it('reports schema-only output that GraphQL Codegen writes to disk', async () => {
  await inTemporaryDirectory(async (rootDirectory) => {
    const configFilePath = joinPath(rootDirectory, 'codegen.ts');
    await writeFile(
      configFilePath,
      `export default {
      schema: 'type Query { hello: String }',
      pluginLoader: async () => ({plugin: () => 'export type Generated = string;'}),
      generates: {'schema.ts': {plugins: ['fixture']}},
    };`,
    );

    const result = await codegen({rootDirectory, configFilePath});

    expect(result).toEqual({'schema.ts': []});
    expect(await readFile(joinPath(rootDirectory, 'schema.ts'))).toContain(
      'export type Generated',
    );
  });
});

it('reports files expanded by a preset with global and output document sources', async () => {
  await inTemporaryDirectory(async (rootDirectory) => {
    await writeFile(
      joinPath(rootDirectory, 'global.graphql'),
      'query Global { hello }',
    );
    await writeFile(
      joinPath(rootDirectory, 'local.graphql'),
      'query Local { hello }',
    );
    const configFilePath = joinPath(rootDirectory, 'codegen.ts');
    await writeFile(
      configFilePath,
      `export default {
      schema: 'type Query { hello: String }',
      documents: 'global.graphql',
      pluginLoader: async () => ({plugin: () => 'export type Generated = string;'}),
      generates: {
        'generated/': {
          plugins: ['fixture'],
          documents: {'local.graphql': {}},
          preset: {
            buildGeneratesSection: (options) => ['one.ts', 'two.ts'].map((name) => ({
              ...options,
              filename: options.baseOutputDir + name,
            })),
          },
        },
      },
    };`,
    );

    const result = await codegen({rootDirectory, configFilePath});

    expect(result).toEqual({
      'generated/one.ts': ['global.graphql', 'local.graphql'],
      'generated/two.ts': ['global.graphql', 'local.graphql'],
    });
    for (const filename of Object.keys(result)) {
      expect(await readFile(joinPath(rootDirectory, filename))).toContain(
        'export type Generated',
      );
    }
  });
});
