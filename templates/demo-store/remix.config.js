const {hydrogenRoutes} = require('@shopify/hydrogen-remix/build');

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  async routes(defineRoutes) {
    return await hydrogenRoutes(defineRoutes, {});
  },
};
