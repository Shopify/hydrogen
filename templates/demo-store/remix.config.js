// TODO: Change package name when we decide on a package name.
const {hydrogenRoutes} = require('@shopify/hydrogen/build');

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  routes(defineRoutes) {
    return hydrogenRoutes(defineRoutes, {
      graphiql: process.env.NODE_ENV !== 'production',
    });
  },
};
