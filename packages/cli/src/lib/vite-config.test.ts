/**
 * Test Suite: Vite Config Path Resolution with viteEnvironmentApi
 * 
 * WHY these tests exist:
 * The getViteConfig function handles path resolution for different React Router configurations,
 * specifically the unstable_viteEnvironmentApi flag which changes build output structure.
 * Testing this function is crucial because:
 * - All CLI commands (build, deploy, preview, debug) depend on correct path resolution
 * - React Router v7 with viteEnvironmentApi creates separate client/server directories
 * - Legacy projects without viteEnvironmentApi use flat directory structure
 * - Incorrect paths cause CLI commands to fail looking for build artifacts
 * 
 * WHAT these tests validate:
 * 1. viteEnvironmentApi enabled: serverOutDir = dist/server, clientOutDir = dist/client
 * 2. viteEnvironmentApi disabled: serverOutDir = dist, clientOutDir = dist
 * 3. Missing React Router plugin context (legacy projects)
 * 4. Edge cases: undefined/null future config, different outDir values
 * 5. Correct serverOutFile path construction in both configurations
 * 
 * These tests ensure CLI commands work correctly with both legacy and modern React Router builds.
 */

import {describe, it, expect, vi, beforeEach, type Mock} from 'vitest';
import {getViteConfig} from './vite-config.js';
import * as importUtils from './import-utils.js';
import * as fileUtils from './file.js';
import {joinPath} from '@shopify/cli-kit/node/path';
import type * as Vite from 'vite';

vi.mock('./import-utils');
vi.mock('./file');
vi.mock('./remix-config');

// Mock file utility functions
vi.mocked(fileUtils.findFileWithExtension).mockResolvedValue({
  filepath: '/test/project/server.ts',
  extension: 'ts',
  astType: 'ts'
});

