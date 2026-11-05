import {afterEach, expect, it, vi} from 'vitest';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {presentTemplateResult, toInitResult} from './result.js';
import {captureJsonOutput} from '../../../tests/output.js';

vi.mock('./common.js', () => ({renderProjectReady: vi.fn()}));
vi.mock('@shopify/cli-kit/node/ui', () => ({renderInfo: vi.fn()}));
const exitCode = process.exitCode;
afterEach(() => {
  process.exitCode = exitCode;
  vi.clearAllMocks();
});
const project = {
  location: 'example',
  name: 'example',
  directory: '/example',
  language: 'ts' as const,
  packageManager: 'npm' as const,
  depsInstalled: false,
  cliCommand: 'h2' as const,
};
it.each(['json', 'text'])(
  'sets exit code 1 for partial setup in %s mode',
  async (mode) => {
    const run = () =>
      presentTemplateResult({
        ...project,
        depsError: new Error('Install failed'),
      });
    if (mode === 'json') await captureJsonOutput(run);
    else await run();
    expect(process.exitCode).toBe(1);
  },
);
it('does not report a failed markets strategy as applied', () => {
  expect(
    toInitResult({
      ...project,
      i18n: 'domains',
      i18nError: new Error('Setup failed'),
    }),
  ).toMatchObject({
    status: 'partial',
    project: {i18n: null},
    failures: ['markets'],
  });
});
it.each(['demo-store', 'https://github.com/shopify/hydrogen-demo-store'])(
  'shows demo inventory guidance for %s',
  async (template) => {
    await presentTemplateResult(project, template);
    expect(renderInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        headline:
          'Your project will display inventory from the Hydrogen Demo Store.',
      }),
    );
  },
);
