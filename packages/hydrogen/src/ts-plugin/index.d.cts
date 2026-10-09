import ts = require("typescript/lib/tsserverlibrary");

/**
 * TypeScript language service plugin that configures gql.tada with Hydrogen's bundled Storefront and
 * Customer Account API schemas.
 *
 * @publicDocs
 */
declare const init: ts.server.PluginModuleFactory;
export = init;
