import type {Types} from '@graphql-codegen/plugin-helpers';
import * as addPlugin from '@graphql-codegen/add';
import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptOperationPlugin from '@graphql-codegen/typescript-operations';
import {processSources} from './sources.js';
import {getDefaultOptions} from './defaults.js';
import {
  plugin as dtsPlugin,
  GENERATED_MUTATION_INTERFACE_NAME,
  GENERATED_QUERY_INTERFACE_NAME,
} from './plugin.js';

export type HydrogenPresetConfig = {
  /**
   * Name for the variable that contains the imported types.
   * @default 'StorefrontAPI'
   */
  namespacedImportName?: string;
  /**
   * Module to import the types from.
   * @default '@shopify/hydrogen/storefront-api-types'
   */
  importTypesFrom?: string;
  /**
   * Whether types should be imported from the `importTypesFrom` module, or generated inline.
   * @default true
   */
  importTypes?: boolean;
  /**
   * Whether to skip adding `__typename` to generated operation types.
   * @default true
   */
  skipTypenameInOperations?: boolean;
  /**
   * Override the default interface extension.
   */
  interfaceExtension?: (options: {
    queryType: string;
    mutationType: string;
  }) => string;
};

export const preset: Types.OutputPreset<HydrogenPresetConfig> = {
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

    const defaultOptions = getDefaultOptions(
      /^(customer|caapi\.)/i.test(options.baseOutputDir) ? 'caapi' : 'sfapi',
    );

    const importTypes = options.presetConfig.importTypes ?? true;
    const namespacedImportName =
      options.presetConfig.namespacedImportName ??
      defaultOptions.namespacedImportName;
    const importTypesFrom =
      options.presetConfig.importTypesFrom ?? defaultOptions.importTypesFrom;

    const interfaceExtensionCode =
      options.presetConfig.interfaceExtension?.({
        queryType: GENERATED_QUERY_INTERFACE_NAME,
        mutationType: GENERATED_MUTATION_INTERFACE_NAME,
      }) ?? defaultOptions.interfaceExtensionCode;

    const pluginMap = {
      ...options.pluginMap,
      [`add`]: addPlugin,
      [`typescript`]: typescriptPlugin,
      [`typescript-operations`]: typescriptOperationPlugin,
      [`gen-dts`]: {plugin: dtsPlugin},
    };

    const plugins: Array<Types.ConfiguredPlugin> = [
      // 1. Disable eslint for the generated file
      {
        [`add`]: {
          content: `/* eslint-disable eslint-comments/disable-enable-pair */\n/* eslint-disable eslint-comments/no-unlimited-disable */\n/* eslint-disable */`,
        },
      },
      // 2. Import all the generated API types from Hydrogen or generate all the types from the schema.
      importTypes
        ? {
            [`add`]: {
              content: `import * as ${namespacedImportName} from '${importTypesFrom}';\n`,
            },
          }
        : {
            [`typescript`]: {
              useTypeImports: true,
              useImplementingTypes: true,
              enumsAsTypes: true,
            },
          },
      // 3. Generate the operations (i.e. queries, mutations, and fragments types)
      {
        [`typescript-operations`]: {
          useTypeImports: true, // Use `import type` instead of `import`
          preResolveTypes: false, // Use Pick<...> instead of primitives
          mergeFragmentTypes: true, // Merge equal fragment interfaces. Avoids adding `| {}` to Metaobject
          skipTypename: options.presetConfig.skipTypenameInOperations ?? true, // Skip __typename fields
          namespacedImportName: importTypes ? namespacedImportName : undefined,
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
        schema: options.schema,
        config: {
          // For the TS plugin:
          defaultScalarType: 'unknown',
          // Allow overwriting defaults:
          ...options.config,
        },
        documents: sources,
        documentTransforms: options.documentTransforms,
      },
    ];
  },
};
