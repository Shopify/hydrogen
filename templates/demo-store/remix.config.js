// TODO: Change package name when we decide on a package name.
const {hydrogenRoutes} = require('@shopify/h2-test-hydrogen-remix/build');

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  serverBuildDirectory: 'dist',
  async routes(defineRoutes) {
    return await hydrogenRoutes(defineRoutes, {});
  },
};
