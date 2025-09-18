import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  updatePackageJson, 
  hasReactRouter, 
  hasRemixDependencies,
  getPackageJsonPath 
} from './package-json';

vi.mock('fs');

describe('Package.json Updates', () => {
  const mockProjectRoot = '/test/project';
  const mockPackageJsonPath = path.join(mockProjectRoot, 'package.json');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('updatePackageJson', () => {
    test('adds react-router when not present', () => {
      const mockPackageJson = {
        name: 'test-app',
        dependencies: {
          '@shopify/hydrogen': '^2025.1.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson, null, 2));
      const writeFileSyncMock = vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const result = updatePackageJson(mockProjectRoot);

      expect(result.updated).toBe(true);
      expect(result.changes).toContain('Added dependency: react-router@^7.9.0');
      
      const writtenContent = writeFileSyncMock.mock.calls[0][1] as string;
      const writtenJson = JSON.parse(writtenContent);
      expect(writtenJson.dependencies['react-router']).toBe('^7.9.0');
    });

    test('removes Remix dependencies', () => {
      const mockPackageJson = {
        name: 'test-app',
        dependencies: {
          '@shopify/hydrogen': '^2025.1.0',
          '@remix-run/react': '^2.0.0',
          '@remix-run/node': '^2.0.0',
        },
        devDependencies: {
          '@remix-run/dev': '^2.0.0',
          '@remix-run/eslint-config': '^2.0.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson, null, 2));
      const writeFileSyncMock = vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const result = updatePackageJson(mockProjectRoot);

      expect(result.updated).toBe(true);
      expect(result.changes).toContain('Removed dependency: @remix-run/react');
      expect(result.changes).toContain('Removed dependency: @remix-run/node');
      expect(result.changes).toContain('Removed devDependency: @remix-run/dev');
      
      const writtenContent = writeFileSyncMock.mock.calls[0][1] as string;
      const writtenJson = JSON.parse(writtenContent);
      expect(writtenJson.dependencies['@remix-run/react']).toBeUndefined();
      expect(writtenJson.dependencies['@remix-run/node']).toBeUndefined();
      expect(writtenJson.devDependencies?.['@remix-run/dev']).toBeUndefined();
    });

    test('updates older react-router version', () => {
      const mockPackageJson = {
        name: 'test-app',
        dependencies: {
          'react-router': '^6.0.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson, null, 2));
      const writeFileSyncMock = vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const result = updatePackageJson(mockProjectRoot);

      expect(result.updated).toBe(true);
      expect(result.changes).toContain('Updated dependency: react-router from ^6.0.0 to ^7.9.0');
      
      const writtenContent = writeFileSyncMock.mock.calls[0][1] as string;
      const writtenJson = JSON.parse(writtenContent);
      expect(writtenJson.dependencies['react-router']).toBe('^7.9.0');
    });

    test('does not update if react-router 7.x already present', () => {
      const mockPackageJson = {
        name: 'test-app',
        dependencies: {
          'react-router': '^7.9.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson, null, 2));

      const result = updatePackageJson(mockProjectRoot);

      expect(result.updated).toBe(false);
      expect(result.changes).toContain('No changes needed');
    });

    test('sorts dependencies alphabetically', () => {
      const mockPackageJson = {
        name: 'test-app',
        dependencies: {
          'zod': '^3.0.0',
          '@shopify/hydrogen': '^2025.1.0',
          'axios': '^1.0.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson, null, 2));
      const writeFileSyncMock = vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const result = updatePackageJson(mockProjectRoot);

      expect(result.updated).toBe(true);
      
      const writtenContent = writeFileSyncMock.mock.calls[0][1] as string;
      const writtenJson = JSON.parse(writtenContent);
      const depKeys = Object.keys(writtenJson.dependencies);
      expect(depKeys).toEqual(['@shopify/hydrogen', 'axios', 'react-router', 'zod']);
    });

    test('handles missing package.json', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = updatePackageJson(mockProjectRoot);

      expect(result.updated).toBe(false);
      expect(result.changes).toContain('package.json not found');
    });

    test('handles malformed package.json', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const result = updatePackageJson(mockProjectRoot);

      expect(result.updated).toBe(false);
      expect(result.changes[0]).toContain('Error updating package.json');
    });

    test('creates dependencies object if missing', () => {
      const mockPackageJson = {
        name: 'test-app',
        version: '1.0.0',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson, null, 2));
      const writeFileSyncMock = vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      const result = updatePackageJson(mockProjectRoot);

      expect(result.updated).toBe(true);
      
      const writtenContent = writeFileSyncMock.mock.calls[0][1] as string;
      const writtenJson = JSON.parse(writtenContent);
      expect(writtenJson.dependencies).toBeDefined();
      expect(writtenJson.dependencies['react-router']).toBe('^7.9.0');
    });
  });

  describe('hasReactRouter', () => {
    test('returns true when react-router is in dependencies', () => {
      const mockPackageJson = {
        dependencies: {
          'react-router': '^7.9.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      expect(hasReactRouter(mockProjectRoot)).toBe(true);
    });

    test('returns true when react-router is in devDependencies', () => {
      const mockPackageJson = {
        devDependencies: {
          'react-router': '^7.9.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      expect(hasReactRouter(mockProjectRoot)).toBe(true);
    });

    test('returns false when react-router is not present', () => {
      const mockPackageJson = {
        dependencies: {
          '@shopify/hydrogen': '^2025.1.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      expect(hasReactRouter(mockProjectRoot)).toBe(false);
    });

    test('returns false when package.json does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(hasReactRouter(mockProjectRoot)).toBe(false);
    });
  });

  describe('hasRemixDependencies', () => {
    test('returns true when Remix dependencies exist', () => {
      const mockPackageJson = {
        dependencies: {
          '@remix-run/react': '^2.0.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      expect(hasRemixDependencies(mockProjectRoot)).toBe(true);
    });

    test('returns true for Remix dev dependencies', () => {
      const mockPackageJson = {
        devDependencies: {
          '@remix-run/dev': '^2.0.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      expect(hasRemixDependencies(mockProjectRoot)).toBe(true);
    });

    test('returns false when no Remix dependencies', () => {
      const mockPackageJson = {
        dependencies: {
          'react-router': '^7.9.0',
        },
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

      expect(hasRemixDependencies(mockProjectRoot)).toBe(false);
    });
  });

  describe('getPackageJsonPath', () => {
    test('returns correct path', () => {
      const result = getPackageJsonPath(mockProjectRoot);
      expect(result).toBe(path.join(mockProjectRoot, 'package.json'));
    });
  });
});