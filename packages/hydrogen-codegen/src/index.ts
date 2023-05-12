import type {Types} from '@graphql-codegen/plugin-helpers';
import * as addPlugin from '@graphql-codegen/add';
import * as typescriptOperationPlugin from '@graphql-codegen/typescript-operations';
import {processSources} from './process-sources';
import {plugin as dtsPlugin} from './dts-plugin';

export {plugin} from './dts-plugin';

export type GqlTagConfig = {};

// This comment is used during ESM build:
//! import {createRequire} from 'module'; const require = createRequire(import.meta.url);
export const schema = require.resolve(
  '@shopify/hydrogen-react/storefront.schema.json',
);

const interfaceExtensionCode = `
declare module '@shopify/hydrogen' {
  interface QueryTypes extends GeneratedQueryTypes {}
  interface MutationTypes extends GeneratedMutationTypes {}
}`;

export const preset: Types.OutputPreset<GqlTagConfig> = {
  buildGeneratesSection: (options) => {
    if (!options.baseOutputDir.endsWith('.d.ts')) {
      throw new Error('[hydrogen-preset] target output should be a .d.ts file');
    }

    if (
      options.plugins?.length > 0 &&
      Object.keys(options.plugins).some((p) => p.startsWith('typescript'))
    ) {
      throw new Error(
        '[hydrogen-preset] providing additional typescript-based `plugins` leads to duplicated generated types',
      );
    }

    const sourcesWithOperations = processSources(options.documents);
    const sources = sourcesWithOperations.map(({source}) => source);

    const pluginMap = {
      ...options.pluginMap,
      [`add`]: addPlugin,
      [`typescript-operations`]: typescriptOperationPlugin,
      [`gen-dts`]: {plugin: dtsPlugin},
    };

    const namespacedImportName = 'SFAPI';

    const plugins: Array<Types.ConfiguredPlugin> = [
      // 1. Disable eslint for the generated file
      {
        [`add`]: {
          content: `/* eslint-disable eslint-comments/disable-enable-pair */\n/* eslint-disable eslint-comments/no-unlimited-disable */\n/* eslint-disable */`,
        },
      },
      // 2. Import all the generated API types from hydrogen-react
      {
        [`add`]: {
          content: `import * as ${namespacedImportName} from '@shopify/hydrogen/storefront-api-types';\n`,
        },
      },
      // 3. Generate the operations (i.e. queries, mutations, and fragments types)
      {
        [`typescript-operations`]: {
          skipTypename: true, // Skip __typename fields
          useTypeImports: true, // Use `import type` instead of `import`
          preResolveTypes: false, // Use Pick<...> instead of primitives
        },
      },
      // 4.  Augment Hydrogen query/mutation interfaces with the generated operations
      {[`gen-dts`]: {sourcesWithOperations, interfaceExtensionCode}},
      // 5. Custom plugins from the user
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
   * removing them. Later, we can use this information to reconstruct the
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
