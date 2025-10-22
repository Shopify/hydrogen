import type {Preset} from '@react-router/dev/config';

/**
 * Official Hydrogen Preset for React Router 7.12.x
 *
 * Provides optimal React Router configuration for Hydrogen applications on Oxygen.
 * Enables validated performance optimizations while ensuring CLI compatibility.
 *
 * React Router 7.12.x Feature Support Matrix for Hydrogen 2025.10.0
 *
 * +----------------------------------+----------+----------------------------------+
 * | Feature                          | Status   | Notes                            |
 * +----------------------------------+----------+----------------------------------+
 * | CORE CONFIGURATION                                                              |
 * +----------------------------------+----------+----------------------------------+
 * | appDirectory: 'app'              | Enabled  | Core application structure       |
 * | buildDirectory: 'dist'           | Enabled  | Build output configuration       |
 * | ssr: true                        | Enabled  | Server-side rendering            |
 * +----------------------------------+----------+----------------------------------+
 * | PERFORMANCE FLAGS                                                               |
 * +----------------------------------+----------+----------------------------------+
 * | v8_middleware                    | Enabled  | Required for Hydrogen context    |
 * | v8_splitRouteModules             | Enabled  | Route code splitting             |
 * | unstable_optimizeDeps            | Enabled  | Build performance optimization   |
 * +----------------------------------+----------+----------------------------------+
 * | ROUTE DISCOVERY                                                                 |
 * +----------------------------------+----------+----------------------------------+
 * | routeDiscovery: { mode: 'lazy' } | Default  | Lazy route loading               |
 * | routeDiscovery: { mode: 'init' } | Allowed  | Eager route loading              |
 * +----------------------------------+----------+----------------------------------+
 * | UNSUPPORTED FEATURES                                                            |
 * +----------------------------------+----------+----------------------------------+
 * | basename: '/path'                | Blocked  | CLI infrastructure limitation    |
 * | prerender: ['/routes']           | Blocked  | Plugin incompatibility           |
 * | serverBundles: () => {}          | Blocked  | Manifest incompatibility         |
 * | buildEnd: () => {}               | Blocked  | CLI bypasses hook execution      |
 * | unstable_subResourceIntegrity    | Blocked  | CSP nonce/hash conflict          |
 * | v8_viteEnvironmentApi            | Blocked  | CLI fallback detection used      |
 * +----------------------------------+----------+----------------------------------+
 *
 * @version 2025.10.0
 */
export function hydrogenPreset(): Preset {
  return {
    name: 'hydrogen-2025.10.0',

    reactRouterConfig: () => ({
      appDirectory: 'app',
      buildDirectory: 'dist',
      ssr: true,

      future: {
        v8_middleware: true,
        v8_splitRouteModules: true,
        v8_viteEnvironmentApi: false,
        unstable_optimizeDeps: true,
        unstable_subResourceIntegrity: false,
      },
    }),

    reactRouterConfigResolved: ({reactRouterConfig}) => {
      if (reactRouterConfig.basename && reactRouterConfig.basename !== '/') {
        throw new Error(
          '[Hydrogen Preset] basename is not supported in Hydrogen 2025.10.0.\n' +
            'Reason: Requires major CLI infrastructure modernization.\n' +
            'Workaround: Use reverse proxy or CDN path rewriting for subdirectory hosting.',
        );
      }

      if (reactRouterConfig.prerender) {
        throw new Error(
          '[Hydrogen Preset] prerender is not supported in Hydrogen 2025.10.0.\n' +
            'Reason: React Router plugin incompatibility with Hydrogen CLI build pipeline.\n' +
            'Workaround: Use external static generation tools or server-side caching.',
        );
      }

      if (reactRouterConfig.serverBundles) {
        throw new Error(
          '[Hydrogen Preset] serverBundles is not supported in Hydrogen 2025.10.0.\n' +
            'Reason: React Router plugin manifest incompatibility with Hydrogen CLI.\n' +
            'Alternative: Route-level code splitting via v8_splitRouteModules is enabled.',
        );
      }

      if (reactRouterConfig.buildEnd) {
        throw new Error(
          '[Hydrogen Preset] buildEnd is not supported in Hydrogen 2025.10.0.\n' +
            'Reason: Hydrogen CLI bypasses React Router buildEnd hook execution.\n' +
            'Workaround: Use external build scripts or package.json post-build hooks.',
        );
      }

      if (reactRouterConfig.future?.unstable_subResourceIntegrity === true) {
        throw new Error(
          '[Hydrogen Preset] unstable_subResourceIntegrity cannot be enabled.\n' +
            'Reason: Conflicts with Hydrogen CSP nonce-based authentication.\n' +
            'Impact: Would break Content Security Policy and cause script execution failures.',
        );
      }
    },
  };
}
