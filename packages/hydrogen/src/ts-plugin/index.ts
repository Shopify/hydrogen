import { resolve } from "node:path";

import gqlTadaPlugin from "gql.tada/ts-plugin";
import type ts from "typescript/lib/tsserverlibrary";

import { createGraphQLPluginConfig } from "../graphql/plugin-config";

const SCHEMA_DIRECTORY = resolve(__dirname, "..");

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
