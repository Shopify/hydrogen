// src/react-router-preset.ts
function hydrogenPreset() {
  return {
    name: "hydrogen-2025.7.0",
    reactRouterConfig: () => ({
      appDirectory: "app",
      buildDirectory: "dist",
      ssr: true,
      future: {
        v8_middleware: true,
        unstable_optimizeDeps: true,
        unstable_splitRouteModules: true,
        unstable_subResourceIntegrity: false,
        unstable_viteEnvironmentApi: false
      }
    }),
    reactRouterConfigResolved: ({ reactRouterConfig }) => {
      if (reactRouterConfig.basename && reactRouterConfig.basename !== "/") {
        throw new Error(
          "[Hydrogen Preset] basename is not supported in Hydrogen 2025.7.0.\nReason: Requires major CLI infrastructure modernization.\nWorkaround: Use reverse proxy or CDN path rewriting for subdirectory hosting."
        );
      }
      if (reactRouterConfig.prerender) {
        throw new Error(
          "[Hydrogen Preset] prerender is not supported in Hydrogen 2025.7.0.\nReason: React Router plugin incompatibility with Hydrogen CLI build pipeline.\nWorkaround: Use external static generation tools or server-side caching."
        );
      }
      if (reactRouterConfig.serverBundles) {
        throw new Error(
          "[Hydrogen Preset] serverBundles is not supported in Hydrogen 2025.7.0.\nReason: React Router plugin manifest incompatibility with Hydrogen CLI.\nAlternative: Route-level code splitting via unstable_splitRouteModules is enabled."
        );
      }
      if (reactRouterConfig.buildEnd) {
        throw new Error(
          "[Hydrogen Preset] buildEnd is not supported in Hydrogen 2025.7.0.\nReason: Hydrogen CLI bypasses React Router buildEnd hook execution.\nWorkaround: Use external build scripts or package.json post-build hooks."
        );
      }
      if (reactRouterConfig.future?.unstable_subResourceIntegrity === true) {
        throw new Error(
          "[Hydrogen Preset] unstable_subResourceIntegrity cannot be enabled.\nReason: Conflicts with Hydrogen CSP nonce-based authentication.\nImpact: Would break Content Security Policy and cause script execution failures."
        );
      }
    }
  };
}
export {
  hydrogenPreset
};
//# sourceMappingURL=react-router-preset.js.map