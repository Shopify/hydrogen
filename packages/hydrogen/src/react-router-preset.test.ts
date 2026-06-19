import {describe, it, expect} from 'vitest';
import {hydrogenPreset} from './react-router-preset';
import type {Config as ReactRouterConfig} from '@react-router/dev/config';

const removedReactRouter8FutureFlags = [
  'v8_middleware',
  'v8_splitRouteModules',
  'v8_viteEnvironmentApi',
] as const;

describe('hydrogenPreset', () => {
  it('should return a preset with correct name', () => {
    const preset = hydrogenPreset();
    expect(preset.name).toBe('hydrogen');
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
      splitRouteModules: true,
      future: {
        unstable_optimizeDeps: true,
      },
      subResourceIntegrity: false,
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
          splitRouteModules: true,
          future: {
            unstable_optimizeDeps: true,
          },
          subResourceIntegrity: false,
          ...overrides,
        } as unknown as Parameters<
          NonNullable<typeof preset.reactRouterConfigResolved>
        >[0]['reactRouterConfig'],
      });
    };

    it('should throw error when basename is configured', () => {
      expect(() => {
        testResolvedConfig({basename: '/shop'});
      }).toThrow('[Hydrogen Preset] basename is not supported in Hydrogen');
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
      }).toThrow('[Hydrogen Preset] prerender is not supported in Hydrogen');
    });

    it('should throw error when serverBundles is configured', () => {
      expect(() => {
        testResolvedConfig({serverBundles: () => 'bundle'});
      }).toThrow(
        '[Hydrogen Preset] serverBundles is not supported in Hydrogen',
      );
    });

    it('should throw error when buildEnd is configured', () => {
      expect(() => {
        testResolvedConfig({buildEnd: async () => {}});
      }).toThrow('[Hydrogen Preset] buildEnd is not supported in Hydrogen');
    });

    it('should throw error when subResourceIntegrity is enabled', () => {
      expect(() => {
        testResolvedConfig({subResourceIntegrity: true});
      }).toThrow('[Hydrogen Preset] subResourceIntegrity cannot be enabled');
    });

    it('should not throw when subResourceIntegrity is false', () => {
      expect(() => {
        testResolvedConfig({subResourceIntegrity: false});
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

      expect(config?.splitRouteModules).toBe(true);
      expect(config?.future?.unstable_optimizeDeps).toBe(true);

      for (const removedFlag of removedReactRouter8FutureFlags) {
        expect(config?.future).not.toHaveProperty(removedFlag);
      }
    });

    it('should disable incompatible features', () => {
      const preset = hydrogenPreset();
      const config = preset.reactRouterConfig?.({
        reactRouterUserConfig: {} as ReactRouterConfig,
      }) as ReactRouterConfig | undefined;

      expect(config?.subResourceIntegrity).toBe(false);

      for (const removedFlag of removedReactRouter8FutureFlags) {
        expect(config?.future).not.toHaveProperty(removedFlag);
      }
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
