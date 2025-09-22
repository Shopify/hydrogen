import type {Config, Preset} from '@react-router/dev/config';

/**
 * Provides optimal React Router configuration for Hydrogen applications on Oxygen.
 * Enables validated performance optimizations while ensuring CLI compatibility.
 *
 * React Router 7.9.x Feature Support Matrix for Hydrogen 2025.7.0
 *
 * ```
 * +----------------------------------+----------+----------------------------------+
 * | Feature                          | Status   | Notes                            |
 * +----------------------------------+----------+----------------------------------+
 * | CORE CONFIGURATION                                                             |
 * +----------------------------------+----------+----------------------------------+
 * | appDirectory: 'app'              | Enabled  | Core application structure       |
 * | buildDirectory: 'dist'           | Enabled  | Build output configuration       |
 * | ssr: true                        | Enabled  | Server-side rendering            |
 * +----------------------------------+----------+----------------------------------+
 * | PERFORMANCE FLAGS                                                              |
 * +----------------------------------+----------+----------------------------------+
 * | unstable_optimizeDeps            | Enabled  | Build performance optimization   |
 * | v8_middleware                    | Enabled  | Required for Hydrogen context    |
 * | unstable_splitRouteModules       | Enabled  | Route code splitting             |
 * +----------------------------------+----------+----------------------------------+
 * | ROUTE DISCOVERY                                                                |
 * +----------------------------------+----------+----------------------------------+
 * | routeDiscovery: { mode: 'lazy' } | Default  | Lazy route loading               |
 * | routeDiscovery: { mode: 'init' } | Allowed  | Eager route loading              |
 * +----------------------------------+----------+----------------------------------+
 * | UNSUPPORTED FEATURES                                                           |
 * +----------------------------------+----------+----------------------------------+
 * | basename: '/path'                | Blocked  | CLI infrastructure limitation    |
 * | prerender: ['/routes']           | Blocked  | Plugin incompatibility           |
 * | serverBundles: () => {}          | Blocked  | Manifest incompatibility         |
 * | buildEnd: () => {}               | Blocked  | CLI bypasses hook execution      |
 * | unstable_subResourceIntegrity    | Blocked  | CSP nonce/hash conflict          |
 * | unstable_viteEnvironmentApi      | Blocked  | CLI fallback detection used      |
 * +----------------------------------+----------+----------------------------------+
 * ```
 */

function hydrogenPreset(): Preset {
  return {
    name: 'hydrogen-2025.7.0',

    reactRouterConfigResolved: ({reactRouterConfig}) => {
      if (reactRouterConfig.basename && reactRouterConfig.basename !== '/') {
        throw new Error(
          '[Hydrogen Preset] basename is not supported in Hydrogen 2025.7.0.\n' +
            'Reason: Requires major CLI infrastructure modernization.\n' +
            'Workaround: Use reverse proxy or CDN path rewriting for subdirectory hosting.',
        );
      }

      if (reactRouterConfig.prerender) {
        throw new Error(
          '[Hydrogen Preset] prerender is not supported in Hydrogen 2025.7.0.\n' +
            'Reason: React Router plugin incompatibility with Hydrogen CLI build pipeline.\n' +
            'Workaround: Use external static generation tools or server-side caching.',
        );
      }

      if (reactRouterConfig.serverBundles) {
        throw new Error(
          '[Hydrogen Preset] serverBundles is not supported in Hydrogen 2025.7.0.\n' +
            'Reason: React Router plugin manifest incompatibility with Hydrogen CLI.\n' +
            'Alternative: Route-level code splitting via unstable_splitRouteModules is enabled.',
        );
      }

      if (reactRouterConfig.buildEnd) {
        throw new Error(
          '[Hydrogen Preset] buildEnd is not supported in Hydrogen 2025.7.0.\n' +
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

export default {
  presets: [hydrogenPreset()],

  appDirectory: 'app',
  buildDirectory: 'dist',
  ssr: true,

  future: {
    v8_middleware: true,
    unstable_optimizeDeps: true,
    unstable_splitRouteModules: true,
    unstable_subResourceIntegrity: false,
    unstable_viteEnvironmentApi: false,
  },
} satisfies Config;
