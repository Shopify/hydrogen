import {fileURLToPath} from 'node:url';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {runInit} from './init.js';
import {exec} from '@shopify/cli-kit/node/system';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {readAndParsePackageJson} from '@shopify/cli-kit/node/node-package-manager';
import {
  fileExists,
  isDirectory,
  readFile,
  removeFile,
  writeFile,
  inTemporaryDirectory,
} from '@shopify/cli-kit/node/fs';
import {basename, joinPath} from '@shopify/cli-kit/node/path';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {handleProjectLocation} from '../../lib/onboarding/common.js';
import glob from 'fast-glob';
import {getRepoNodeModules, getSkeletonSourceDir} from '../../lib/build.js';
import {execAsync} from '../../lib/process.js';
import {createSymlink, remove as rmdir} from 'fs-extra/esm';
import {runCheckRoutes} from './check.js';
import {runCodegen} from './codegen.js';
import {runViteBuild} from './build-vite.js';
import {runViteDev} from './dev-vite.js';
import {runBuild as runClassicBuild} from './build.js';
import {runDev as runClassicDev} from './dev.js';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';

const {renderTasksHook} = vi.hoisted(() => ({renderTasksHook: vi.fn()}));

vi.mock('../../lib/check-version.js');

vi.mock('../../lib/template-downloader.js', async () => ({
  downloadMonorepoTemplates: () =>
    Promise.resolve({
      version: '',
      templatesDir: fileURLToPath(
        new URL('../../../../../templates', import.meta.url),
      ),
      examplesDir: fileURLToPath(
        new URL('../../../../../examples', import.meta.url),
      ),
    }),
  downloadExternalRepo: () =>
    Promise.resolve({
      templateDir: fileURLToPath(
        new URL('../../../../../templates/skeleton', import.meta.url),
      ),
    }),
}));

vi.mock('@shopify/cli-kit/node/ui', async () => {
  const original = await vi.importActual<
    typeof import('@shopify/cli-kit/node/ui')
  >('@shopify/cli-kit/node/ui');

  return {
    ...original,
    renderConfirmationPrompt: vi.fn(),
    renderSelectPrompt: vi.fn(),
    renderTextPrompt: vi.fn(),
    renderTasks: vi.fn(async (args) => {
      await original.renderTasks(args);
      renderTasksHook();
    }),
  };
});

