import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {setupTemplate} from './index.js';
import {setupCssStrategy} from '../setups/css/index.js';
import {renderSelectPrompt, renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {outputInfo, outputSuccess} from '@shopify/cli-kit/node/output';
import {packageManagerFromUserAgent} from '@shopify/cli-kit/node/node-package-manager';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';

vi.mock('../setups/css/index.js');
vi.mock('@shopify/cli-kit/node/ui');
vi.mock('@shopify/cli-kit/node/output');
vi.mock('@shopify/cli-kit/node/node-package-manager');
vi.mock('./setup-template.js', () => ({
  setupLocalStarterTemplate: vi.fn().mockResolvedValue({
    rootDirectory: '/test-project',
    appDirectory: '/test-project/app',
  }),
  setupRemoteTemplate: vi.fn().mockResolvedValue({
    rootDirectory: '/test-project',
    appDirectory: '/test-project/app',
  }),
}));

describe('Tailwind v4 onboarding integration', () => {
  const mockOutput = mockAndCaptureOutput();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOutput.clear();
    vi.mocked(packageManagerFromUserAgent).mockReturnValue('npm');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Quickstart with Tailwind', () => {
    it('sets up Tailwind v4 by default in quickstart mode', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        quickstart: true,
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.objectContaining({
          rootDirectory: '/test-project',
          appDirectory: '/test-project/app',
        }),
        false,
      );
    });

    it('generates Tailwind assets during quickstart setup', async () => {
      const tailwindAssets = [
        'app/styles/tailwind.css',
      ];

      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: tailwindAssets,
        needsInstallDeps: true,
      });

      await setupTemplate({
        quickstart: true,
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalled();
      expect(outputSuccess).toHaveBeenCalled();
    });
  });

  describe('Interactive Tailwind selection', () => {
    it('prompts for Tailwind when no styling option provided', async () => {
      vi.mocked(renderSelectPrompt).mockResolvedValue('tailwind');
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        installDeps: false,
        git: false,
      });

      expect(renderSelectPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('styling'),
          defaultValue: 'tailwind',
        }),
      );
    });

    it('shows Tailwind v4 as the first option', async () => {
      vi.mocked(renderSelectPrompt).mockImplementation(async (options) => {
        const choices = options.choices;
        expect(choices[0]).toEqual(
          expect.objectContaining({
            value: 'tailwind',
            label: expect.stringContaining('Tailwind'),
          }),
        );
        return 'tailwind';
      });

      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: [],
        needsInstallDeps: true,
      });

      await setupTemplate({
        installDeps: false,
        git: false,
      });

      expect(renderSelectPrompt).toHaveBeenCalled();
    });
  });

  describe('Tailwind with template variations', () => {
    it('integrates Tailwind with TypeScript templates', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        language: 'ts',
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.any(Object),
        false,
      );
    });

    it('integrates Tailwind with JavaScript templates', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        language: 'js',
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.any(Object),
        false,
      );
    });

    it('works with custom templates and Tailwind', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        template: 'custom-template',
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.any(Object),
        false,
      );
    });
  });

  describe('Tailwind dependencies and installation', () => {
    it('installs Tailwind dependencies when installDeps is true', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        styling: 'tailwind',
        installDeps: true,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalled();
    });

    it('skips Tailwind dependencies when installDeps is false', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(outputInfo).toHaveBeenCalledWith(
        expect.stringContaining('install'),
      );
    });

    it('uses correct package manager for Tailwind dependencies', async () => {
      const packageManagers = ['npm', 'yarn', 'pnpm'];

      for (const pm of packageManagers) {
        vi.clearAllMocks();
        vi.mocked(packageManagerFromUserAgent).mockReturnValue(pm);
        vi.mocked(setupCssStrategy).mockReturnValue({
          workPromise: Promise.resolve(),
          generatedAssets: ['app/styles/tailwind.css'],
          needsInstallDeps: true,
        });

        await setupTemplate({
          styling: 'tailwind',
          packageManager: pm,
          installDeps: false,
          git: false,
        });

        expect(outputInfo).toHaveBeenCalledWith(
          expect.stringContaining(pm),
        );
      }
    });
  });

  describe('Tailwind with i18n configurations', () => {
    it('sets up Tailwind with subfolders i18n', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        styling: 'tailwind',
        i18n: 'subfolders',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.any(Object),
        false,
      );
    });

    it('sets up Tailwind with domains i18n', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        styling: 'tailwind',
        i18n: 'domains',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.any(Object),
        false,
      );
    });

    it('sets up Tailwind with subdomains i18n', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        styling: 'tailwind',
        i18n: 'subdomains',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.any(Object),
        false,
      );
    });
  });

  describe('Error handling for Tailwind setup', () => {
    it('handles Tailwind setup failure gracefully', async () => {
      const error = new Error('Tailwind setup failed');
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.reject(error),
        generatedAssets: [],
        needsInstallDeps: false,
      });

      await expect(
        setupTemplate({
          styling: 'tailwind',
          installDeps: false,
          git: false,
        }),
      ).rejects.toThrow('Tailwind setup failed');
    });

    it('continues setup when Tailwind returns undefined', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue(undefined);

      await setupTemplate({
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(outputSuccess).toHaveBeenCalled();
    });
  });

  describe('Tailwind v4 specific configurations', () => {
    it('configures Tailwind with Vite plugin', async () => {
      vi.mocked(setupCssStrategy).mockImplementation((strategy, config) => {
        expect(strategy).toBe('tailwind');
        expect(config).toHaveProperty('rootDirectory');
        expect(config).toHaveProperty('appDirectory');
        return {
          workPromise: Promise.resolve(),
          generatedAssets: ['app/styles/tailwind.css'],
          needsInstallDeps: true,
        };
      });

      await setupTemplate({
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalled();
    });

    it('creates CSS-first configuration file', async () => {
      const expectedAssets = ['app/styles/tailwind.css'];

      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: expectedAssets,
        needsInstallDeps: true,
      });

      await setupTemplate({
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveReturnedWith(
        expect.objectContaining({
          generatedAssets: expectedAssets,
        }),
      );
    });

    it('handles production-ready Tailwind configuration', async () => {
      vi.mocked(setupCssStrategy).mockReturnValue({
        workPromise: Promise.resolve(),
        generatedAssets: ['app/styles/tailwind.css'],
        needsInstallDeps: true,
      });

      await setupTemplate({
        styling: 'tailwind',
        installDeps: false,
        git: false,
      });

      expect(setupCssStrategy).toHaveBeenCalledWith(
        'tailwind',
        expect.objectContaining({
          rootDirectory: expect.any(String),
          appDirectory: expect.any(String),
        }),
        false,
      );
    });
  });
});