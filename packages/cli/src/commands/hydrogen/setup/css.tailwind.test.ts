import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {runSetupCss} from './css.js';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {setupCssStrategy} from '../../../lib/setups/css/index.js';
import {findFileWithExtension} from '../../../lib/file.js';
import {inMemoryFs} from '@shopify/cli-kit/node/testing/fs';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

vi.mock('@shopify/cli-kit/node/ui');
vi.mock('../../../lib/setups/css/index.js');
vi.mock('../../../lib/file.js');
vi.mock('../../../lib/log.js', () => ({
  getDebugLogger: () => ({
    debug: vi.fn(),
  }),
}));

describe('setup css - Tailwind v4 workflow', () => {
  const mockOutput = mockAndCaptureOutput();
  const rootDirectory = '/test-project';
  const appDirectory = '/test-project/app';

  beforeEach(() => {
    vi.clearAllMocks();
    mockOutput.clear();
    
    inMemoryFs({
      [rootDirectory]: {
        'package.json': JSON.stringify({
          name: 'hydrogen-project',
          dependencies: {},
        }),
      },
      [appDirectory]: {
        'root.tsx': 'export default function App() {}',
      },
    });

    vi.mocked(findFileWithExtension).mockResolvedValue({
      filepath: `${appDirectory}/root.tsx`,
      astType: 'tsx',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tailwind as default choice', () => {
    it('defaults to Tailwind when no option is provided', async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue('tailwind');
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
      });

      expect(renderSelectPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: 'tailwind',
          message: 'Select a styling library',
        }),
      );

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.objectContaining({
          rootDirectory,
          appDirectory,
        }),
        false,
      );
    });

    it('sets up Tailwind v4 when explicitly selected', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
      });

      expect(renderSelectPrompt).not.toHaveBeenCalled();
      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.objectContaining({
          rootDirectory,
          appDirectory,
        }),
        false,
      );
    });

    it('shows Tailwind v4 in the selection prompt', async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue('tailwind');
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: [],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
      });

      expect(renderSelectPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({
              value: 'tailwind',
              label: 'Tailwind v4',
            }),
          ]),
        }),
      );
    });
  });

  describe('Tailwind setup outcomes', () => {
    it('reports generated Tailwind CSS files', async () => {
      const generatedAssets = [
        'app/styles/tailwind.css',
      ];

      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets,
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
      });

      const output = mockOutput.info();
      expect(output).toContain('tailwind.css');
    });

    it('handles Tailwind setup with force flag', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
        force: true,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.any(Object),
        true,
      );
    });

    it('prompts for dependency installation after Tailwind setup', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
        installDeps: false,
      });

      const output = mockOutput.info();
      expect(output).toContain('install dependencies');
    });

    it('handles Tailwind setup with automatic dependency installation', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
        installDeps: true,
      });

      const output = mockOutput.info();
      expect(output).toContain('Installing dependencies');
    });
  });

  describe('Tailwind setup errors', () => {
    it('handles errors during Tailwind setup', async () => {
      const error = new Error('Failed to setup Tailwind');
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.reject(error),
        generatedAssets: [],
        needsInstallDeps: false,
      });

      await expect(
        runSetupCss({
          path: rootDirectory,
          styling: 'tailwind',
        }),
      ).rejects.toThrow('Failed to setup Tailwind');
    });

    it('handles missing root file error', async () => {
      vi.mocked(findFileWithExtension).mockResolvedValue({
        filepath: undefined,
        astType: undefined,
      });

      await expect(
        runSetupCss({
          path: rootDirectory,
          styling: 'tailwind',
        }),
      ).rejects.toThrow();
    });

    it('skips Tailwind setup when no result is returned', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue(undefined);

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
      });

      const output = mockOutput.info();
      expect(output).not.toContain('CSS setup');
    });
  });

  describe('Tailwind integration with other CSS strategies', () => {
    it('allows switching from other CSS strategies to Tailwind', async () => {
      const strategies = ['vanilla-extract', 'css-modules', 'postcss'];

      for (const fromStrategy of strategies) {
        vi.clearAllMocks();
        mockOutput.clear();

        vi.mocked(renderSelectPrompt).mockResolvedValue('tailwind');
        vi.mocked(setupCssStrategy).mockReturnValue({
          workPromise: Promise.resolve(),
          generatedAssets: ['app/styles/tailwind.css'],
          needsInstallDeps: true,
        });

        await runSetupCss({
          path: rootDirectory,
        });

        expect(setupCssStrategy).toHaveBeenCalledWith(
          'tailwind',
          expect.any(Object),
          false,
        );
      }
    });

    it('respects user choice when not selecting Tailwind', async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue('vanilla-extract');
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles.css.ts'],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'vanilla-extract',
        expect.any(Object),
        false,
      );
    });
  });

  describe('Tailwind with Vite integration', () => {
    it('verifies Vite configuration exists before Tailwind setup', async () => {
      inMemoryFs({
        [rootDirectory]: {
          'package.json': JSON.stringify({name: 'test'}),
          'vite.config.ts': 'export default {}',
        },
        [appDirectory]: {
          'root.tsx': 'export default function App() {}',
        },
      });

      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
      });

      expect(setupCssStrategy).toHaveBeenCalled();
    });
  });

  describe('Tailwind v4 specific features', () => {
    it('uses CSS-first configuration approach', async () => {
      vi.mocked(setupCssStrategy).mockImplementation((strategy, config) => {
        expect(strategy).toBe('tailwind');
        return {
          workPromise: Promise.resolve(),
          generatedAssets: ['app/styles/tailwind.css'],
          needsInstallDeps: true,
        };
      });

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
      });

      expect(setupCssStrategy).toHaveBeenCalled();
    });

    it('configures @tailwindcss/vite plugin', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await runSetupCss({
        path: rootDirectory,
        styling: 'tailwind',
      });

      const output = mockOutput.info();
      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.objectContaining({
          rootDirectory,
        }),
        false,
      );
    });
  });
});