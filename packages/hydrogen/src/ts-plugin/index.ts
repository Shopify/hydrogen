import { resolve } from "node:path";

import gqlTadaPlugin from "gql.tada/ts-plugin";
import type ts from "typescript/lib/tsserverlibrary";

import { createGraphQLPluginConfig } from "../graphql/plugin-config";

const SCHEMA_DIRECTORY = resolve(__dirname, "..");

/**
 * TypeScript language service plugin that configures gql.tada with Hydrogen's bundled Storefront and
 * Customer Account API schemas.
 *
 * @publicDocs
 */
const init: ts.server.PluginModuleFactory = (modules) => {
  const plugin = gqlTadaPlugin(modules);

  return {
    create(info) {
      return plugin.create({
        ...info,
        config: createGraphQLPluginConfig(SCHEMA_DIRECTORY),
      });
    },
  };
};

export default init;