describe('getViteConfig - viteEnvironmentApi path resolution', () => {
  const mockRoot = '/test/project';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockVite = (resolvedConfig: any): Partial<typeof Vite> => ({
    loadConfigFromFile: vi.fn().mockResolvedValue({
      path: '/test/vite.config.ts',
      config: {}
    }),
    resolveConfig: vi.fn().mockResolvedValue({
      plugins: [], // Default empty plugins array to prevent find errors
      ...resolvedConfig
    })
  });

  describe('with viteEnvironmentApi enabled', () => {
    it('should use separate client/server directories', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: {
              entryFileNames: 'index.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'index.js',
            routes: {},
            future: {
              unstable_viteEnvironmentApi: true
            }
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      expect(result.serverOutDir).toBe(joinPath('dist', 'server'));
      expect(result.clientOutDir).toBe(joinPath('dist', 'client'));
      expect(result.serverOutFile).toBe(joinPath('dist', 'server', 'index.js'));
    });

    it('should handle custom outDir with viteEnvironmentApi', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'build',
          rollupOptions: {
            output: {
              entryFileNames: 'server.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'server.js',
            routes: {},
            future: {
              unstable_viteEnvironmentApi: true
            }
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      expect(result.serverOutDir).toBe(joinPath(mockRoot, 'build', 'server'));
      expect(result.clientOutDir).toBe(joinPath(mockRoot, 'build', 'client'));
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'build', 'server', 'server.js'));
    });

    it('should handle absolute outDir paths with viteEnvironmentApi', async () => {
      const absoluteOutDir = '/absolute/dist';
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: absoluteOutDir,
          rollupOptions: {
            output: {
              entryFileNames: 'index.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'index.js',
            routes: {},
            future: {
              unstable_viteEnvironmentApi: true
            }
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      expect(result.serverOutDir).toBe(joinPath(absoluteOutDir, 'server'));
      expect(result.clientOutDir).toBe(joinPath(absoluteOutDir, 'client'));
      expect(result.serverOutFile).toBe(joinPath(absoluteOutDir, 'server', 'index.js'));
    });
  });

  describe('with viteEnvironmentApi disabled', () => {
    it('should use flat directory structure', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: {
              entryFileNames: 'index.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'index.js',
            routes: {},
            future: {
              unstable_viteEnvironmentApi: false
            }
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      expect(result.serverOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.clientOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'dist', 'index.js'));
    });

    it('should handle missing viteEnvironmentApi property (defaults to false)', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: {
              entryFileNames: 'index.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'index.js',
            routes: {},
            future: {
              // unstable_viteEnvironmentApi property missing
            }
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      expect(result.serverOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.clientOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'dist', 'index.js'));
    });

    it('should handle missing future config entirely', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: {
              entryFileNames: 'index.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'index.js',
            routes: {},
            // future property missing entirely
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      expect(result.serverOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.clientOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'dist', 'index.js'));
    });
  });

  describe('edge cases and legacy projects', () => {
    it('should handle missing React Router plugin context (legacy projects)', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: {
              entryFileNames: 'index.js'
            }
          }
        },
        // __reactRouterPluginContext missing entirely
      };

      // Mock the getReactRouterOrRemixConfigFromVite to fall back to Remix
      vi.doMock('./vite-config', async () => {
        const actual = await vi.importActual('./vite-config');
        return {
          ...actual,
          // This should throw and fall back to Remix config
        };
      });

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      // Should fall back to legacy flat structure
      expect(result.serverOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.clientOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'dist', 'index.js'));
    });

    it('should handle null/undefined reactRouterConfig', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: {
              entryFileNames: 'index.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: null
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      // Should fall back to legacy flat structure
      expect(result.serverOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.clientOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'dist', 'index.js'));
    });

    it('should handle different serverBuildFile configurations', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: {
              entryFileNames: 'custom-server.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'custom-server.js',
            routes: {},
            future: {
              unstable_viteEnvironmentApi: true
            }
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      expect(result.serverOutDir).toBe(joinPath(mockRoot, 'dist', 'server'));
      expect(result.clientOutDir).toBe(joinPath(mockRoot, 'dist', 'client'));
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'dist', 'server', 'custom-server.js'));
    });

    it('should handle array-based rollup output configuration', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: [
              {
                entryFileNames: 'index.js'
              },
              {
                entryFileNames: 'worker.js'
              }
            ]
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'index.js',
            routes: {},
            future: {
              unstable_viteEnvironmentApi: true
            }
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      // Should use the first entry in the array
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'dist', 'server', 'index.js'));
    });
  });

  describe('backward compatibility', () => {
    it('should maintain backward compatibility with projects that do not use viteEnvironmentApi', async () => {
      const mockResolvedConfig = {
        root: mockRoot,
        build: {
          outDir: 'dist',
          rollupOptions: {
            output: {
              entryFileNames: 'index.js'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/test/project/app',
            serverBuildFile: 'index.js',
            routes: {},
            // No future config at all - older React Router versions
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(mockRoot);

      // Should use legacy flat structure for backward compatibility
      expect(result.serverOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.clientOutDir).toBe(joinPath(mockRoot, 'dist'));
      expect(result.serverOutFile).toBe(joinPath(mockRoot, 'dist', 'index.js'));
    });

    it('should work with different project structures', async () => {
      const nestedRoot = '/deeply/nested/project';
      const mockResolvedConfig = {
        root: nestedRoot,
        build: {
          outDir: '../output',
          rollupOptions: {
            output: {
              entryFileNames: 'server.mjs'
            }
          }
        },
        __reactRouterPluginContext: {
          reactRouterConfig: {
            appDirectory: '/deeply/nested/project/src/app',
            serverBuildFile: 'server.mjs',
            routes: {},
            future: {
              unstable_viteEnvironmentApi: true
            }
          }
        }
      };

      vi.mocked(importUtils.importVite).mockResolvedValue(
        createMockVite(mockResolvedConfig) as typeof Vite
      );

      const result = await getViteConfig(nestedRoot);

      expect(result.serverOutDir).toBe(joinPath(nestedRoot, '../output', 'server'));
      expect(result.clientOutDir).toBe(joinPath(nestedRoot, '../output', 'client'));
      expect(result.serverOutFile).toBe(joinPath(nestedRoot, '../output', 'server', 'server.mjs'));
    });
  });
});