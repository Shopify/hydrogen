/** @type {import('@remix-run/dev').AppConfig} */

module.exports = {
  publicPath: (process.env.HYDROGEN_ASSET_BASE_URL || '/') + 'build/',
  serverModuleFormat: 'esm',
  serverBuildTarget: 'cloudflare-workers',
  serverBuildPath: 'build/server/index.js',
  assetsBuildDirectory: 'build/client/build',
  devServerBroadcastDelay: 1000,
  devServerPort: 8002,
  ignoredRouteFiles: ['**/.*'],
};
