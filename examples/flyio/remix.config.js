/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  appDirectory: 'app',
  ignoredRouteFiles: ['**/.*'],
  publicPath: (process.env.HYDROGEN_ASSET_BASE_URL ?? '/') + 'build/',
  serverDependenciesToBundle: 'all',
  serverModuleFormat: 'cjs',
  serverPlatform: 'node',
  serverMinify: process.env.NODE_ENV === 'production',
};
