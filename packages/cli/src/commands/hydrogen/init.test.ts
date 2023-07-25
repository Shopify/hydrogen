import {fileURLToPath} from 'node:url';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {temporaryDirectoryTask} from 'tempy';
import {runInit} from './init.js';
import {exec} from '@shopify/cli-kit/node/system';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {isDirectory, readFile, writeFile} from '@shopify/cli-kit/node/fs';
import {basename, joinPath} from '@shopify/cli-kit/node/path';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {handleProjectLocation} from '../../lib/onboarding/common.js';
import glob from 'fast-glob';
import {getSkeletonSourceDir} from '../../lib/build.js';
import {execAsync} from '../../lib/process.js';
import {symlink, rmdir} from 'fs-extra';

vi.mock('../../lib/template-downloader.js', async () => ({
  getLatestTemplates: () => Promise.resolve({}),
}));
vi.mock(
  '@shopify/cli-kit/node/node-package-manager',
  async (importOriginal) => {
    const original = await importOriginal<
      typeof import('@shopify/cli-kit/node/node-package-manager')
    >();

    return {
      ...original,
      installNodeModules: vi.fn(),
      getPackageManager: () => Promise.resolve('npm'),
      packageManagerUsedForCreating: () => Promise.resolve('npm'),
    };
  },
);

vi.mock('../../lib/check-version.js');

const {renderTasksHook} = vi.hoisted(() => {
  return {
    renderTasksHook: vi.fn(),
  };
});

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');

  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
    renderSelectPrompt: vi.fn(),
    renderTextPrompt: vi.fn(),
    renderInfo: vi.fn(),
    renderTasks: vi.fn(async (args) => {
      await original.renderTasks(args);
      renderTasksHook();
    }),
  };
});

vi.mock('../../lib/onboarding/common.js', async (importOriginal) => {
  type ModType = typeof import('../../lib/onboarding/common.js');
  const original = await importOriginal<ModType>();

  return Object.keys(original).reduce((acc, item) => {
    const key = item as keyof ModType;
    const value = original[key];
    if (typeof value === 'function') {
      // @ts-ignore
      acc[key] = vi.fn(value);
    } else {
      // @ts-ignore
      acc[key] = value;
    }

    return acc;
  }, {} as ModType);
});

