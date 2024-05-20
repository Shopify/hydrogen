import './setup-template.mocks.js';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {glob} from 'fast-glob';
import {
  inTemporaryDirectory,
  isDirectory,
  readFile,
} from '@shopify/cli-kit/node/fs';
import {setupTemplate} from './index.js';
import {getSkeletonSourceDir} from '../build.js';
import {basename} from '@shopify/cli-kit/node/path';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {execAsync} from '../process.js';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

describe('local templates', () => {
  const outputMock = mockAndCaptureOutput();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    outputMock.clear();
  });

  it('creates basic projects', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: false,
        language: 'ts',
        mockShop: true,
      });

      const templateFiles = await glob('**/*', {
        cwd: getSkeletonSourceDir(),
        ignore: ['**/node_modules/**', '**/dist/**'],
      });
      const resultFiles = await glob('**/*', {cwd: tmpDir});
      const nonAppFiles = templateFiles.filter(
        (item) => !item.startsWith('app/'),
      );

      expect(resultFiles).toEqual(expect.arrayContaining(nonAppFiles));

      expect(resultFiles).toContain('app/root.tsx');
      expect(resultFiles).toContain('app/entry.client.tsx');
      expect(resultFiles).toContain('app/entry.server.tsx');
      expect(resultFiles).toContain('app/components/Layout.tsx');

      // Skip routes:
      expect(resultFiles).not.toContain('app/routes/_index.tsx');

      // Not modified:
      await expect(readFile(`${tmpDir}/server.ts`)).resolves.toEqual(
        await readFile(`${getSkeletonSourceDir()}/server.ts`),
      );

      // Replaces package.json#name
      await expect(readFile(`${tmpDir}/package.json`)).resolves.toMatch(
        `"name": "${basename(tmpDir)}"`,
      );

      // Creates .env
      await expect(readFile(`${tmpDir}/.env`)).resolves.toMatch(
        `PUBLIC_STORE_DOMAIN="mock.shop"`,
      );

      const output = outputMock.info();
      expect(output).toMatch('success');
      expect(output).not.toMatch('warning');
      expect(output).toMatch(basename(tmpDir));
      expect(output).not.toMatch('Routes');
      expect(output).toMatch(/Language:\s*TypeScript/);
      expect(output).toMatch('Next steps');
      expect(output).toMatch(
        // Output contains banner characters. USe [^\w]*? to match them.
        /Run `cd .*? &&[^\w]*?npm[^\w]*?install[^\w]*?&&[^\w]*?npm[^\w]*?run[^\w]*?dev`/ims,
      );
    });
  });

  it('creates project prompting for package-manager', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: false,
        language: 'ts',
        packageManager: 'unknown',
        mockShop: true,
      });

      expect(renderSelectPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select package manager to install dependencies',
        }),
      );
    });
  });

  it('creates projects with route files', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: false,
        routes: true,
        language: 'ts',
      });

      const templateFiles = await glob('**/*', {
        cwd: getSkeletonSourceDir(),
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      const resultFiles = await glob('**/*', {cwd: tmpDir});

      expect(resultFiles).toEqual(expect.arrayContaining(templateFiles));
      expect(resultFiles).toContain('app/routes/_index.tsx');

      // Not modified:
      await expect(readFile(`${tmpDir}/server.ts`)).resolves.toEqual(
        await readFile(`${getSkeletonSourceDir()}/server.ts`),
      );

      const output = outputMock.info();
      expect(output).toMatch('success');
      expect(output).not.toMatch('warning');
      expect(output).toMatch(basename(tmpDir));
      expect(output).toMatch(/Language:\s*TypeScript/);
      expect(output).toMatch('Routes');
      expect(output).toMatch('Home (/ & /:catchAll)');
      expect(output).toMatch('Account (/account/*)');
    });
  });

  it('transpiles projects to JS', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      await setupTemplate({
        path: tmpDir,
        git: false,
        routes: true,
        language: 'js',
      });

      const templateFiles = await glob('**/*', {
        cwd: getSkeletonSourceDir(),
        ignore: ['**/node_modules/**', '**/dist/**'],
      });
      const resultFiles = await glob('**/*', {cwd: tmpDir});

      expect(resultFiles).toEqual(
        expect.arrayContaining(
          templateFiles
            .filter((item) => !item.endsWith('.d.ts'))
            .map((item) =>
              item
                .replace(/\.ts(x)?$/, '.js$1')
                .replace(/tsconfig\.json$/, 'jsconfig.json'),
            ),
        ),
      );

      expect(resultFiles).toContain('app/routes/_index.jsx');

      // No types but JSDocs:
      await expect(readFile(`${tmpDir}/server.js`)).resolves.toMatch(
        /export default {\n\s+\/\*\*.*?\*\/\n\s+async fetch\(\s*request,\s*env,\s*executionContext,?\s*\)/s,
      );

      const output = outputMock.info();
      expect(output).toMatch('success');
      expect(output).not.toMatch('warning');
      expect(output).toMatch(basename(tmpDir));
      expect(output).toMatch(/Language:\s*JavaScript/);
      expect(output).toMatch('Routes');
      expect(output).toMatch('Home (/ & /:catchAll)');
      expect(output).toMatch('Account (/account/*)');
    });
  });

  describe('i18n strategies', () => {
    it('scaffolds i18n with domains strategy', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await setupTemplate({
          path: tmpDir,
          git: false,
          language: 'ts',
          i18n: 'domains',
          routes: true,
        });

        const resultFiles = await glob('**/*', {cwd: tmpDir});
        expect(resultFiles).toContain('app/routes/_index.tsx');

        // Injects styles in Root
        const serverFile = await readFile(`${tmpDir}/server.ts`);
        expect(serverFile).toMatch(/i18n: getLocaleFromRequest\(request\),/);
        expect(serverFile).toMatch(/domain = url.hostname/);

        const output = outputMock.info();
        expect(output).toMatch('success');
        expect(output).not.toMatch('warning');
        expect(output).toMatch(/Markets:\s*Top-level domains/);
      });
    });

    it('scaffolds i18n with subdomains strategy', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await setupTemplate({
          path: tmpDir,
          git: false,
          language: 'ts',
          i18n: 'subdomains',
          routes: true,
        });

        const resultFiles = await glob('**/*', {cwd: tmpDir});
        expect(resultFiles).toContain('app/routes/_index.tsx');

        // Injects styles in Root
        const serverFile = await readFile(`${tmpDir}/server.ts`);
        expect(serverFile).toMatch(/i18n: getLocaleFromRequest\(request\),/);
        expect(serverFile).toMatch(/firstSubdomain = url.hostname/);

        const output = outputMock.info();
        expect(output).toMatch('success');
        expect(output).not.toMatch('warning');
        expect(output).toMatch(/Markets:\s*Subdomains/);
      });
    });

    it('scaffolds i18n with subfolders strategy', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await setupTemplate({
          path: tmpDir,
          git: false,
          language: 'ts',
          i18n: 'subfolders',
          routes: true,
        });

        const resultFiles = await glob('**/*', {cwd: tmpDir});
        // Adds locale to the path
        expect(resultFiles).toContain('app/routes/($locale)._index.tsx');

        // Adds ($locale) route
        expect(resultFiles).toContain('app/routes/($locale).tsx');

        // Injects styles in Root
        const serverFile = await readFile(`${tmpDir}/server.ts`);
        expect(serverFile).toMatch(/i18n: getLocaleFromRequest\(request\),/);
        expect(serverFile).toMatch(/url.pathname/);

        const output = outputMock.info();
        expect(output).toMatch('success');
        expect(output).not.toMatch('warning');
        expect(output).toMatch(/Markets:\s*Subfolders/);
      });
    });
  });

  describe('git', () => {
    it('initializes a git repository and creates initial commits', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await setupTemplate({
          path: tmpDir,
          git: true,
          language: 'js',
          i18n: 'domains',
          routes: true,
          installDeps: true,
        });

        expect(isDirectory(`${tmpDir}/.git`)).resolves.toBeTruthy();

        const {stdout: gitLog} = await execAsync(`git log --oneline`, {
          cwd: tmpDir,
        });

        expect(gitLog.split('\n')).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Lockfile'),
            expect.stringContaining('Generate routes for core functionality'),
            // TODO
            // expect.stringContaining('Setup Tailwind'),
            expect.stringContaining('Setup markets support using domains'),
            expect.stringContaining('Scaffold Storefront'),
          ]),
        );
      });
    });
  });
});
