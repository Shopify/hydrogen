import path from 'node:path';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execa} from 'execa';
import {temporaryDirectoryTask} from 'tempy';
import {describe, it, expect} from 'vitest';

describe('create-hydrogen', () => {
  it('creates a quickstart project using the compiled files', async () => {
    const packageJson = createRequire(import.meta.url)('./package.json');
    const bin = path.resolve(packageJson.bin);

    expect(bin).toMatch(/\bdist\/.*\.m?js$/);

    await expect(
      fs.stat(bin).catch(() => false),
      `It looks like there are no compiled files for create-hydrogen in ${bin}.` +
        `Please build the project before running the tests`,
    ).resolves.toBeTruthy();

    await temporaryDirectoryTask(async (tmpDir) => {
      const processPromise = execa('node', [
        bin,
        '--quickstart',
        '--no-install-deps',
        '--path',
        tmpDir,
      ]);

      await expect(processPromise, 'create-app process').resolves.toBeTruthy();

      await expect(
        fs.stat(path.resolve(tmpDir, 'package.json')).catch(() => false),
      ).resolves.toBeTruthy();

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
