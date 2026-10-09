import {beforeEach, expect, it, vi} from 'vitest';
import {handler} from '@shopify/cli-kit/node/error';
import {captureJsonOutput} from '../../../tests/output.js';
import {createPlatformShortcut} from '../../lib/shell.js';
import Shortcut, {runCreateShortcut} from './shortcut.js';
import Upgrade, {presentUpgradeResult} from './upgrade.js';

vi.mock('../../lib/shell.js');
beforeEach(() => vi.clearAllMocks());

it('encodes the shortcut and shells without the success banner', async () => {
  vi.mocked(createPlatformShortcut).mockResolvedValue(['zsh', 'bash']);
  const {stdout, stderr} = await captureJsonOutput(() => runCreateShortcut());
  expect(JSON.parse(stdout)).toEqual({alias: 'h2', shells: ['zsh', 'bash']});
  expect(stderr).toBe('');
});

it('keeps unsupported shells on the fatal-error path in JSON mode', async () => {
  vi.mocked(createPlatformShortcut).mockResolvedValue([]);
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
      version: '2026.4.0',
      packages: ['@shopify/hydrogen@2026.4.0'],
      removedPackages: ['@remix-run/react'],
      instructionsPath: '/project/.hydrogen/upgrade.md',
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
      : {result: {...result, changed: false as const}};
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
  vi.mocked(createPlatformShortcut).mockResolvedValue([]);
  await expect(runCreateShortcut(false)).rejects.toThrow(
    'No supported shell found.',
  );
});
