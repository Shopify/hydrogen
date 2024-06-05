import {describe, it, beforeAll, expect} from 'vitest';
import {execa} from 'execa';
import {fileExists, inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {dirname, resolvePath} from '@shopify/cli-kit/node/path';
import {findUpAndReadPackageJson} from '@shopify/cli-kit/node/node-package-manager';

describe('create-hydrogen', async () => {
  it('creates a quickstart project using the compiled files', async () => {
    const packageJson = await findUpAndReadPackageJson('.').catch(() => null);

    expect(
      packageJson?.content,
      'Package.json for create-hydrogen not found',
    ).toBeTruthy();

    const bin = resolvePath(
      dirname(packageJson?.path ?? ''),
      (packageJson?.content as any)?.bin,
    );

    expect(bin).toMatch(/\bdist\/.*\.m?js$/);

    await expect(
      fileExists(bin),
      `It looks like there are no compiled files for create-hydrogen in ${bin}.` +
        `Please build the project before running the tests`,
    ).resolves.toBe(true);

    await inTemporaryDirectory(async (tmpDir) => {
      const processPromise = execa('node', [
        bin,
        '--quickstart',
        '--no-install-deps',
        '--path',
        tmpDir,
      ]);

      await expect(processPromise, 'create-app process').resolves.toBeTruthy();

      await expect(
        fileExists(resolvePath(tmpDir, 'package.json')),
      ).resolves.toBe(true);

      // Replace the temporary directory with a placeholder to avoid snapshot noise.
      // The directory can wrap to a new line, so we can't use a simple string replace.
      const output = (await processPromise).stdout.replace(
        /Run `[^&]+&&/,
        'Run `<<redacted-command>> &&',
      );

      expect(output).toMatchInlineSnapshot(`
        "

        ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        Creating storefront ...
        [2K[1A[2K[1A[2K[G▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        Setting up Quickstart project ...
        [2K[1A[2K[1A[2K[G
        ╭─ success ────────────────────────────────────────────────────────────────────╮
        │                                                                              │
        │  Storefront setup complete!                                                  │
        │                                                                              │
        │    Shopify:   Mock.shop                                                      │
        │    Language:  JavaScript                                                     │
        │    Routes:                                                                   │
        │      • Home (/ & /:catchAll)                                                 │
        │      • Page (/pages/:handle)                                                 │
        │      • Cart (/cart/* & /discount/*)                                          │
        │      • Products (/products/:handle)                                          │
        │      • Collections (/collections/*)                                          │
        │      • Policies (/policies & /policies/:handle)                              │
        │      • Blogs (/blogs/*)                                                      │
        │      • Account (/account/*)                                                  │
        │      • Search (/api/predictive-search & /search)                             │
        │      • Robots (/robots.txt)                                                  │
        │      • Sitemap (/sitemap.xml)                                                │
        │                                                                              │
        │  Next steps                                                                  │
        │                                                                              │
        │    • Run \`<<redacted-command>> && npm install && npm run dev\`              │
        │                                                                              │
        ╰──────────────────────────────────────────────────────────────────────────────╯
        "
      `);
    });
  });
});
