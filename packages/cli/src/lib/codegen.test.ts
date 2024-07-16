import {describe, it, expect} from 'vitest';
import {generateDefaultConfig} from './codegen.js';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';

function writeGraphQLConfig(filepath: string, config: Object) {
  return writeFile(
    joinPath(filepath, '.graphqlrc.ts'),
    `export default ${JSON.stringify(config)}`,
  );
}

describe('Codegen', () => {
  describe('without a GraphQL config', () => {
    it('generates a default Codegen config including SFAPI', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toEqual({
          filepath: 'virtual:codegen',
          config: {
            overwrite: true,
            pluckConfig: expect.any(Object),
            generates: {
              'storefrontapi.generated.d.ts': {
                preset: expect.any(Object),
                schema: expect.stringMatching(/\/storefront\.schema\.json$/),
                documents: expect.arrayContaining([expect.any(String)]),
              },
            },
          },
        });
      });
    });
  });

  describe('with an existing GraphQL config', () => {
    it('overwrites default options when specified in the matching project', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeGraphQLConfig(tmpDir, {
          projects: {
            default: {
              schema: 'anything/storefront.schema.json',
              documents: ['somewhere'],
            },
          },
        });

        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toMatchObject({
          config: {
            generates: {
              'storefrontapi.generated.d.ts': {
                schema: expect.stringMatching(/\/storefront\.schema\.json$/),
                documents: ['somewhere'],
              },
            },
          },
        });
      });
    });

    it('overwrites default options when specified in the Codegen extension', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeGraphQLConfig(tmpDir, {
          projects: {
            default: {
              schema: 'anything/storefront.schema.json',
              extensions: {
                codegen: {
                  generates: {
                    'different.generated.d.ts': {
                      preset: {},
                      documents: ['somewhere'],
                    },
                  },
                },
              },
            },
          },
        });

        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toEqual({
          filepath: 'virtual:codegen',
          config: {
            overwrite: true,
            pluckConfig: expect.any(Object),
            generates: {
              'different.generated.d.ts': expect.objectContaining({
                preset: expect.any(Object),
                schema: expect.stringMatching(/\/storefront\.schema\.json$/),
                documents: ['somewhere'],
              }),
            },
          },
        });
      });
    });

    it('includes CAAPI when it is listed in the GraphQL projects', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeGraphQLConfig(tmpDir, {
          projects: {
            customer: {
              schema: 'anything/customer-account.schema.json',
              documents: ['somewhere'],
            },
          },
        });

        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toEqual({
          filepath: 'virtual:codegen',
          config: {
            overwrite: true,
            pluckConfig: expect.any(Object),
            generates: {
              'storefrontapi.generated.d.ts': {
                preset: expect.any(Object),
                schema: expect.stringMatching(/\/storefront\.schema\.json$/),
                documents: expect.arrayContaining([expect.any(String)]),
              },
              'customer-accountapi.generated.d.ts': {
                preset: expect.any(Object),
                schema: expect.stringMatching(
                  /\/customer-account\.schema\.json$/,
                ),
                documents: expect.arrayContaining(['somewhere']),
              },
            },
          },
        });
      });
    });

    it('includes unknown Codegen projects', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await writeGraphQLConfig(tmpDir, {
          projects: {
            invalidCodegen: {
              schema: 'https://somewhere.com',
              documents: ['somewhere'],
            },
            validCodegen: {
              schema: 'https://somewhere.com',
              documents: ['somewhere'],
              extensions: {
                codegen: {
                  generates: {'test.generated.d.ts': {preset: {}}},
                },
              },
            },
          },
        });

        await expect(
          generateDefaultConfig({rootDirectory: tmpDir}),
        ).resolves.toEqual({
          filepath: 'virtual:codegen',
          config: {
            overwrite: true,
            pluckConfig: expect.any(Object),
            generates: {
              'storefrontapi.generated.d.ts': expect.any(Object),
              'test.generated.d.ts': expect.objectContaining({
                schema: 'https://somewhere.com',
                documents: ['somewhere'],
                preset: expect.any(Object),
              }),
            },
          },
        });
      });
    });
  });
});
