/** @type {import('@remix-run/dev').AppConfig} */

const {hydrogenRoutes} = require('@shopify/h2-test-hydrogen-remix/build');

module.exports = {
  ignoredRouteFiles: ['**/.*'],
  async routes(defineRoutes) {
    return await hydrogenRoutes(defineRoutes, {prefixLocalizedRoutes: true});
  },
};
