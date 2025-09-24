import {describe, it, expect} from 'vitest';
import * as HydrogenExports from './index';

describe('Package exports', () => {
  describe('hydrogenContext export', () => {
    it('should export hydrogenContext with all required context keys', () => {
      const {hydrogenContext} = HydrogenExports;

      // Verify all context keys are present
      expect(hydrogenContext).toHaveProperty('storefront');
      expect(hydrogenContext).toHaveProperty('cart');
      expect(hydrogenContext).toHaveProperty('customerAccount');
      expect(hydrogenContext).toHaveProperty('env');
      expect(hydrogenContext).toHaveProperty('session');
      expect(hydrogenContext).toHaveProperty('waitUntil');

      // Verify they are unique React Router context objects
      const contextKeys = Object.values(hydrogenContext);
      const uniqueKeys = new Set(contextKeys);
      expect(contextKeys.length).toBe(6);
      expect(uniqueKeys.size).toBe(6);
    });

    it('should not export individual context keys to maintain API surface', () => {
      // This ensures we're not accidentally exposing internal context keys
      expect(HydrogenExports).not.toHaveProperty('storefrontContext');
      expect(HydrogenExports).not.toHaveProperty('cartContext');
      expect(HydrogenExports).not.toHaveProperty('customerAccountContext');
      expect(HydrogenExports).not.toHaveProperty('envContext');
      expect(HydrogenExports).not.toHaveProperty('sessionContext');
      expect(HydrogenExports).not.toHaveProperty('waitUntilContext');
    });
  });

  describe('React Router preset export', () => {
    it('should export hydrogenPreset that returns valid configuration', () => {
      const preset = HydrogenExports.hydrogenPreset();
      expect(preset.name).toBe('hydrogen-2025.7.0');
      expect(typeof preset.reactRouterConfig).toBe('function');
    });
  });

  describe('Critical exports not accidentally removed', () => {
    it('should not export internal utilities', () => {
      // Ensure we're not accidentally exposing internals
      expect(HydrogenExports).not.toHaveProperty('warnOnce');
      expect(HydrogenExports).not.toHaveProperty('getHeader');
    });
  });
});