vi.mock(
  '@shopify/cli-kit/node/node-package-manager',
  async (importOriginal) => {
    const original = await importOriginal<
      typeof import('@shopify/cli-kit/node/node-package-manager')
    >();

    return {
      ...original,
      getPackageManager: () => Promise.resolve('npm'),
      packageManagerFromUserAgent: () => 'npm',
      installNodeModules: vi.fn(async ({directory}: {directory: string}) => {
        // Create lockfile at a later moment to simulate a slow install
        renderTasksHook.mockImplementationOnce(async () => {
          await writeFile(`${directory}/package-lock.json`, '{}');
        });

        // "Install" dependencies by linking to monorepo's node_modules
        await rmdir(joinPath(directory, 'node_modules')).catch(() => {});
        await createSymlink(
          await getRepoNodeModules(),
          joinPath(directory, 'node_modules'),
        );
      }),
    };
  },
);

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
    vi.unstubAllEnvs();
    outputMock.clear();
  });

  it('checks Hydrogen version', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
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

  describe('remote templates', () => {
    it('throws for unknown templates', async () => {
      const processExit = vi
        .spyOn(process, 'exit')
        .mockImplementationOnce((() => {}) as any);

      await inTemporaryDirectory(async (tmpDir) => {
        await expect(
          runInit({
            path: tmpDir,
            git: false,
            language: 'ts',
            template: 'missing-template',
          }),
        ).resolves.ok;
      });

      // The error message is printed asynchronously
      await vi.waitFor(() => expect(outputMock.error()).toMatch('--template'));

      expect(processExit).toHaveBeenCalledWith(1);

      processExit.mockRestore();
    });

    it('creates basic projects', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runInit({
          path: tmpDir,
          git: false,
          language: 'ts',
          template: 'hello-world',
        });

        const templateFiles = await glob('**/*', {
          cwd: getSkeletonSourceDir().replace('skeleton', 'hello-world'),
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
        expect(resultFiles).not.toContain('app/components/Layout.tsx');

        // Skip routes:
        expect(resultFiles).not.toContain('app/routes/_index.tsx');

        await expect(readFile(`${tmpDir}/package.json`)).resolves.toMatch(
          `"name": "hello-world"`,
        );

        const output = outputMock.info();
        expect(output).toMatch('success');
        expect(output).not.toMatch('warning');
        expect(output).not.toMatch('Routes');
        expect(output).toMatch(/Language:\s*TypeScript/);
        expect(output).toMatch('Next steps');
        expect(output).toMatch(
          // Output contains banner characters. USe [^\w]*? to match them.
          /Run `cd .*? &&[^\w]*?npm[^\w]*?install[^\w]*?&&[^\w]*?npm[^\w]*?run[^\w]*?dev`/ims,
        );
      });
    });

    it('applies diff for examples', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const exampleName = 'third-party-queries-caching';

        await runInit({
          path: tmpDir,
          git: false,
          language: 'ts',
          template: exampleName,
        });

        const templatePath = getSkeletonSourceDir();
        const examplePath = templatePath
          .replace('templates', 'examples')
          .replace('skeleton', exampleName);

        // --- Test file diff
        const ignore = ['**/node_modules/**', '**/dist/**'];
        const resultFiles = await glob('**/*', {ignore, cwd: tmpDir});
        const exampleFiles = await glob('**/*', {ignore, cwd: examplePath});
        const templateFiles = (
          await glob('**/*', {ignore, cwd: templatePath})
        ).filter((item) => !item.endsWith('CHANGELOG.md'));

        expect(resultFiles).toEqual(
          expect.arrayContaining([
            ...new Set([...templateFiles, ...exampleFiles]),
          ]),
        );

        // --- Test package.json merge
        const templatePkgJson = await readAndParsePackageJson(
          `${templatePath}/package.json`,
        );
        const examplePkgJson = await readAndParsePackageJson(
          `${examplePath}/package.json`,
        );
        const resultPkgJson = await readAndParsePackageJson(
          `${tmpDir}/package.json`,
        );

        expect(resultPkgJson.name).toMatch(exampleName);

        expect(resultPkgJson.scripts).toEqual(
          expect.objectContaining(templatePkgJson.scripts),
        );

        expect(resultPkgJson.dependencies).toEqual(
          expect.objectContaining({
            ...templatePkgJson.dependencies,
            ...examplePkgJson.dependencies,
          }),
        );
        expect(resultPkgJson.devDependencies).toEqual(
          expect.objectContaining({
            ...templatePkgJson.devDependencies,
            ...examplePkgJson.devDependencies,
          }),
        );
        expect(resultPkgJson.peerDependencies).toEqual(
          expect.objectContaining({
            ...templatePkgJson.peerDependencies,
            ...examplePkgJson.peerDependencies,
          }),
        );

        // --- Keeps original tsconfig.json
        expect(await readFile(joinPath(templatePath, 'tsconfig.json'))).toEqual(
          await readFile(joinPath(tmpDir, 'tsconfig.json')),
        );
      });
    });

    it('transpiles projects to JS', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runInit({
          path: tmpDir,
          git: false,
          language: 'js',
          template: 'hello-world',
        });

        const templateFiles = await glob('**/*', {
          cwd: getSkeletonSourceDir().replace('skeleton', 'hello-world'),
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

        // No types but JSDocs:
        await expect(readFile(`${tmpDir}/server.js`)).resolves.toMatch(
          /export default {\n\s+\/\*\*.*?\*\/\n\s+async fetch\(\s*request,\s*env,\s*executionContext,?\s*\)/s,
        );

        const output = outputMock.info();
        expect(output).toMatch('success');
        expect(output).not.toMatch('warning');
        expect(output).toMatch(/Language:\s*JavaScript/);
      });
    });

    it('creates functional classic Remix projects', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runInit({
          path: tmpDir,
          git: false,
          language: 'ts',
          template: 'classic-remix',
          routes: true,
          installDeps: true,
        });

        const templateFiles = await glob('**/*', {
          cwd: getSkeletonSourceDir()
            .replace('templates', 'examples')
            .replace('skeleton', 'classic-remix'),
          ignore: ['**/node_modules/**', '**/dist/**'],
        });
        const resultFiles = await glob('**/*', {cwd: tmpDir});
        const nonAppFiles = templateFiles.filter(
          (item) => !item.startsWith('app/'),
        );

        expect(resultFiles).toEqual(expect.arrayContaining(nonAppFiles));
        expect(resultFiles).not.toContain('vite.config.ts');
        expect(resultFiles).not.toContain('env.d.ts');

        await expect(readFile(`${tmpDir}/package.json`)).resolves.toMatch(
          `"name": "example-classic-remix"`,
        );

        // ---- DEV
        outputMock.clear();
        vi.stubEnv('NODE_ENV', 'development');

        const {close, getUrl} = await runClassicDev({
          path: tmpDir,
          disableVirtualRoutes: true,
          disableVersionCheck: true,
          cliConfig: {} as any,
        });

        try {
          await vi.waitFor(
            () => expect(outputMock.output()).toMatch('success'),
            {timeout: 5000},
          );

          expect(outputMock.output()).toMatch(/View [^:]+? app:/i);

          await expect(
            fileExists(joinPath(tmpDir, 'dist', 'worker', 'index.js')),
          ).resolves.toBeTruthy();

          const response = await fetch(getUrl());
          expect(response.status).toEqual(200);
          expect(response.headers.get('content-type')).toEqual('text/html');
          await expect(response.text()).resolves.toMatch('Mock.shop');
        } finally {
          await close();
        }

        // ---- BUILD
        outputMock.clear();
        vi.stubEnv('NODE_ENV', 'production');

        await expect(
          runClassicBuild({directory: tmpDir}),
        ).resolves.not.toThrow();

        const expectedBundlePath = 'dist/worker/index.js';

        const output = outputMock.output();
        expect(output).toMatch(expectedBundlePath);
        expect(
          fileExists(joinPath(tmpDir, expectedBundlePath)),
        ).resolves.toBeTruthy();

        const mb = Number(output.match(/index\.js\s+([\d.]+)\s+MB/)?.[1] || '');

        // Bundle size within 1 MB
        expect(mb).toBeGreaterThan(0);
        expect(mb).toBeLessThan(1);

        // Bundle analysis
        expect(output).toMatch('Complete analysis: file://');

        const clientAnalysisPath = 'dist/worker/client-bundle-analyzer.html';
        const workerAnalysisPath = 'dist/worker/worker-bundle-analyzer.html';

        await expect(
          fileExists(joinPath(tmpDir, clientAnalysisPath)),
        ).resolves.toBeTruthy();

        await expect(
          fileExists(joinPath(tmpDir, workerAnalysisPath)),
        ).resolves.toBeTruthy();

        await expect(
          readFile(joinPath(tmpDir, clientAnalysisPath)),
        ).resolves.toMatch(/globalThis\.METAFILE = '.+';/g);

        await expect(
          readFile(joinPath(tmpDir, workerAnalysisPath)),
        ).resolves.toMatch(/globalThis\.METAFILE = '.+';/g);
      });
    });
  });

  describe('local templates', () => {
    it('creates basic projects', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await runInit({
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
        await runInit({
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
        await runInit({path: tmpDir, git: false, routes: true, language: 'ts'});

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
        await runInit({path: tmpDir, git: false, routes: true, language: 'js'});

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

    // TODO enable when we support it in Vite
    describe.skip('styling libraries', () => {
      it('scaffolds Tailwind CSS', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: false,
            language: 'ts',
            styling: 'tailwind',
          });

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
        await inTemporaryDirectory(async (tmpDir) => {
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
        await inTemporaryDirectory(async (tmpDir) => {
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
        await inTemporaryDirectory(async (tmpDir) => {
          await runInit({
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
          await runInit({
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
          await runInit({
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
              // TODO
              // expect.stringContaining('Setup Tailwind'),
              expect.stringContaining('Setup markets support using domains'),
              expect.stringContaining('Scaffold Storefront'),
            ]),
          );
        });
      });
    });

    describe('project validity', () => {
      it('typechecks the project', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: true,
            language: 'ts',
            styling: 'tailwind',
            i18n: 'subfolders',
            routes: true,
            installDeps: true,
          });

          // This will throw if TSC fails
          await expect(
            exec('npm', ['run', 'typecheck'], {cwd: tmpDir}),
          ).resolves.not.toThrow();
        });
      });

      it('contains all standard routes', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: true,
            language: 'ts',
            i18n: 'subfolders',
            routes: true,
            installDeps: true,
          });

          // Clear previous success messages
          outputMock.clear();

          await runCheckRoutes({directory: tmpDir});

          const output = outputMock.info();
          expect(output).toMatch('success');
        });
      });

      it('supports codegen', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: true,
            language: 'ts',
            routes: true,
            installDeps: true,
          });

          // Clear previous success messages
          outputMock.clear();

          const codegenFile = `${tmpDir}/storefrontapi.generated.d.ts`;
          const codegenFromTemplate = await readFile(codegenFile);
          expect(codegenFromTemplate).toBeTruthy();

          await removeFile(codegenFile);
          expect(fileExists(codegenFile)).resolves.toBeFalsy();

          await expect(runCodegen({directory: tmpDir})).resolves.not.toThrow();

          const output = outputMock.info();
          expect(output).toMatch('success');

          await expect(readFile(codegenFile)).resolves.toEqual(
            codegenFromTemplate,
          );
        });
      });

      it('builds the generated project', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: true,
            language: 'ts',
            styling: 'postcss',
            i18n: 'subfolders',
            routes: true,
            installDeps: true,
          });

          // Clear previous success messages
          outputMock.clear();
          vi.stubEnv('NODE_ENV', 'production');

          await expect(
            runViteBuild({directory: tmpDir}),
          ).resolves.not.toThrow();

          const expectedBundlePath = 'dist/server/index.js';

          const output = outputMock.output();
          expect(output).toMatch(expectedBundlePath);
          expect(output).toMatch('building for productio');
          expect(output).toMatch('dist/client/assets/root-');
          expect(output).toMatch('building SSR bundle for productio');
          expect(
            fileExists(joinPath(tmpDir, expectedBundlePath)),
          ).resolves.toBeTruthy();

          const kB = Number(
            output.match(/dist\/server\/index\.js\s+([\d.]+)\s+kB/)?.[1] || '',
          );

          // Bundle size within 1 MB
          expect(kB).toBeGreaterThan(0);
          expect(kB).toBeLessThan(1024);
        });
      });

      it('runs dev in the generated project', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            git: true,
            language: 'ts',
            styling: 'postcss',
            i18n: 'subfolders',
            routes: true,
            installDeps: true,
          });

          // Clear previous success messages
          outputMock.clear();

          const {close, getUrl} = await runViteDev({
            path: tmpDir,
            disableVirtualRoutes: true,
            disableVersionCheck: true,
            cliConfig: {} as any,
          });

          try {
            await vi.waitFor(
              () => expect(outputMock.output()).toMatch(/View [^:]+? app:/i),
              {timeout: 5000},
            );

            const response = await fetch(getUrl());
            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toEqual('text/html');
            await expect(response.text()).resolves.toMatch('Mock.shop');
          } finally {
            await close();
          }
        });
      });
    });

    describe('Quickstart options', () => {
      it('Scaffolds Quickstart project with expected values', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          await runInit({
            path: tmpDir,
            quickstart: true,
            installDeps: false,
          });

          const templateFiles = await glob('**/*', {
            cwd: getSkeletonSourceDir().replace(
              'skeleton',
              'hydrogen-quickstart',
            ),
            ignore: ['**/node_modules/**', '**/dist/**'],
          });
          const resultFiles = await glob('**/*', {cwd: tmpDir});
          const nonAppFiles = templateFiles.filter(
            (item) => !item.startsWith('app/'),
          );

          expect(resultFiles).toEqual(expect.arrayContaining(nonAppFiles));

          expect(resultFiles).toContain('app/root.jsx');
          expect(resultFiles).toContain('app/entry.client.jsx');
          expect(resultFiles).toContain('app/entry.server.jsx');
          expect(resultFiles).toContain('app/components/Layout.jsx');
          expect(resultFiles).toContain('app/routes/_index.jsx');
          expect(resultFiles).not.toContain('app/routes/($locale)._index.jsx');

          // await expect(readFile(`${tmpDir}/package.json`)).resolves.toMatch(
          //   `"name": "hello-world"`,
          // );

          const output = outputMock.info();
          expect(output).not.toMatch('warning');
          expect(output).toMatch('success');
          expect(output).toMatch(/Shopify:\s+Mock.shop/);
          expect(output).toMatch(/Language:\s+JavaScript/);
          // TODO
          // expect(output).toMatch(/Styling:\s+Tailwind/);
          expect(output).toMatch('Routes');
          expect(output).toMatch('Next steps');
        });
      });
    });
  });
});
