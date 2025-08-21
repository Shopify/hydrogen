import {describe, it, expect, vi, beforeEach} from 'vitest';
import {runInit} from './init.js';
import {setupTemplate} from '../../lib/onboarding/index.js';
import {checkCurrentCLIVersion} from '../../lib/check-cli-version.js';

vi.mock('../../lib/check-cli-version.js');
vi.mock('../../lib/onboarding/index.js');

describe('init - Tailwind CSS v4 integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkCurrentCLIVersion).mockResolvedValue(false);
    vi.mocked(setupTemplate).mockResolvedValue(undefined);
  });

  describe('Tailwind CSS setup', () => {
    it('enables Tailwind v4 by default in quickstart mode', async () => {
      await runInit({
        quickstart: true,
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          quickstart: true,
        }),
      );
    });

    it('allows explicit Tailwind selection', async () => {
      await runInit({
        styling: 'tailwind',
        path: './my-project',
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          path: './my-project',
        }),
      );
    });

    it('allows overriding default Tailwind in quickstart', async () => {
      await runInit({
        quickstart: true,
        styling: 'none',
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'none',
          quickstart: true,
        }),
      );
    });

    it('validates styling choice and throws for invalid values', async () => {
      await expect(
        runInit({
          styling: 'invalid-css-framework',
          installDeps: false,
        }),
      ).rejects.toThrow('Invalid styling strategy: invalid-css-framework');
    });

    it('accepts all valid styling choices', async () => {
      const validChoices = ['tailwind', 'vanilla-extract', 'css-modules', 'postcss', 'none'];

      for (const styling of validChoices) {
        vi.clearAllMocks();
        
        await runInit({
          styling,
          installDeps: false,
        });

        expect(setupTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            styling,
          }),
        );
      }
    });
  });

  describe('Tailwind with other configurations', () => {
    it('works with TypeScript projects', async () => {
      await runInit({
        quickstart: true,
        language: 'ts',
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          language: 'ts',
        }),
      );
    });

    it('works with JavaScript projects', async () => {
      await runInit({
        quickstart: true,
        language: 'js',
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          language: 'js',
        }),
      );
    });

    it('works with i18n configurations', async () => {
      await runInit({
        styling: 'tailwind',
        i18n: 'subfolders',
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          i18n: 'subfolders',
        }),
      );
    });

    it('works with mock shop data', async () => {
      await runInit({
        styling: 'tailwind',
        mockShop: true,
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          mockShop: true,
        }),
      );
    });

    it('works with routes generation', async () => {
      await runInit({
        styling: 'tailwind',
        routes: true,
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          routes: true,
        }),
      );
    });
  });

  describe('Tailwind dependencies management', () => {
    it('includes Tailwind when installDeps is true', async () => {
      await runInit({
        styling: 'tailwind',
        installDeps: true,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          installDeps: true,
        }),
      );
    });

    it('skips dependency installation when installDeps is false', async () => {
      await runInit({
        styling: 'tailwind',
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          installDeps: false,
        }),
      );
    });

    it('respects package manager choice', async () => {
      const packageManagers = ['npm', 'yarn', 'pnpm'];

      for (const packageManager of packageManagers) {
        vi.clearAllMocks();
        
        await runInit({
          styling: 'tailwind',
          packageManager,
          installDeps: false,
        });

        expect(setupTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            styling: 'tailwind',
            packageManager,
          }),
        );
      }
    });
  });

  describe('Git integration with Tailwind', () => {
    it('includes Tailwind files in git initialization', async () => {
      await runInit({
        styling: 'tailwind',
        git: true,
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          git: true,
        }),
      );
    });

    it('works without git initialization', async () => {
      await runInit({
        styling: 'tailwind',
        git: false,
        installDeps: false,
      });

      expect(setupTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: 'tailwind',
          git: false,
        }),
      );
    });
  });
});