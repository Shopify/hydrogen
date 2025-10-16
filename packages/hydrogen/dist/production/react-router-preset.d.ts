import { Preset } from '@react-router/dev/config';

/**
 * Official Hydrogen Preset for React Router 7.9.x
 *
 * Provides optimal React Router configuration for Hydrogen applications on Oxygen.
 * Enables validated performance optimizations while ensuring CLI compatibility.
 *
 * React Router 7.9.x Feature Support Matrix for Hydrogen 2025.7.0
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
 * | unstable_optimizeDeps            | Enabled  | Build performance optimization   |
 * | v8_middleware                    | Enabled  | Required for Hydrogen context    |
 * | unstable_splitRouteModules       | Enabled  | Route code splitting             |
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
 * | unstable_viteEnvironmentApi      | Blocked  | CLI fallback detection used      |
 * +----------------------------------+----------+----------------------------------+
 *
 * @version 2025.7.0
 */
declare function hydrogenPreset(): Preset;

export { hydrogenPreset };
