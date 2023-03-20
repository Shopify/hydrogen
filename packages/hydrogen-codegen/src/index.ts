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

export const pluckConfig = {
  /**
   * Hook to determine if a node is a gql template literal.
   * By default, graphql-tag-pluck only looks for leading comments or `gql` tag.
   */
  isGqlTemplateLiteral: (node: any, options: any) => {
    // Check for internal gql comment: const QUERY = `#graphql ...`
    const hasInternalGqlComment =
      node.type === 'TemplateLiteral' &&
      /\s*#graphql\s*\n/i.test(node.quasis[0]?.value?.raw || '');

    if (hasInternalGqlComment) return true;

    // Check for leading gql comment: const QUERY = /* GraphQL */ `...`
    const {leadingComments} = node;
    const leadingComment = leadingComments?.[leadingComments?.length - 1];
    const leadingCommentValue = leadingComment?.value?.trim().toLowerCase();

    return leadingCommentValue === options?.gqlMagicComment;
  },

  /**
   * Instruct how to extract the gql template literal from the code.
   * By default, embedded expressions in template literals (e.g. ${foo})
   * are removed from the template string. This hook allows us to annotate
   * the template string with the required embedded expressions instead of
   * removing them. Later, we can use this information reconstruct the
   * embedded expressions.
   */
  pluckStringFromFile: (code: string, {start, end, leadingComments}: any) => {
    let gqlTemplate = code
      // Slice quotes
      .slice(start + 1, end - 1)
      // Annotate embedded expressions
      // e.g. ${foo} -> #REQUIRED_VAR=foo
      .replace(/\$\{([^}]*)\}/g, (_, m1) => '#REQUIRED_VAR=' + m1)
      .split('\\`')
      .join('`');

    const chunkStart = leadingComments?.[0]?.start ?? start;
    const codeBeforeNode = code.slice(0, chunkStart);
    const [, varName] = codeBeforeNode.match(/\s(\w+)\s*=\s*$/) || [];

    if (varName) {
      // Annotate with the name of the variable that stores this gql template.
      // This is used to reconstruct the embedded expressions later.
      gqlTemplate += '#VAR_NAME=' + varName;
    }

    return gqlTemplate;
  },
};
