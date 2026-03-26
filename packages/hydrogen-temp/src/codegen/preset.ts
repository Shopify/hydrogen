import type {Types} from '@graphql-codegen/plugin-helpers';
import {
  preset as internalPreset,
  type PresetConfig as InternalPresetConfig,
} from '@shopify/graphql-codegen';

export type PresetConfig = Partial<InternalPresetConfig>;

const QUERIES_PLACEHOLDER = '%queries%';
const MUTATIONS_PLACEHOLDER = '%mutations%';

const interfaceExtensionTemplate = `
declare module '${__PACKAGE_NAME__}' {
  interface StorefrontQueries extends ${QUERIES_PLACEHOLDER} {}
  interface StorefrontMutations extends ${MUTATIONS_PLACEHOLDER} {}
}`;

export const preset: Types.OutputPreset<PresetConfig> = {
  [Symbol.for('name')]: __PACKAGE_NAME__,
  buildGeneratesSection: (options) => {
    try {
      return internalPreset.buildGeneratesSection({
        ...options,
        presetConfig: {
          importTypes: {
            namespace: 'StorefrontAPI',
            from: `${__PACKAGE_NAME__}/storefront-api-types`,
          },
          interfaceExtension: ({queryType, mutationType}) =>
            interfaceExtensionTemplate
              .replace(QUERIES_PLACEHOLDER, queryType)
              .replace(MUTATIONS_PLACEHOLDER, mutationType),
          ...options.presetConfig,
        } satisfies PresetConfig,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      error.message = error.message.replace(
        '[@shopify/graphql-codegen]',
        `[${__PACKAGE_NAME__}-preset]`,
      );

      throw error;
    }
  },
};
