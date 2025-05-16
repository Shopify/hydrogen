import '../../lib/onboarding/setup-template.mocks.js';
import {describe, it, expect, vi, beforeEach, beforeAll} from 'vitest';
import {runInit} from './init.js';
import {exec} from '@shopify/cli-kit/node/system';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {fileExists, readFile, removeFile} from '@shopify/cli-kit/node/fs';
import {temporaryDirectory} from 'tempy';
import {checkCurrentCLIVersion} from '../../lib/check-cli-version.js';
import {runCheckRoutes} from './check.js';
import {runCodegen} from './codegen.js';
import {setupTemplate} from '../../lib/onboarding/index.js';

vi.mock('../../lib/check-cli-version.js');

vi.mock('../../lib/onboarding/index.js', async () => {
  const original = await vi.importActual<
    typeof import('../../lib/onboarding/index.js')
  >('../../lib/onboarding/index.js');

  return {
    ...original,
    setupTemplate: vi.fn(original.setupTemplate),
  };
});

describe('init', () => {
  const outputMock = mockAndCaptureOutput();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    outputMock.clear();
  });

  it('checks Hydrogen CLI version', async () => {
    const showUpgradeMock = vi.fn((param?: string) => ({
      currentVersion: '1.0.0',
      newVersion: '1.0.1',
    }));
    vi.mocked(checkCurrentCLIVersion).mockResolvedValueOnce(showUpgradeMock);
    vi.mocked(setupTemplate).mockResolvedValueOnce(undefined);

    const project = await runInit({packageManager: 'pnpm'});

    expect(project).toBeFalsy();
    expect(checkCurrentCLIVersion).toHaveBeenCalledOnce();
    expect(showUpgradeMock).toHaveBeenCalledWith('pnpm');
  });

  it('scaffolds Quickstart project with expected values', async () => {
    vi.mocked(setupTemplate).mockResolvedValueOnce(undefined);

    await runInit({
      quickstart: true,
      installDeps: false,
    });

    expect(setupTemplate).toHaveBeenCalledWith({
      i18n: 'none',
      installDeps: false,
      language: 'js',
      mockShop: true,
      path: './hydrogen-quickstart',
      routes: true,
      shortcut: true,
      quickstart: true,
      git: true,
      // TODO: enable Tailwind once v4 is stable
      styling: 'none',
    });
  });

  describe('project validity', () => {
    let tmpDir: string;

    beforeAll(async () => {
      tmpDir = temporaryDirectory({prefix: 'h2-test-'});

      await expect(
        runInit({
          path: tmpDir,
          quickstart: true,
          language: 'ts',
          styling: 'none',
        }),
      ).resolves.not.toThrow();

      return () => removeFile(tmpDir);
    });

    // TODO BEFORE MERGE: fix this test
    /**
     * Caused by: Error: Command failed with exit code 1: npm run typecheck
     * Error: EACCES: permission denied, mkdir '/private/var/Users/bayjorix/src/github.com/Shopify/hydrogen/packages/hydrogen/dist/vite/virtual-routes/+types'
     *
     * it seems like react-router typegen prepends /private/var to the absolute path. this is probably because we run it in a temporary tmpDir which is under /private/var but in a specific directory where it WOULD have write access.


     */
    it.skip('typechecks the project', async () => {
      // This will throw if TSC fails
      await expect(
        exec('npm', ['run', 'typecheck'], {cwd: tmpDir}),
      ).resolves.not.toThrow();
    });

    it('contains all standard routes', async () => {
      // Clear previous success messages
      outputMock.clear();

      await runCheckRoutes({directory: tmpDir});

      const output = outputMock.info();
      expect(output).toMatch('success');
    });

    it('supports codegen', async () => {
      // Clear previous success messages
      outputMock.clear();

      const codegenFile = `${tmpDir}/storefrontapi.generated.d.ts`;
      const codegenFromTemplate = await readFile(codegenFile);
      expect(codegenFromTemplate).toBeTruthy();

      await removeFile(codegenFile);
      await expect(fileExists(codegenFile)).resolves.toBeFalsy();

      await expect(runCodegen({directory: tmpDir})).resolves.not.toThrow();

      const output = outputMock.info();
      expect(output).toMatch('success');

      await expect(readFile(codegenFile)).resolves.toEqual(codegenFromTemplate);
    });
  });
});
