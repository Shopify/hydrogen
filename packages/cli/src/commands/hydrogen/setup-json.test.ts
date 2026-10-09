import {beforeEach, expect, it, vi} from 'vitest';
import {copyFile, fileExists, glob} from '@shopify/cli-kit/node/fs';
import {captureJsonOutput} from '../../../tests/output.js';
import {getRemixConfig} from '../../lib/remix-config.js';
import {handleRouteGeneration} from '../../lib/onboarding/common.js';
import {createPlatformShortcut} from '../../lib/shell.js';
import {runSetup} from './setup.js';

vi.mock('../../lib/remix-config.js');
vi.mock('../../lib/build.js', () => ({
  getTemplateAppFile: async () => '/template',
}));
vi.mock('../../lib/shell.js', async (original) => ({
  ...(await original<typeof import('../../lib/shell.js')>()),
  getCliCommand: () => 'shopify hydrogen',
  createPlatformShortcut: vi.fn(),
}));
vi.mock('@shopify/cli-kit/node/fs', async (original) => ({
  ...(await original<typeof import('@shopify/cli-kit/node/fs')>()),
  copyFile: vi.fn(),
  fileExists: vi.fn(),
  glob: vi.fn(),
}));
vi.mock('../../lib/onboarding/common.js', async (original) => ({
  ...(await original<typeof import('../../lib/onboarding/common.js')>()),
  generateProjectEntries: vi.fn(),
  handleRouteGeneration: vi.fn(),
}));
const routes = {'Home (/ & /:catchAll)': ['app/routes/_index.tsx']};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRemixConfig).mockResolvedValue({
    rootDirectory: '/project',
    appDirectory: '/project/app',
  } as any);
  vi.mocked(fileExists).mockResolvedValue(true);
  vi.mocked(glob).mockResolvedValue(['env.d.ts']);
  vi.mocked(handleRouteGeneration).mockReturnValue({
    setupRoutes: async () => routes,
  } as ReturnType<typeof handleRouteGeneration>);
});

it('awaits background route work and exposes only public setup fields on early return', async () => {
  let finishRoutes!: (routes: Record<string, string[]>) => void;
  const setupRoutes = vi.fn(
    () =>
      new Promise<Record<string, string[]>>((resolve) => {
        finishRoutes = resolve;
      }),
  );
  vi.mocked(handleRouteGeneration).mockReturnValue({setupRoutes} as ReturnType<
    typeof handleRouteGeneration
  >);
  const {stdout} = await captureJsonOutput(async () => {
    let finished = false;
    const work = runSetup({
      directory: '/project',
      markets: 'none',
      shortcut: false,
      installDeps: false,
    }).then(() => {
      finished = true;
    });
    await vi.waitFor(() => expect(setupRoutes).toHaveBeenCalled());
    expect(finished).toBe(false);
    finishRoutes(routes);
    await work;
  });
  expect(copyFile).toHaveBeenCalledWith(
    '/template/env.d.ts',
    '/project/env.d.ts',
  );
  expect(JSON.parse(stdout)).toEqual({
    status: 'success',
    changed: true,
    directory: '/project',
    name: 'project',
    i18n: null,
    routes,
    shortcut: false,
  });
});

it.each([
  {shells: ['zsh' as const], shortcut: true},
  {shells: [], shortcut: false},
])('reports shortcut creation accurately: %j', async ({shells, shortcut}) => {
  vi.mocked(createPlatformShortcut).mockResolvedValue(shells);
  const {stdout} = await captureJsonOutput(() =>
    runSetup({
      directory: '/project',
      markets: 'none',
      shortcut: true,
      installDeps: false,
    }),
  );
  expect(createPlatformShortcut).toHaveBeenCalledOnce();
  expect(JSON.parse(stdout)).toEqual({
    status: 'success',
    changed: true,
    directory: '/project',
    name: 'project',
    i18n: null,
    routes,
    shortcut,
  });
});
