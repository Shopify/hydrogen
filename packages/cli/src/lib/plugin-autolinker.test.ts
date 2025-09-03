import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  isInsideHydrogenMonorepo,
  isExternalProject,
  isExampleDirectory,
  getMonorepoPluginPath,
  isPluginLinked,
} from './plugin-autolinker.js';
import * as build from './build.js';

vi.mock('./build.js', () => ({
  isInsideHydrogenMonorepo: vi.fn(),
  getMonorepoRoot: vi.fn(),
}));

vi.mock('./process.js', () => ({
  execAsync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('@shopify/cli-kit/node/output', () => ({
  outputDebug: vi.fn(),
}));

describe('plugin-autolinker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variable
    delete process.env.HYDROGEN_CLI_AUTOLINKED;
  });

  describe('isInsideHydrogenMonorepo', () => {
    it('should use current working directory if no directory provided', () => {
      const originalCwd = process.cwd();
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);

      expect(isInsideHydrogenMonorepo()).toBe(true);
      expect(build.isInsideHydrogenMonorepo).toHaveBeenCalledWith(originalCwd);
    });

    it('should use provided directory', () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);

      expect(isInsideHydrogenMonorepo('/some/path')).toBe(true);
      expect(build.isInsideHydrogenMonorepo).toHaveBeenCalledWith('/some/path');
    });
  });

  describe('isExternalProject', () => {
    it('should return false if inside monorepo', () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);

      expect(isExternalProject('/monorepo/examples/b2b')).toBe(false);
    });

    it('should return true if outside monorepo and has package.json', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(false);
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      expect(isExternalProject('/external/project')).toBe(true);
    });

    it('should return false if outside monorepo but no package.json', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(false);
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(isExternalProject('/random/directory')).toBe(false);
    });
  });

  describe('isExampleDirectory', () => {
    it('should return false if not in monorepo', () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(false);

      expect(isExampleDirectory('/external/project')).toBe(false);
    });

    it('should return true if in examples directory', () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);
      vi.spyOn(build, 'getMonorepoRoot').mockReturnValue('/monorepo');

      expect(isExampleDirectory('/monorepo/examples/b2b')).toBe(true);
    });

    it('should return false if in monorepo but not in examples', () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);
      vi.spyOn(build, 'getMonorepoRoot').mockReturnValue('/monorepo');

      expect(isExampleDirectory('/monorepo/packages/cli')).toBe(false);
    });
  });

  describe('getMonorepoPluginPath', () => {
    it('should return undefined if not in monorepo', () => {
      vi.spyOn(build, 'getMonorepoRoot').mockReturnValue(undefined);

      expect(getMonorepoPluginPath('/external')).toBe(undefined);
    });

    it('should return plugin path if in monorepo and plugin exists', async () => {
      vi.spyOn(build, 'getMonorepoRoot').mockReturnValue('/monorepo');
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      expect(getMonorepoPluginPath('/monorepo/examples')).toBe(
        '/monorepo/packages/cli',
      );
    });

    it('should return undefined if plugin directory does not exist', async () => {
      vi.spyOn(build, 'getMonorepoRoot').mockReturnValue('/monorepo');
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(getMonorepoPluginPath('/monorepo/examples')).toBe(undefined);
    });
  });

  describe('isPluginLinked', () => {
    it('should return true if environment variable is set', async () => {
      process.env.HYDROGEN_CLI_AUTOLINKED = 'true';
      const processModule = await import('./process.js');

      const result = await isPluginLinked();

      expect(result.isLinked).toBe(true);
      expect(result.isAutoLinked).toBe(true);
      expect(processModule.execAsync).not.toHaveBeenCalled();
    });

    it('should detect linked plugin from inspect output', async () => {
      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockResolvedValue({
        stdout: ` ›   Warning: @shopify/cli-hydrogen is a linked ESM module and cannot be 
 ›   auto-transpiled. Existing compiled source will be used instead.
└─ @shopify/cli-hydrogen
   ├─ version 11.1.3
   ├─ location /Users/test/hydrogen/packages/cli`,
        stderr: '',
      });

      const result = await isPluginLinked();

      expect(result.isLinked).toBe(true);
      expect(result.linkedPath).toBe('/Users/test/hydrogen/packages/cli');
      expect(result.isAutoLinked).toBe(false);
    });

    it('should detect linked plugin from location path', async () => {
      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockResolvedValue({
        stdout: `└─ @shopify/cli-hydrogen
   ├─ version 11.1.3
   ├─ location /monorepo/packages/cli`,
        stderr: '',
      });

      const result = await isPluginLinked();

      expect(result.isLinked).toBe(true);
      expect(result.linkedPath).toBe('/monorepo/packages/cli');
    });

    it('should return false if plugin is not linked', async () => {
      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockResolvedValue({
        stdout: `└─ @shopify/cli-hydrogen
   ├─ version 11.1.3
   ├─ location /Users/test/.npm/@shopify/cli-hydrogen`,
        stderr: '',
      });

      const result = await isPluginLinked();

      expect(result.isLinked).toBe(false);
      expect(result.isAutoLinked).toBe(false);
    });

    it('should handle command failure gracefully', async () => {
      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockRejectedValue(
        new Error('Command failed'),
      );

      const result = await isPluginLinked();

      expect(result.isLinked).toBe(false);
      expect(result.isAutoLinked).toBe(false);
    });
  });

  describe('linkPlugin', () => {
    it('should return error if plugin path does not exist', async () => {
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      const {linkPlugin} = await import('./plugin-autolinker.js');
      const result = await linkPlugin('/non/existent/path');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Plugin path does not exist');
    });

    it('should successfully link plugin', async () => {
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockResolvedValue({
        stdout: 'Linked plugin @shopify/cli-hydrogen',
        stderr: '',
      });

      const {linkPlugin} = await import('./plugin-autolinker.js');
      const result = await linkPlugin('/monorepo/packages/cli');

      expect(result.success).toBe(true);
      expect(result.linkedPath).toBe('/monorepo/packages/cli');
      expect(process.env.HYDROGEN_CLI_AUTOLINKED).toBe('true');
    });

    it('should detect already linked plugin', async () => {
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockResolvedValue({
        stdout: 'Plugin already linked',
        stderr: '',
      });

      const {linkPlugin} = await import('./plugin-autolinker.js');
      const result = await linkPlugin('/monorepo/packages/cli');

      expect(result.success).toBe(true);
    });

    it('should handle link failure', async () => {
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockResolvedValue({
        stdout: 'Some unexpected output',
        stderr: '',
      });

      const {linkPlugin} = await import('./plugin-autolinker.js');
      const result = await linkPlugin('/monorepo/packages/cli');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected output');
    });

    it('should handle command execution error', async () => {
      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockRejectedValue(
        new Error('Command failed'),
      );

      const {linkPlugin} = await import('./plugin-autolinker.js');
      const result = await linkPlugin('/monorepo/packages/cli');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Command failed');
    });
  });

  describe('shouldAutoLink', () => {
    beforeEach(() => {
      delete process.env.HYDROGEN_DISABLE_AUTOLINK;
      delete process.env.npm_lifecycle_event;
    });

    it('should return false if auto-linking is disabled', async () => {
      process.env.HYDROGEN_DISABLE_AUTOLINK = 'true';

      const {shouldAutoLink} = await import('./plugin-autolinker.js');
      expect(shouldAutoLink({command: 'hydrogen:dev'})).toBe(false);
    });

    it('should return false for skip commands', async () => {
      const {shouldAutoLink} = await import('./plugin-autolinker.js');

      expect(shouldAutoLink({command: 'hydrogen:login'})).toBe(false);
      expect(shouldAutoLink({command: 'hydrogen:logout'})).toBe(false);
      expect(shouldAutoLink({command: 'hydrogen:init'})).toBe(false);
      expect(shouldAutoLink({command: 'hydrogen:upgrade'})).toBe(false);
    });

    it('should allow auto-linking for env and deploy commands', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);

      const {shouldAutoLink} = await import('./plugin-autolinker.js');

      expect(
        shouldAutoLink({
          command: 'hydrogen:env:list',
          workingDirectory: '/monorepo/examples/b2b',
        }),
      ).toBe(true);
      expect(
        shouldAutoLink({
          command: 'hydrogen:env:pull',
          workingDirectory: '/monorepo/examples/b2b',
        }),
      ).toBe(true);
      expect(
        shouldAutoLink({
          command: 'hydrogen:env:push',
          workingDirectory: '/monorepo/examples/b2b',
        }),
      ).toBe(true);
      expect(
        shouldAutoLink({
          command: 'hydrogen:deploy',
          workingDirectory: '/monorepo/examples/b2b',
        }),
      ).toBe(true);
    });

    it('should return true when in monorepo', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);

      const {shouldAutoLink} = await import('./plugin-autolinker.js');
      expect(
        shouldAutoLink({
          command: 'hydrogen:dev',
          workingDirectory: '/monorepo/examples/b2b',
        }),
      ).toBe(true);
    });

    it('should return false for skeleton template', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);

      const {shouldAutoLink} = await import('./plugin-autolinker.js');
      expect(
        shouldAutoLink({
          command: 'hydrogen:dev',
          workingDirectory: '/monorepo/templates/skeleton',
        }),
      ).toBe(false);
    });

    it('should return true with --path flag when running from monorepo', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockImplementation((dir) => {
        // Simulate running from monorepo root
        return dir === undefined || dir === process.cwd();
      });

      const {shouldAutoLink} = await import('./plugin-autolinker.js');

      // Test with external project path
      expect(
        shouldAutoLink({
          command: 'hydrogen:dev',
          args: ['--path', '/external/project'],
        }),
      ).toBe(true);

      // Test with monorepo project path
      expect(
        shouldAutoLink({
          command: 'hydrogen:dev',
          args: ['--path', '/monorepo/examples/b2b'],
        }),
      ).toBe(true);
    });

    it('should return false with --path flag when NOT running from monorepo', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(false);

      const {shouldAutoLink} = await import('./plugin-autolinker.js');
      expect(
        shouldAutoLink({
          command: 'hydrogen:dev',
          args: ['--path', '/external/project'],
        }),
      ).toBe(false);
    });
  });

  describe('isRunningViaNodeModules', () => {
    it('should detect npm script execution', async () => {
      const originalArgv = process.argv[1];
      process.argv[1] = '/project/node_modules/.bin/shopify';

      const {isRunningViaNodeModules} = await import('./plugin-autolinker.js');
      expect(isRunningViaNodeModules()).toBe(true);

      process.argv[1] = originalArgv!;
    });

    it('should detect npm lifecycle event', async () => {
      process.env.npm_lifecycle_event = 'dev';

      const {isRunningViaNodeModules} = await import('./plugin-autolinker.js');
      expect(isRunningViaNodeModules()).toBe(true);

      delete process.env.npm_lifecycle_event;
    });

    it('should return false for global command', async () => {
      const originalArgv = process.argv[1];
      process.argv[1] = '/usr/local/bin/shopify';

      const {isRunningViaNodeModules} = await import('./plugin-autolinker.js');
      expect(isRunningViaNodeModules()).toBe(false);

      process.argv[1] = originalArgv!;
    });
  });

  describe('ensureMonorepoPluginLinked', () => {
    beforeEach(() => {
      delete process.env.HYDROGEN_CLI_AUTOLINKED;
      delete process.env.HYDROGEN_DISABLE_AUTOLINK;
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should skip if shouldAutoLink returns false', async () => {
      const {ensureMonorepoPluginLinked} = await import(
        './plugin-autolinker.js'
      );
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(false);

      const result = await ensureMonorepoPluginLinked({
        command: 'hydrogen:dev',
      });

      expect(result).toBe(false);
    });

    it('should return true if already linked', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);
      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockResolvedValue({
        stdout: 'Warning: @shopify/cli-hydrogen is a linked ESM module',
        stderr: '',
      });

      const {ensureMonorepoPluginLinked} = await import(
        './plugin-autolinker.js'
      );
      const result = await ensureMonorepoPluginLinked({
        command: 'hydrogen:dev',
        workingDirectory: '/monorepo/examples/b2b',
      });

      expect(result).toBe(true);
    });

    it('should link plugin when not linked', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);
      vi.spyOn(build, 'getMonorepoRoot').mockReturnValue('/monorepo');

      const processModule = await import('./process.js');
      // First call checks if linked (not linked)
      vi.spyOn(processModule, 'execAsync')
        .mockResolvedValueOnce({
          stdout: 'Plugin not linked',
          stderr: '',
        })
        // Second call performs linking
        .mockResolvedValueOnce({
          stdout: 'Linked plugin @shopify/cli-hydrogen',
          stderr: '',
        });

      const fs = await import('node:fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const {ensureMonorepoPluginLinked} = await import(
        './plugin-autolinker.js'
      );
      const result = await ensureMonorepoPluginLinked({
        command: 'hydrogen:dev',
        workingDirectory: '/monorepo/examples/b2b',
      });

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        '🔗 Auto-linked local Hydrogen CLI for development',
      );
    });

    it('should return false if plugin path not found', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);
      vi.spyOn(build, 'getMonorepoRoot').mockReturnValue(undefined);

      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockResolvedValue({
        stdout: 'Plugin not linked',
        stderr: '',
      });

      const {ensureMonorepoPluginLinked} = await import(
        './plugin-autolinker.js'
      );
      const result = await ensureMonorepoPluginLinked({
        command: 'hydrogen:dev',
        workingDirectory: '/monorepo/examples/b2b',
      });

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(build, 'isInsideHydrogenMonorepo').mockReturnValue(true);

      const processModule = await import('./process.js');
      vi.spyOn(processModule, 'execAsync').mockRejectedValue(
        new Error('Network error'),
      );

      const {ensureMonorepoPluginLinked} = await import(
        './plugin-autolinker.js'
      );
      const result = await ensureMonorepoPluginLinked({
        command: 'hydrogen:dev',
        workingDirectory: '/monorepo/examples/b2b',
      });

      expect(result).toBe(false);
    });
  });
});
