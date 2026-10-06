import {beforeEach, expect, it, vi} from 'vitest';
import {handler} from '@shopify/cli-kit/node/error';
import {captureJsonOutput} from '../../../tests/output.js';
import {createPlatformShortcut} from '../../lib/shell.js';
import Shortcut, {runCreateShortcut} from './shortcut.js';
import Upgrade, {presentUpgradeResult} from './upgrade.js';

vi.mock('../../lib/shell.js');
beforeEach(() => vi.clearAllMocks());

it('encodes the shortcut and shells without the success banner', async () => {
  vi.mocked(createPlatformShortcut).mockResolvedValue({
    shells: ['zsh', 'bash'],
    changed: true,
  });
  const {stdout, stderr} = await captureJsonOutput(() => runCreateShortcut());
  expect(JSON.parse(stdout)).toEqual({
    status: 'success',
    changed: true,
    alias: 'h2',
    shells: ['zsh', 'bash'],
  });
  expect(stderr).toBe('');
});

it('keeps unsupported shells on the fatal-error path in JSON mode', async () => {
  vi.mocked(createPlatformShortcut).mockResolvedValue({
    shells: [],
    changed: false,
  });
  const {stdout, stderr} = await captureJsonOutput(async () => {
    await runCreateShortcut().catch(handler);
  });
  expect(JSON.parse(stdout)).toEqual({
    error: {
      type: 'abort',
      message: 'No supported shell found.',
      tryMessage: 'Please create a shortcut manually.',
    },
  });
  expect(stderr).toBe('');
});

it.each([true, false])(
  'encodes %s results through the real upgrade presenter and writer',
  async (changed) => {
    const result = {
      status: 'success' as const,
      changed,
      directory: '/project',
      previousVersion: '2026.1.0',
      version: changed ? '2026.4.0' : '2026.1.0',
      packages: changed ? ['@shopify/hydrogen@2026.4.0'] : [],
      removedPackages: changed ? ['@remix-run/react'] : [],
      instructionsPath: changed ? '/project/.hydrogen/upgrade.md' : null,
    };
    const execution = changed
      ? {
          result: {...result, changed: true as const},
          selectedRelease: {
            version: '2026.4.0',
            title: 'Hydrogen update',
            date: '2026-04-01',
            hash: 'abc123',
            commit:
              'https://github.com/Shopify/hydrogen/commit/abc123' as const,
            pr: 'https://github.com/Shopify/hydrogen/pull/1' as const,
            dependencies: {'@shopify/hydrogen': '2026.4.0'},
            features: [],
            fixes: [],
          },
        }
      : {result: {...result, changed: false as const, instructionsPath: null}};
    const {stdout, stderr} = await captureJsonOutput(() =>
      presentUpgradeResult(execution),
    );
    expect(JSON.parse(stdout)).toEqual(result);
    expect(stderr).toBe('');
    expect(() =>
      Upgrade.jsonOutputSchema.encode({...result, packages: [1]} as any),
    ).toThrow();
  },
);

it.each([Shortcut, Upgrade])(
  'exposes JSON flags and discoverable schemas: %s',
  (command) => {
    expect(command.flags.json).toBeDefined();
    expect(command.description).toContain(command.jsonOutputSchema.name);
  },
);

it('fails for unsupported shells in text mode too', async () => {
  vi.mocked(createPlatformShortcut).mockResolvedValue({
    shells: [],
    changed: false,
  });
  await expect(runCreateShortcut(false)).rejects.toThrow(
    'No supported shell found.',
  );
});

it('reports an existing shortcut as unchanged', async () => {
  vi.mocked(createPlatformShortcut).mockResolvedValue({
    shells: ['zsh'],
    changed: false,
  });
  const {stdout} = await captureJsonOutput(() => runCreateShortcut());
  expect(JSON.parse(stdout)).toEqual({
    status: 'success',
    changed: false,
    alias: 'h2',
    shells: ['zsh'],
  });
});

it.each([
  {version: '2026.4.0'},
  {packages: ['@shopify/hydrogen@2026.4.0']},
  {removedPackages: ['@remix-run/react']},
  {instructionsPath: '/project/.hydrogen/upgrade.md'},
])('rejects no-op upgrade results with changes: %j', (invalid) => {
  expect(() =>
    Upgrade.jsonOutputSchema.encode({
      status: 'success',
      changed: false,
      directory: '/project',
      previousVersion: '2026.1.0',
      version: '2026.1.0',
      packages: [],
      removedPackages: [],
      instructionsPath: null,
      ...invalid,
    } as any),
  ).toThrow();
});
