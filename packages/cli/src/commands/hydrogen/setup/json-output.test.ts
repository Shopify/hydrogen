import {beforeEach, expect, it, vi} from 'vitest';
import {captureJsonOutput} from '../../../../tests/output.js';
import {getViteConfig, hasViteConfig} from '../../../lib/vite-config.js';
import {getRemixConfig} from '../../../lib/remix-config.js';
import {
  setupCssStrategy,
  renderCssPrompt,
} from '../../../lib/setups/css/index.js';
import {setupI18nStrategy} from '../../../lib/setups/i18n/index.js';
import Setup from '../setup.js';
import SetupCSS, {runSetupCSS} from './css.js';
import SetupMarkets, {runSetupMarkets} from './markets.js';
import SetupVite, {runSetupVite, presentSetupVite} from './vite.js';

vi.mock('../../../lib/vite-config.js');
vi.mock('../../../lib/remix-config.js');
vi.mock('../../../lib/setups/css/index.js', async (original) => ({
  ...(await original<any>()),
  setupCssStrategy: vi.fn(),
  renderCssPrompt: vi.fn(),
}));
vi.mock('../../../lib/setups/i18n/index.js', async (original) => ({
  ...(await original<any>()),
  setupI18nStrategy: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getViteConfig).mockResolvedValue({
    remixConfig: {rootDirectory: '/project'},
  } as any);
  vi.mocked(getRemixConfig).mockResolvedValue({
    rootDirectory: '/project',
    serverEntryPoint: '/project/server.ts',
  } as any);
  vi.mocked(setupCssStrategy).mockResolvedValue({
    workPromise: Promise.resolve(),
    generatedAssets: ['tailwind.css'],
    needsInstallDeps: false,
  });
});

it('reports configured CSS files and puts task progress on stderr', async () => {
  const {stdout, stderr} = await captureJsonOutput(() =>
    runSetupCSS({
      directory: '/project',
      strategy: 'tailwind',
      installDeps: false,
    }),
  );
  expect(JSON.parse(stdout)).toEqual({
    directory: '/project',
    status: 'configured',
    strategy: 'tailwind',
    files: ['tailwind.css'],
    dependenciesInstalled: false,
    needsNpmReinstall: false,
  });
  expect(
    stderr
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line)),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({type: 'progress', status: 'completed'}),
    ]),
  );
});

it('preserves CSS strategy prompts in JSON mode and handles built-in support', async () => {
  vi.mocked(renderCssPrompt).mockResolvedValue('css-modules');
  const {stdout} = await captureJsonOutput(() =>
    runSetupCSS({directory: '/project', installDeps: false}),
  );
  expect(renderCssPrompt).toHaveBeenCalled();
  expect(JSON.parse(stdout)).toMatchObject({
    status: 'built-in',
    strategy: 'css-modules',
    files: [],
  });
  expect(setupCssStrategy).not.toHaveBeenCalled();
});

it('reports a cancelled CSS setup without claiming files were written', async () => {
  vi.mocked(setupCssStrategy).mockResolvedValue(undefined);
  const {stdout} = await captureJsonOutput(() =>
    runSetupCSS({
      directory: '/project',
      strategy: 'tailwind',
      installDeps: false,
    }),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    status: 'cancelled',
    files: [],
    dependenciesInstalled: false,
  });
});

it('reports the selected markets strategy after applying it', async () => {
  const {stdout} = await captureJsonOutput(() =>
    runSetupMarkets({directory: '/project', strategy: 'domains'}),
  );
  expect(JSON.parse(stdout)).toEqual({
    directory: '/project',
    strategy: 'domains',
    serverEntryPoint: '/project/server.ts',
  });
  expect(setupI18nStrategy).toHaveBeenCalledWith(
    'domains',
    expect.objectContaining({rootDirectory: '/project'}),
  );
});

it('encodes Vite migration results through the real presenter and writer', async () => {
  const result = {
    directory: '/project',
    viteConfig: '/project/vite.config.ts',
    serverEntryPoint: '/project/server.ts',
    dependenciesInstalled: true as const,
    needsMdxSetup: false,
  };
  const {stdout, stderr} = await captureJsonOutput(() =>
    presentSetupVite(result),
  );
  expect(JSON.parse(stdout)).toEqual(result);
  expect(stderr).toBe('');
  expect(() =>
    SetupVite.jsonOutputSchema.encode({...result, viteConfig: null} as any),
  ).toThrow();
});

it('does not encode success when the project already uses Vite', async () => {
  vi.mocked(hasViteConfig).mockResolvedValue(true);
  const {stdout} = await captureJsonOutput(async () => {
    await expect(runSetupVite({directory: '/project'})).rejects.toThrow(
      'already has a Vite config',
    );
  });
  expect(stdout).toBe('');
});

it.each([Setup, SetupCSS, SetupMarkets, SetupVite])(
  'exposes JSON flags and discoverable schemas: %s',
  (command) => {
    expect(command.flags.json).toBeDefined();
    expect(command.description).toContain(command.jsonOutputSchema.name);
  },
);
