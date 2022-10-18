/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  // eslint-disable-next-line no-undef
  publicPath: (process.env.HYDROGEN_ASSET_BASE_URL || "") + "/build/",
  serverModuleFormat: "esm",
  serverBuildPath: "build/index.mjs",
  devServerBroadcastDelay: 1000,
  devServerPort: 8002,
  ignoredRouteFiles: ["**/.*"],
};
