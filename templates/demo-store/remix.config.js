/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  appDirectory: 'app',
  ignoredRouteFiles: ['**/.*'],
  publicPath: (process.env.HYDROGEN_ASSET_BASE_URL ?? '/') + 'build/',
  assetsBuildDirectory: 'dist/client/build',
  watchPaths: ['./public'],
  server: './server',
  serverBuildPath: 'dist/worker/index.js',
  serverMainFields: ['browser', 'module', 'main'],
  serverConditions: ['worker', process.env.NODE_ENV],
  serverDependenciesToBundle: 'all',
  serverModuleFormat: 'esm',
  serverPlatform: 'neutral',
  serverMinify: true,
};
