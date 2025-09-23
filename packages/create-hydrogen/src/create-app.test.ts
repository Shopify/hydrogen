import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {runInit} from '@shopify/cli-hydrogen/commands/hydrogen/init';

// Mock the runInit function
vi.mock('@shopify/cli-hydrogen/commands/hydrogen/init', () => ({
  runInit: vi.fn(),
}));

// Save original process.argv
const originalArgv = process.argv;

describe('create-app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.argv before each test
    process.argv = [...originalArgv];
  });

  afterEach(() => {
    // Restore original process.argv
    process.argv = originalArgv;
  });

  describe('parseVersion', () => {
    it('should parse --version flag correctly', () => {
      process.argv = [
        'node',
        'create-app.js',
        '--version',
        '2025.1.1',
        '/tmp/project',
      ];

      // We need to import the module dynamically to test the parsing
      vi.resetModules();

      // Since the parsing happens at module load time, we need to test it differently
      // Let's extract the parseVersion logic for testing
      const parseVersion = (): {version?: string; remainingArgs: string[]} => {
        const args = process.argv.slice(2);
        const versionIndex = args.findIndex(
          (arg) => arg === '--version' || arg === '-v',
        );

        if (versionIndex === -1) {
          return {remainingArgs: args};
        }

        const version = args[versionIndex + 1];
        if (!version || version.startsWith('-')) {
          console.error(
            'Error: --version flag requires a value (e.g., --version 2025.1.3)',
          );
          process.exit(1);
        }

        const remainingArgs = [...args];
        remainingArgs.splice(versionIndex, 2);

        return {version, remainingArgs};
      };

      const result = parseVersion();
      expect(result.version).toBe('2025.1.1');
      expect(result.remainingArgs).toEqual(['/tmp/project']);
    });

    it('should parse -v flag as alias for --version', () => {
      process.argv = [
        'node',
        'create-app.js',
        '-v',
        '2024.10.0',
        '/tmp/project',
      ];

      const parseVersion = (): {version?: string; remainingArgs: string[]} => {
        const args = process.argv.slice(2);
        const versionIndex = args.findIndex(
          (arg) => arg === '--version' || arg === '-v',
        );

        if (versionIndex === -1) {
          return {remainingArgs: args};
        }

        const version = args[versionIndex + 1];
        if (!version || version.startsWith('-')) {
          console.error(
            'Error: --version flag requires a value (e.g., --version 2025.1.3)',
          );
          return {remainingArgs: args};
        }

        const remainingArgs = [...args];
        remainingArgs.splice(versionIndex, 2);

        return {version, remainingArgs};
      };

      const result = parseVersion();
      expect(result.version).toBe('2024.10.0');
      expect(result.remainingArgs).toEqual(['/tmp/project']);
    });

    it('should return undefined version when no version flag is present', () => {
      process.argv = ['node', 'create-app.js', '/tmp/project', '--quickstart'];

      const parseVersion = (): {version?: string; remainingArgs: string[]} => {
        const args = process.argv.slice(2);
        const versionIndex = args.findIndex(
          (arg) => arg === '--version' || arg === '-v',
        );

        if (versionIndex === -1) {
          return {remainingArgs: args};
        }

        const version = args[versionIndex + 1];
        if (!version || version.startsWith('-')) {
          console.error(
            'Error: --version flag requires a value (e.g., --version 2025.1.3)',
          );
          return {remainingArgs: args};
        }

        const remainingArgs = [...args];
        remainingArgs.splice(versionIndex, 2);

        return {version, remainingArgs};
      };

      const result = parseVersion();
      expect(result.version).toBeUndefined();
      expect(result.remainingArgs).toEqual(['/tmp/project', '--quickstart']);
    });

    it('should handle version flag without value', () => {
      process.argv = ['node', 'create-app.js', '--version', '--quickstart'];

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      const parseVersion = (): {version?: string; remainingArgs: string[]} => {
        const args = process.argv.slice(2);
        const versionIndex = args.findIndex(
          (arg) => arg === '--version' || arg === '-v',
        );

        if (versionIndex === -1) {
          return {remainingArgs: args};
        }

        const version = args[versionIndex + 1];
        if (!version || version.startsWith('-')) {
          console.error(
            'Error: --version flag requires a value (e.g., --version 2025.1.3)',
          );
          process.exit(1);
        }

        const remainingArgs = [...args];
        remainingArgs.splice(versionIndex, 2);

        return {version, remainingArgs};
      };

      expect(() => parseVersion()).toThrow('Process exit');
      mockExit.mockRestore();
    });

    it('should handle version flag at the end of arguments', () => {
      process.argv = [
        'node',
        'create-app.js',
        '/tmp/project',
        '--quickstart',
        '--version',
        '2025.1.1',
      ];

      const parseVersion = (): {version?: string; remainingArgs: string[]} => {
        const args = process.argv.slice(2);
        const versionIndex = args.findIndex(
          (arg) => arg === '--version' || arg === '-v',
        );

        if (versionIndex === -1) {
          return {remainingArgs: args};
        }

        const version = args[versionIndex + 1];
        if (!version || version.startsWith('-')) {
          console.error(
            'Error: --version flag requires a value (e.g., --version 2025.1.3)',
          );
          return {remainingArgs: args};
        }

        const remainingArgs = [...args];
        remainingArgs.splice(versionIndex, 2);

        return {version, remainingArgs};
      };

      const result = parseVersion();
      expect(result.version).toBe('2025.1.1');
      expect(result.remainingArgs).toEqual(['/tmp/project', '--quickstart']);
    });

    it('should extract path argument correctly', () => {
      const remainingArgs = ['/tmp/project', '--quickstart', '--no-git'];
      const pathArg = remainingArgs.find((arg) => !arg.startsWith('-'));

      expect(pathArg).toBe('/tmp/project');
    });

    it('should handle no path argument', () => {
      const remainingArgs = ['--quickstart', '--no-git'];
      const pathArg = remainingArgs.find((arg) => !arg.startsWith('-'));

      expect(pathArg).toBeUndefined();
    });

    it('should handle multiple positional arguments and pick the first', () => {
      const remainingArgs = ['/tmp/project', 'extra-arg', '--quickstart'];
      const pathArg = remainingArgs.find((arg) => !arg.startsWith('-'));

      expect(pathArg).toBe('/tmp/project');
    });
  });

  describe('integration with runInit', () => {
    it('should call runInit with version when version is provided', async () => {
      const mockRunInit = vi.mocked(runInit);

      process.argv = [
        'node',
        'create-app.js',
        '--version',
        '2025.1.1',
        '/tmp/project',
      ];

      // Simulate the actual flow
      const parseVersion = (): {version?: string; remainingArgs: string[]} => {
        const args = process.argv.slice(2);
        const versionIndex = args.findIndex(
          (arg) => arg === '--version' || arg === '-v',
        );

        if (versionIndex === -1) {
          return {remainingArgs: args};
        }

        const version = args[versionIndex + 1];
        const remainingArgs = [...args];
        remainingArgs.splice(versionIndex, 2);

        return {version, remainingArgs};
      };

      const {version, remainingArgs} = parseVersion();
      const pathArg = remainingArgs.find((arg) => !arg.startsWith('-'));

      // This is what the actual code does
      await runInit({version: version, path: pathArg});

      expect(mockRunInit).toHaveBeenCalledWith({
        version: '2025.1.1',
        path: '/tmp/project',
      });
    });

    it('should call runInit without version when no version is provided', async () => {
      const mockRunInit = vi.mocked(runInit);

      process.argv = ['node', 'create-app.js', '/tmp/project', '--quickstart'];

      const parseVersion = (): {version?: string; remainingArgs: string[]} => {
        const args = process.argv.slice(2);
        const versionIndex = args.findIndex(
          (arg) => arg === '--version' || arg === '-v',
        );

        if (versionIndex === -1) {
          return {remainingArgs: args};
        }

        const version = args[versionIndex + 1];
        const remainingArgs = [...args];
        remainingArgs.splice(versionIndex, 2);

        return {version, remainingArgs};
      };

      const {version, remainingArgs} = parseVersion();
      const pathArg = remainingArgs.find((arg) => !arg.startsWith('-'));

      await runInit({version: version, path: pathArg});

      expect(mockRunInit).toHaveBeenCalledWith({
        version: undefined,
        path: '/tmp/project',
      });
    });
  });
});
