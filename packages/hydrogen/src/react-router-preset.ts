import type {Preset} from '@react-router/dev/config';

/**
 * Official Hydrogen preset for React Router.
 *
 * Provides optimal React Router configuration for Hydrogen applications on Oxygen.
 * Enables validated performance optimizations while rejecting options that are
 * incompatible with Hydrogen's build and runtime pipeline.
 */
export function hydrogenPreset(): Preset {
  return {
    name: 'hydrogen',

    reactRouterConfig: () => ({
      appDirectory: 'app',
      buildDirectory: 'dist',
      ssr: true,
      splitRouteModules: true,

      future: {
        unstable_optimizeDeps: true,
      },
      subResourceIntegrity: false,
    }),

    reactRouterConfigResolved: ({reactRouterConfig}) => {
      if (reactRouterConfig.basename && reactRouterConfig.basename !== '/') {
        throw new Error(
          '[Hydrogen Preset] basename is not supported in Hydrogen.\n' +
            'Reason: Requires major CLI infrastructure modernization.\n' +
            'Workaround: Use reverse proxy or CDN path rewriting for subdirectory hosting.',
        );
      }

      if (reactRouterConfig.prerender) {
        throw new Error(
          '[Hydrogen Preset] prerender is not supported in Hydrogen.\n' +
            'Reason: React Router plugin incompatibility with Hydrogen CLI build pipeline.\n' +
            'Workaround: Use external static generation tools or server-side caching.',
        );
      }

      if (reactRouterConfig.serverBundles) {
        throw new Error(
          '[Hydrogen Preset] serverBundles is not supported in Hydrogen.\n' +
            'Reason: React Router plugin manifest incompatibility with Hydrogen CLI.\n' +
            'Alternative: Route-level code splitting via splitRouteModules is enabled.',
        );
      }

      if (reactRouterConfig.buildEnd) {
        throw new Error(
          '[Hydrogen Preset] buildEnd is not supported in Hydrogen.\n' +
            'Reason: Hydrogen CLI bypasses React Router buildEnd hook execution.\n' +
            'Workaround: Use external build scripts or package.json post-build hooks.',
        );
      }

      if (reactRouterConfig.subResourceIntegrity === true) {
        throw new Error(
          '[Hydrogen Preset] subResourceIntegrity cannot be enabled.\n' +
            'Reason: Conflicts with Hydrogen CSP nonce-based authentication.\n' +
            'Impact: Would break Content Security Policy and cause script execution failures.',
        );
      }
    },
  };
}
