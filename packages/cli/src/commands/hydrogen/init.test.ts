import '../../lib/onboarding/setup-template.mocks.js';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest';
import {runInit} from './init.js';
import {exec} from '@shopify/cli-kit/node/system';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {
  fileExists,
  mkdirSync,
  readFile,
  removeFile,
} from '@shopify/cli-kit/node/fs';
import {checkCurrentCLIVersion} from '../../lib/check-cli-version.js';
import {runCheckRoutes} from './check.js';
import {runCodegen} from './codegen.js';
import {setupTemplate} from '../../lib/onboarding/index.js';
import path from 'node:path';

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

async function validateProjectReady(projectDir: string): Promise<void> {
  const requiredFiles = [
    'package.json',
    'app/entry.server.tsx',
    'app/routes/_index.tsx',
    'node_modules',
  ];

  const maxWaitTime = 30000; // 30 seconds max
  const pollInterval = 500; // Check every 500ms
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    let allFilesExist = true;

    for (const file of requiredFiles) {
      const filePath = path.join(projectDir, file);
      if (!(await fileExists(filePath))) {
        allFilesExist = false;
        break;
      }
    }

    if (allFilesExist) {
      // Additional check: ensure package.json has the codegen script
      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJson = JSON.parse(await readFile(packageJsonPath));

      if (packageJson.scripts?.codegen) {
        return; // Project is ready
      }
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Project setup validation failed after ${maxWaitTime}ms. Required files or scripts not found.`,
  );
}

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
    let tmpDirInstance: number = 0;
    let tmpDir: string;

    beforeAll(async () => {
      // Should be the root of the hydrogen repository.
      const projectRootDir = path.join(__dirname, '..', '..', '..', '..', '..');
      tmpDir = path.join(
        projectRootDir,
        `test-project-init-${tmpDirInstance++}`,
      );
      mkdirSync(tmpDir);

      await expect(
        runInit({
          path: tmpDir,
          quickstart: true,
          language: 'ts',
          styling: 'none',
        }),
      ).resolves.not.toThrow();
    });

    afterAll(async () => {
      await removeFile(tmpDir);
    });

    it('typechecks the project', async () => {
      // Validate that the project is ready for codegen
      await validateProjectReady(tmpDir);

      // Run codegen first to generate TypeScript definitions
      await expect(
        exec('npm', ['run', 'codegen'], {cwd: tmpDir}),
      ).resolves.not.toThrow();

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
