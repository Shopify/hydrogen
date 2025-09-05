import {describe, it, expect} from 'vitest';
import {hydrogenPreset} from './react-router-preset';
import type {Config as ReactRouterConfig} from '@react-router/dev/config';

describe('hydrogenPreset', () => {
  it('should return a preset with correct name', () => {
    const preset = hydrogenPreset();
    expect(preset.name).toBe('hydrogen-2025.7.0');
  });

  it('should configure React Router with Hydrogen defaults', () => {
    const preset = hydrogenPreset();
    const config = preset.reactRouterConfig?.({
      reactRouterUserConfig: {} as ReactRouterConfig,
    });

    expect(config).toEqual({
      appDirectory: 'app',
      buildDirectory: 'dist',
      ssr: true,
      future: {
        unstable_optimizeDeps: true,
        unstable_middleware: true,
        unstable_splitRouteModules: true,
        unstable_subResourceIntegrity: false,
        unstable_viteEnvironmentApi: false,
      },
    });
  });

  describe('reactRouterConfigResolved validation', () => {
    const preset = hydrogenPreset();

    // The resolved config has all required properties filled in by React Router
    // We only care about testing the specific properties we validate
    // Helper to create a mock resolved config with only the properties we test
    const testResolvedConfig = (overrides: Record<string, unknown> = {}) => {
      preset.reactRouterConfigResolved?.({
        reactRouterConfig: {
          basename: undefined,
          prerender: undefined,
          serverBundles: undefined,
          buildEnd: undefined,
          future: {
            unstable_subResourceIntegrity: false,
            unstable_middleware: true,
            unstable_optimizeDeps: true,
            unstable_splitRouteModules: true,
            unstable_viteEnvironmentApi: false,
          },
          ...overrides,
        } as unknown as Parameters<
          NonNullable<typeof preset.reactRouterConfigResolved>
        >[0]['reactRouterConfig'],
      });
    };

    it('should throw error when basename is configured', () => {
      expect(() => {
        testResolvedConfig({basename: '/shop'});
      }).toThrow(
        '[Hydrogen Preset] basename is not supported in Hydrogen 2025.7.0',
      );
    });

    it('should not throw when basename is root', () => {
      expect(() => {
        testResolvedConfig({basename: '/'});
      }).not.toThrow();
    });

    it('should not throw when basename is undefined', () => {
      expect(() => {
        testResolvedConfig();
      }).not.toThrow();
    });

    it('should throw error when prerender is configured', () => {
      expect(() => {
        testResolvedConfig({prerender: ['/about']});
      }).toThrow(
        '[Hydrogen Preset] prerender is not supported in Hydrogen 2025.7.0',
      );
    });

    it('should throw error when serverBundles is configured', () => {
      expect(() => {
        testResolvedConfig({serverBundles: () => 'bundle'});
      }).toThrow(
        '[Hydrogen Preset] serverBundles is not supported in Hydrogen 2025.7.0',
      );
    });

    it('should throw error when buildEnd is configured', () => {
      expect(() => {
        testResolvedConfig({buildEnd: async () => {}});
      }).toThrow(
        '[Hydrogen Preset] buildEnd is not supported in Hydrogen 2025.7.0',
      );
    });

    it('should throw error when unstable_subResourceIntegrity is enabled', () => {
      expect(() => {
        testResolvedConfig({
          future: {
            unstable_subResourceIntegrity: true,
            unstable_middleware: true,
            unstable_optimizeDeps: true,
            unstable_splitRouteModules: true,
            unstable_viteEnvironmentApi: false,
          },
        });
      }).toThrow(
        '[Hydrogen Preset] unstable_subResourceIntegrity cannot be enabled',
      );
    });

    it('should not throw when unstable_subResourceIntegrity is false', () => {
      expect(() => {
        testResolvedConfig({
          future: {
            unstable_subResourceIntegrity: false,
            unstable_middleware: true,
            unstable_optimizeDeps: true,
            unstable_splitRouteModules: true,
            unstable_viteEnvironmentApi: false,
          },
        });
      }).not.toThrow();
    });

    it('should not throw when future is undefined', () => {
      expect(() => {
        testResolvedConfig({future: undefined});
      }).not.toThrow();
    });
  });

  describe('preset compatibility', () => {
    it('should enable performance optimizations', () => {
      const preset = hydrogenPreset();
      const config = preset.reactRouterConfig?.({
        reactRouterUserConfig: {} as ReactRouterConfig,
      }) as ReactRouterConfig | undefined;

      // Verify all performance flags are enabled
      expect(config?.future?.unstable_optimizeDeps).toBe(true);
      expect(config?.future?.unstable_middleware).toBe(true);
      expect(config?.future?.unstable_splitRouteModules).toBe(true);
    });

    it('should disable incompatible features', () => {
      const preset = hydrogenPreset();
      const config = preset.reactRouterConfig?.({
        reactRouterUserConfig: {} as ReactRouterConfig,
      }) as ReactRouterConfig | undefined;

      // Verify incompatible features are disabled
      expect(config?.future?.unstable_subResourceIntegrity).toBe(false);
      expect(config?.future?.unstable_viteEnvironmentApi).toBe(false);
    });

    it('should configure SSR correctly', () => {
      const preset = hydrogenPreset();
      const config = preset.reactRouterConfig?.({
        reactRouterUserConfig: {} as ReactRouterConfig,
      }) as ReactRouterConfig | undefined;

      expect(config?.ssr).toBe(true);
    });
  });
});
