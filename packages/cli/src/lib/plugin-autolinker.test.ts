import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {
  ensureMonorepoPluginLinked,
  shouldAutoLink,
  findMonorepoRoot,
  getProjectPath,
  isPluginLinked,
  linkPlugin,
} from './plugin-autolinker.js';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {cwd as getCwd} from '@shopify/cli-kit/node/path';
import {outputContent, outputInfo} from '@shopify/cli-kit/node/output';

vi.mock('node:fs');
vi.mock('@shopify/cli-kit/node/fs');
vi.mock('@shopify/cli-kit/node/path');
vi.mock('@shopify/cli-kit/node/output', () => ({
  outputContent: vi.fn((strings: any, ...values: any[]) => ({
    value: strings[0] || '',
  })),
  outputInfo: vi.fn(),
}));
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('plugin-autolinker', () => {
  const originalEnv = process.env;
  const originalStdout = process.stdout.isTTY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {...originalEnv};
    delete process.env.HYDROGEN_DISABLE_AUTOLINK;
    delete process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalStdout,
      writable: true,
      configurable: true,
    });
  });

  describe('shouldAutoLink', () => {
    it('returns false when HYDROGEN_DISABLE_AUTOLINK is set', () => {
      process.env.HYDROGEN_DISABLE_AUTOLINK = 'true';
      expect(shouldAutoLink()).toBe(false);
    });

    it('returns false in production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(shouldAutoLink()).toBe(false);
    });

    it('returns false in test environment', () => {
      process.env.NODE_ENV = 'test';
      expect(shouldAutoLink()).toBe(false);
    });

    it('returns true for ALL hydrogen commands (no exclusions)', () => {
      // All commands should trigger auto-linking - comprehensive list
      const commands = [
        'hydrogen:init',
        'hydrogen:login',
        'hydrogen:logout',
        'hydrogen:list',
        'hydrogen:link',
        'hydrogen:unlink',
        'hydrogen:shortcut',
        'hydrogen:upgrade',
        'hydrogen:dev',
        'hydrogen:build',
        'hydrogen:preview',
        'hydrogen:deploy',
        'hydrogen:check',
        'hydrogen:codegen',
        'hydrogen:env:pull',
        'hydrogen:env:push',
        'hydrogen:env:list',
        'hydrogen:setup',
        'hydrogen:generate:route',
        'hydrogen:debug:cpu',
        'hydrogen:test-autolink-proof', // Even test commands!
      ];

      commands.forEach((command) => {
        expect(shouldAutoLink({command})).toBe(true);
      });
    });

    it('returns true when no options provided', () => {
      expect(shouldAutoLink()).toBe(true);
    });
  });

  describe('findMonorepoRoot', () => {
    it('identifies hydrogen monorepo by name="hydrogen" in package.json', async () => {
      const startPath = '/home/user/hydrogen/packages/cli';
      const monorepoRoot = '/home/user/hydrogen';

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === join(monorepoRoot, 'package.json')) return true;
        return false;
      });

      vi.mocked(readFileSync).mockImplementation((path) => {
        if (path === join(monorepoRoot, 'package.json')) {
          return JSON.stringify({
            name: 'hydrogen',
            workspaces: ['packages/cli', 'packages/hydrogen'],
          });
        }
        return '';
      });

      const result = await findMonorepoRoot(startPath);
      expect(result).toBe(monorepoRoot);
    });

    it('returns null when no monorepo root found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fileExists).mockResolvedValue(false);

      const result = await findMonorepoRoot('/some/random/path');
      expect(result).toBeNull();
    });

    it('returns null when package.json exists but name is not "hydrogen"', async () => {
      const startPath = '/home/user/some-project/packages/cli';
      const projectRoot = '/home/user/some-project';

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === join(projectRoot, 'package.json')) return true;
        return false;
      });

      vi.mocked(readFileSync).mockImplementation((path) => {
        if (path === join(projectRoot, 'package.json')) {
          return JSON.stringify({
            name: 'some-other-project',
            workspaces: ['packages/something'],
          });
        }
        return '';
      });

      const result = await findMonorepoRoot(startPath);
      expect(result).toBeNull();
    });

    it('requires workspaces field with packages/cli to identify monorepo', async () => {
      const startPath = '/home/user/hydrogen/some/deep/path';
      const monorepoRoot = '/home/user/hydrogen';

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === join(monorepoRoot, 'package.json')) return true;
        return false;
      });

      vi.mocked(readFileSync).mockImplementation((path) => {
        if (path === join(monorepoRoot, 'package.json')) {
          return JSON.stringify({
            name: 'hydrogen',
            // Missing workspaces field
          });
        }
        return '';
      });

      const result = await findMonorepoRoot(startPath);
      // Should return null without workspaces field
      expect(result).toBeNull();
    });
  });

  describe('getProjectPath', () => {
    it('returns working directory when no --path flag', async () => {
      const workingDir = '/current/dir';
      const result = await getProjectPath(workingDir, [
        'dev',
        '--port',
        '3000',
      ]);
      expect(result).toBe(workingDir);
    });

    it('extracts path from --path=value format', async () => {
      const workingDir = '/current/dir';
      const targetPath = '../other/project';
      const result = await getProjectPath(workingDir, [
        'dev',
        `--path=${targetPath}`,
      ]);
      expect(result).toBe('/current/other/project');
    });

    it('extracts path from --path value format', async () => {
      const workingDir = '/current/dir';
      const targetPath = '../other/project';
      const result = await getProjectPath(workingDir, [
        'dev',
        '--path',
        targetPath,
      ]);
      expect(result).toBe('/current/other/project');
    });

    it('ignores --path without value', async () => {
      const workingDir = '/current/dir';
      const result = await getProjectPath(workingDir, ['dev', '--path']);
      expect(result).toBe(workingDir);
    });

    it('ignores --path followed by another flag', async () => {
      const workingDir = '/current/dir';
      const result = await getProjectPath(workingDir, [
        'dev',
        '--path',
        '--port',
        '3000',
      ]);
      expect(result).toBe(workingDir);
    });
  });

  describe('isPluginLinked', () => {
    it('returns false when .shopify-plugin-links.yml does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await isPluginLinked('/project', '/plugin');
      expect(result).toBe(false);
      expect(existsSync).toHaveBeenCalledWith(
        '/project/.shopify-plugin-links.yml',
      );
    });

    it('returns false when plugin path does not match', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';
      const linkFile = join(projectPath, '.shopify-plugin-links.yml');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        `@shopify/cli-hydrogen:\n  path: /some/other/path\n`,
      );

      const result = await isPluginLinked(projectPath, pluginPath);
      expect(result).toBe(false);
    });

    it('returns false when plugin not in link file', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';
      const linkFile = join(projectPath, '.shopify-plugin-links.yml');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        `@shopify/some-other-plugin:\n  path: /some/path\n`,
      );

      const result = await isPluginLinked(projectPath, pluginPath);
      expect(result).toBe(false);
    });

    it('handles malformed YAML gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const result = await isPluginLinked('/project', '/plugin');
      expect(result).toBe(false);
    });
  });

  describe('linkPlugin', () => {
    it('creates new link file when none exists', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';
      const linkFile = join(projectPath, '.shopify-plugin-links.yml');

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === linkFile) return false;
        if (path === join(projectPath, 'package.json')) return true;
        return false;
      });

      const result = await linkPlugin(projectPath, pluginPath);

      expect(result).toBe(true);
      expect(writeFileSync).toHaveBeenCalledWith(
        linkFile,
        `@shopify/cli-hydrogen:\n  path: ${pluginPath}\n`,
      );
    });

    it('updates existing link file with hydrogen plugin', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';
      const linkFile = join(projectPath, '.shopify-plugin-links.yml');

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === linkFile) return true;
        if (path === join(projectPath, 'package.json')) return true;
        return false;
      });

      vi.mocked(readFileSync).mockReturnValue(
        `@shopify/other-plugin:\n  path: /other/path\n`,
      );

      const result = await linkPlugin(projectPath, pluginPath);

      expect(result).toBe(true);
      expect(writeFileSync).toHaveBeenCalledWith(
        linkFile,
        `@shopify/other-plugin:\n  path: /other/path\n@shopify/cli-hydrogen:\n  path: ${pluginPath}\n`,
      );
    });

    it('replaces existing hydrogen plugin link', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';
      const linkFile = join(projectPath, '.shopify-plugin-links.yml');

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === linkFile) return true;
        if (path === join(projectPath, 'package.json')) return true;
        return false;
      });

      vi.mocked(readFileSync).mockReturnValue(
        `@shopify/cli-hydrogen:\n  path: /old/path\n@shopify/other-plugin:\n  path: /other/path\n`,
      );

      const result = await linkPlugin(projectPath, pluginPath);

      expect(result).toBe(true);
      expect(writeFileSync).toHaveBeenCalledWith(
        linkFile,
        `@shopify/other-plugin:\n  path: /other/path\n@shopify/cli-hydrogen:\n  path: ${pluginPath}\n`,
      );
    });

    it('returns false when project path equals plugin path', async () => {
      const samePath = '/monorepo/packages/cli';
      const result = await linkPlugin(samePath, samePath);
      expect(result).toBe(false);
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('returns false when project has no package.json', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';

      vi.mocked(existsSync).mockReturnValue(false);

      const result = await linkPlugin(projectPath, pluginPath);
      expect(result).toBe(false);
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('shows output message when not in CI and TTY available', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';
      const linkFile = join(projectPath, '.shopify-plugin-links.yml');

      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      Object.defineProperty(process.stdout, 'isTTY', {value: true});

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === linkFile) return false;
        if (path === join(projectPath, 'package.json')) return true;
        return false;
      });

      const result = await linkPlugin(projectPath, pluginPath);

      expect(result).toBe(true);
      expect(outputInfo).toHaveBeenCalled();
    });

    it('does not show output message in CI', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';
      const linkFile = join(projectPath, '.shopify-plugin-links.yml');

      process.env.CI = 'true';

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === linkFile) return false;
        if (path === join(projectPath, 'package.json')) return true;
        return false;
      });

      const result = await linkPlugin(projectPath, pluginPath);

      expect(result).toBe(true);
      expect(outputInfo).not.toHaveBeenCalled();
    });

    it('handles link errors gracefully', async () => {
      const projectPath = '/project';
      const pluginPath = '/monorepo/packages/cli';

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === join(projectPath, 'package.json')) return true;
        return false;
      });

      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await linkPlugin(projectPath, pluginPath);
      expect(result).toBe(false);
    });
  });

  describe('ensureMonorepoPluginLinked', () => {
    it('respects HYDROGEN_DISABLE_AUTOLINK environment variable', async () => {
      process.env.HYDROGEN_DISABLE_AUTOLINK = 'true';

      const result = await ensureMonorepoPluginLinked();
      expect(result).toBe(false);
      // When disabled, it should return early without checking filesystem
      expect(existsSync).not.toHaveBeenCalled();
    });

    it('returns false in production environment', async () => {
      process.env.NODE_ENV = 'production';

      const result = await ensureMonorepoPluginLinked();
      expect(result).toBe(false);
    });

    it('returns false in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const result = await ensureMonorepoPluginLinked();
      expect(result).toBe(false);
    });

    it('returns false when not in monorepo', async () => {
      vi.mocked(getCwd).mockReturnValue('/some/project');
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fileExists).mockResolvedValue(false);

      const result = await ensureMonorepoPluginLinked();
      expect(result).toBe(false);
    });

    it('returns false when plugin path does not exist', async () => {
      const monorepoRoot = '/hydrogen';
      const cwd = '/hydrogen/examples/skeleton';

      vi.mocked(getCwd).mockReturnValue(cwd);
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === join(monorepoRoot, 'package.json')) return true;
        return false;
      });
      vi.mocked(readFileSync).mockImplementation((path) => {
        if (path === join(monorepoRoot, 'package.json')) {
          return JSON.stringify({
            name: 'hydrogen',
            workspaces: ['packages/cli', 'packages/hydrogen'],
          });
        }
        return '';
      });
      vi.mocked(fileExists).mockImplementation(async (path) => {
        if (path === join(monorepoRoot, 'packages/cli/package.json'))
          return false;
        return false;
      });

      const result = await ensureMonorepoPluginLinked();
      expect(result).toBe(false);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(getCwd).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await ensureMonorepoPluginLinked();
      expect(result).toBe(false);
    });
  });
});
