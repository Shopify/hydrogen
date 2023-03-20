import type {Types} from '@graphql-codegen/plugin-helpers';
import * as addPlugin from '@graphql-codegen/add';
import * as typescriptOperationPlugin from '@graphql-codegen/typescript-operations';
import {ClientSideBaseVisitor} from '@graphql-codegen/visitor-plugin-common';
import {processSources} from './process-sources';
import * as dtsPlugin from './dts-plugin';

export type GqlTagConfig = {};

// TODO: how does this work in ESM land?
export const schema = require.resolve(
  '@shopify/hydrogen-react/storefront.schema.json',
);

export const preset: Types.OutputPreset<GqlTagConfig> = {
  buildGeneratesSection: (options) => {
    const visitor = new ClientSideBaseVisitor(
      options.schemaAst!,
      [],
      options.config,
      options.config,
    );

    const capitalize = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1);

    const sourcesWithOperations = processSources(options.documents, (node) => {
      if (node.kind === 'FragmentDefinition') {
        return visitor.getFragmentVariableName(node);
      }

      return visitor.convertName(node, {
        useTypesSuffix: true,
        suffix: capitalize(node.operation),
      });
    });

    const sources = sourcesWithOperations.map(({source}) => source);

    const pluginMap = {
      ...options.pluginMap,
      [`add`]: addPlugin,
      [`typescript-operations`]: typescriptOperationPlugin,
      [`gen-dts`]: dtsPlugin,
    };

    const namespacedImportName = 'HydrogenStorefront';

    const plugins: Array<Types.ConfiguredPlugin> = [
      {
        [`add`]: {
          content: `/* eslint-disable eslint-comments/disable-enable-pair */\n/* eslint-disable eslint-comments/no-unlimited-disable */\n/* eslint-disable */`,
        },
      },
      {
        [`add`]: {
          content: `import * as ${namespacedImportName} from '@shopify/hydrogen-react/storefront-api-types';\n`,
        },
      },
      {[`typescript-operations`]: {skipTypename: true, useTypeImports: true}},
      {[`gen-dts`]: {sourcesWithOperations}},
      ...options.plugins,
    ];

    return [
      {
        filename: options.baseOutputDir,
        plugins,
        pluginMap,
        schema: options.schema || schema,
        config: {
          ...options.config,
          // This is for the operations plugin
          namespacedImportName,
        },
        documents: sources,
        // @ts-expect-error
        documentTransforms: options.documentTransforms,
      },
    ];
  },
};