describe('init', () => {
  const outputMock = mockAndCaptureOutput();

  beforeEach(() => {
    vi.clearAllMocks();
    outputMock.clear();
  });

  it('checks Hydrogen version', async () => {
    await temporaryDirectoryTask(async (tmpDir) => {
      const showUpgradeMock = vi.fn((param?: string) => ({
        currentVersion: '1.0.0',
        newVersion: '1.0.1',
      }));
      vi.mocked(checkHydrogenVersion).mockResolvedValueOnce(showUpgradeMock);
      vi.mocked(handleProjectLocation).mockResolvedValueOnce(undefined);

      const project = await runInit({path: tmpDir, git: false});

      expect(project).toBeFalsy();
      expect(checkHydrogenVersion).toHaveBeenCalledOnce();
      expect(showUpgradeMock).toHaveBeenCalledWith(
        expect.stringContaining('npm create @shopify/hydrogen@latest'),
      );
    });
  });

  describe('local templates', () => {
    it('creates basic projects', async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        await runInit({
          path: tmpDir,
          git: false,
          language: 'ts',
          mockShop: true,
        });

        const skeletonFiles = await glob('**/*', {
          cwd: getSkeletonSourceDir(),
          ignore: ['**/node_modules/**', '**/dist/**'],
        });
        const projectFiles = await glob('**/*', {cwd: tmpDir});
        const nonAppFiles = skeletonFiles.filter(
          (item) => !item.startsWith('app/'),
        );

        expect(projectFiles).toEqual(expect.arrayContaining(nonAppFiles));

        expect(projectFiles).toContain('app/root.tsx');
        expect(projectFiles).toContain('app/entry.client.tsx');
        expect(projectFiles).toContain('app/entry.server.tsx');
        expect(projectFiles).toContain('app/components/Layout.tsx');

        // Skip routes:
        expect(projectFiles).not.toContain('app/routes/_index.tsx');

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
        expect(output).toMatch('Help');
        expect(output).toMatch('Next steps');
        expect(output).toMatch(
          // Output contains banner characters. USe [^\w]*? to match them.
          /Run `cd .*? &&[^\w]*?npm[^\w]*?install[^\w]*?&&[^\w]*?npm[^\w]*?run[^\w]*?dev`/ims,
        );
      });
    });

    it('creates projects with route files', async () => {
      await temporaryDirectoryTask(async (tmpDir) => {
        await runInit({path: tmpDir, git: false, routes: true, language: 'ts'});

        const skeletonFiles = await glob('**/*', {
          cwd: getSkeletonSourceDir(),
          ignore: ['**/node_modules/**', '**/dist/**'],
        });
        const projectFiles = await glob('**/*', {cwd: tmpDir});

        expect(projectFiles).toEqual(expect.arrayContaining(skeletonFiles));
        expect(projectFiles).toContain('app/routes/_index.tsx');

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
      await temporaryDirectoryTask(async (tmpDir) => {
        await runInit({path: tmpDir, git: false, routes: true, language: 'js'});

        const skeletonFiles = await glob('**/*', {
          cwd: getSkeletonSourceDir(),
          ignore: ['**/node_modules/**', '**/dist/**'],
        });
        const projectFiles = await glob('**/*', {cwd: tmpDir});

        expect(projectFiles).toEqual(
          expect.arrayContaining(
            skeletonFiles
              .filter((item) => !item.endsWith('.d.ts'))
              .map((item) =>
                item
                  .replace(/\.ts(x)?$/, '.js$1')
                  .replace(/tsconfig\.json$/, 'jsconfig.json'),
              ),
          ),
        );

        expect(projectFiles).toContain('app/routes/_index.jsx');

        // No types:
        await expect(readFile(`${tmpDir}/server.js`)).resolves.toMatch(
          /export default {\n\s+async fetch\(\s*request,\s*env,\s*executionContext,?\s*\)/,
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

    describe('styling libraries', () => {
      it('scaffolds Tailwind CSS', async () => {
        await temporaryDirectoryTask(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: false,
            language: 'ts',
            styling: 'tailwind',
          });

          // Injects booleans into Remix config
          await expect(readFile(`${tmpDir}/remix.config.js`)).resolves.toMatch(
            /tailwind: true,\n\s*postcss: true,\n\s*future:/,
          );

          // Copies Tailwind file
          await expect(
            readFile(`${tmpDir}/app/styles/tailwind.css`),
          ).resolves.toMatch(/@tailwind base;/);

          // Injects styles in Root
          const rootFile = await readFile(`${tmpDir}/app/root.tsx`);
          await expect(rootFile).toMatch(/import tailwindCss from/);
          await expect(rootFile).toMatch(
            /export function links\(\) \{.*?return \[.*\{rel: 'stylesheet', href: tailwindCss\}/ims,
          );

          const output = outputMock.info();
          expect(output).toMatch('success');
          expect(output).not.toMatch('warning');
          expect(output).toMatch(/Styling:\s*Tailwind/);
        });
      });

      it('scaffolds CSS Modules', async () => {
        await temporaryDirectoryTask(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: false,
            language: 'ts',
            styling: 'css-modules',
          });

          // Injects the Remix dependency
          await expect(readFile(`${tmpDir}/package.json`)).resolves.toMatch(
            `"@remix-run/css-bundle": "`,
          );

          // Injects styles in Root
          const rootFile = await readFile(`${tmpDir}/app/root.tsx`);
          await expect(rootFile).toMatch(/import {cssBundleHref} from/);
          await expect(rootFile).toMatch(
            /export function links\(\) \{.*?return \[.*\{rel: 'stylesheet', href: cssBundleHref\}/ims,
          );

          const output = outputMock.info();
          expect(output).toMatch('success');
          expect(output).not.toMatch('warning');
          expect(output).toMatch(/Styling:\s*CSS Modules/);
        });
      });

      it('scaffolds Vanilla Extract', async () => {
        await temporaryDirectoryTask(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: false,
            language: 'ts',
            styling: 'vanilla-extract',
          });

          // Injects dependencies
          const packageJson = await readFile(`${tmpDir}/package.json`);
          expect(packageJson).toMatch(/"@remix-run\/css-bundle": "/);
          expect(packageJson).toMatch(/"@vanilla-extract\/css": "/);

          // Injects styles in Root
          const rootFile = await readFile(`${tmpDir}/app/root.tsx`);
          await expect(rootFile).toMatch(/import {cssBundleHref} from/);
          await expect(rootFile).toMatch(
            /export function links\(\) \{.*?return \[.*\{rel: 'stylesheet', href: cssBundleHref\}/ims,
          );

          const output = outputMock.info();
          expect(output).toMatch('success');
          expect(output).not.toMatch('warning');
          expect(output).toMatch(/Styling:\s*Vanilla Extract/);
        });
      });
    });

    describe('i18n strategies', () => {
      it('scaffolds i18n with domains strategy', async () => {
        await temporaryDirectoryTask(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: false,
            language: 'ts',
            i18n: 'domains',
            routes: true,
          });

          const projectFiles = await glob('**/*', {cwd: tmpDir});
          expect(projectFiles).toContain('app/routes/_index.tsx');

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
        await temporaryDirectoryTask(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: false,
            language: 'ts',
            i18n: 'subdomains',
            routes: true,
          });

          const projectFiles = await glob('**/*', {cwd: tmpDir});
          expect(projectFiles).toContain('app/routes/_index.tsx');

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
        await temporaryDirectoryTask(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: false,
            language: 'ts',
            i18n: 'subfolders',
            routes: true,
          });

          const projectFiles = await glob('**/*', {cwd: tmpDir});
          // Adds locale to the path
          expect(projectFiles).toContain('app/routes/($locale)._index.tsx');

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
        await temporaryDirectoryTask(async (tmpDir) => {
          renderTasksHook.mockImplementationOnce(async () => {
            await writeFile(`${tmpDir}/package-lock.json`, '{}');
          });

          await runInit({
            path: tmpDir,
            git: true,
            language: 'js',
            styling: 'tailwind',
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
              expect.stringContaining('Setup Tailwind'),
              expect.stringContaining('Scaffold Storefront'),
            ]),
          );
        });
      });
    });

    describe('project validity', () => {
      it('typechecks the project', async () => {
        await temporaryDirectoryTask(async (tmpDir) => {
          renderTasksHook.mockImplementationOnce(async () => {
            await writeFile(`${tmpDir}/package-lock.json`, '{}');
          });

          await runInit({
            path: tmpDir,
            git: true,
            language: 'ts',
            styling: 'tailwind',
            i18n: 'subfolders',
            routes: true,
            installDeps: true,
          });

          // "Install" dependencies by linking to monorepo's node_modules
          await rmdir(joinPath(tmpDir, 'node_modules')).catch(() => {});
          await symlink(
            fileURLToPath(
              new URL('../../../../../node_modules', import.meta.url),
            ),
            joinPath(tmpDir, 'node_modules'),
          );

          // This will throw if TSC fails
          await expect(
            exec('npm', ['run', 'typecheck'], {
              cwd: tmpDir,
            }),
          ).resolves.not.toThrow();
        });
      });
    });
  });
});
