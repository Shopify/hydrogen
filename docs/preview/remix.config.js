/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  watchPaths: [process.env.DOCS_META_FILE],
  serverModuleFormat: 'cjs',
};
