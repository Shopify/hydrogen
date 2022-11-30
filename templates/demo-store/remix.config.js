/** @type {import('@remix-run/dev').AppConfig} */

const {hydrogenRoutes} = require('@shopify/hydrogen-remix/build');

module.exports = {
  ignoredRouteFiles: ['**/.*'],
  async routes(defineRoutes) {
    return await hydrogenRoutes(defineRoutes, {});
  },
};
