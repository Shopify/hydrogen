import {symlink, rm as rmdir} from 'node:fs/promises';
import {vi} from 'vitest';
import {writeFile} from '@shopify/cli-kit/node/fs';
import {dirname, joinPath} from '@shopify/cli-kit/node/path';
import {getRepoNodeModules, getSkeletonSourceDir} from '../build.js';

const {renderTasksHook} = vi.hoisted(() => ({renderTasksHook: vi.fn()}));

vi.mock('../template-downloader.js', async () => ({
  downloadMonorepoTemplates: () =>
    Promise.resolve({
      version: '',
      templatesDir: dirname(getSkeletonSourceDir()),
      examplesDir: dirname(getSkeletonSourceDir()).replace(
        'templates',
        'examples',
      ),
    }),
  downloadExternalRepo: () =>
    Promise.resolve({
      templateDir: getSkeletonSourceDir(),
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
    const original =
      await importOriginal<
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
        await rmdir(joinPath(directory, 'node_modules'), {
          force: true,
          recursive: true,
        }).catch(() => {});

        await symlink(
          await getRepoNodeModules(),
          joinPath(directory, 'node_modules'),
        );
      }),
    };
  },
);

vi.mock('./common.js', async (importOriginal) => {
  type ModType = typeof import('./common.js');
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
