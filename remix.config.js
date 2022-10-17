/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  // Should be replaced with process.env.HYDROGEN_ASSET_BASE_URL for the production build
  publicPath: "/build/",
  serverModuleFormat: "esm",
  serverBuildPath: "build/index.mjs",
  devServerBroadcastDelay: 1000,
  devServerPort: 8002,
  ignoredRouteFiles: ["**/.*"],
};
