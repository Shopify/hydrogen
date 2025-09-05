import {describe, it, expect} from 'vitest';
import {hydrogenPreset} from './react-router-preset';
import type {Config} from '@react-router/dev/config';

describe('hydrogenPreset', () => {
  it('should return a preset with correct name', () => {
    const preset = hydrogenPreset();
    expect(preset.name).toBe('hydrogen-2025.7.0');
  });

  it('should configure React Router with Hydrogen defaults', () => {
    const preset = hydrogenPreset();
    const config = preset.reactRouterConfig?.() as Config;

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

    it('should throw error when basename is configured', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {basename: '/shop'} as Config,
        });
      }).toThrow(
        '[Hydrogen Preset] basename is not supported in Hydrogen 2025.7.0',
      );
    });

    it('should not throw when basename is root', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {basename: '/'} as Config,
        });
      }).not.toThrow();
    });

    it('should not throw when basename is undefined', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {} as Config,
        });
      }).not.toThrow();
    });

    it('should throw error when prerender is configured', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {prerender: ['/about']} as Config,
        });
      }).toThrow(
        '[Hydrogen Preset] prerender is not supported in Hydrogen 2025.7.0',
      );
    });

    it('should throw error when serverBundles is configured', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {
            serverBundles: () => 'bundle',
          } as unknown as Config,
        });
      }).toThrow(
        '[Hydrogen Preset] serverBundles is not supported in Hydrogen 2025.7.0',
      );
    });

    it('should throw error when buildEnd is configured', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {
            buildEnd: async () => {},
          } as unknown as Config,
        });
      }).toThrow(
        '[Hydrogen Preset] buildEnd is not supported in Hydrogen 2025.7.0',
      );
    });

    it('should throw error when unstable_subResourceIntegrity is enabled', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {
            future: {
              unstable_subResourceIntegrity: true,
            },
          } as Config,
        });
      }).toThrow(
        '[Hydrogen Preset] unstable_subResourceIntegrity cannot be enabled',
      );
    });

    it('should not throw when unstable_subResourceIntegrity is false', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {
            future: {
              unstable_subResourceIntegrity: false,
            },
          } as Config,
        });
      }).not.toThrow();
    });

    it('should not throw when future is undefined', () => {
      expect(() => {
        preset.reactRouterConfigResolved?.({
          reactRouterConfig: {} as Config,
        });
      }).not.toThrow();
    });
  });

  describe('preset compatibility', () => {
    it('should enable performance optimizations', () => {
      const preset = hydrogenPreset();
      const config = preset.reactRouterConfig?.() as Config;

      // Verify all performance flags are enabled
      expect(config.future?.unstable_optimizeDeps).toBe(true);
      expect(config.future?.unstable_middleware).toBe(true);
      expect(config.future?.unstable_splitRouteModules).toBe(true);
    });

    it('should disable incompatible features', () => {
      const preset = hydrogenPreset();
      const config = preset.reactRouterConfig?.() as Config;

      // Verify incompatible features are disabled
      expect(config.future?.unstable_subResourceIntegrity).toBe(false);
      expect(config.future?.unstable_viteEnvironmentApi).toBe(false);
    });

    it('should configure SSR correctly', () => {
      const preset = hydrogenPreset();
      const config = preset.reactRouterConfig?.() as Config;

      expect(config.ssr).toBe(true);
    });
  });
});
