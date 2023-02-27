/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  appDirectory: 'app',
  ignoredRouteFiles: ['**/.*'],
  // watchPaths: ['./public'],
  // server: './server.js',
  /**
   * The following settings are required to deploy Hydrogen apps to Oxygen:
   */
  publicPath: (process.env.HYDROGEN_ASSET_BASE_URL ?? '/') + 'build/',
  serverDependenciesToBundle: 'all',
  serverModuleFormat: 'cjs',
  serverPlatform: 'node',
  serverMinify: process.env.NODE_ENV === 'production',
};

// /** @type {import('@remix-run/dev').AppConfig} */
// module.exports = {
//   ignoredRouteFiles: ['**/.*'],
//   // appDirectory: "app",
//   // assetsBuildDirectory: "public/build",
//   // serverBuildPath: "build/index.js",
//   // publicPath: "/build/",
// };
