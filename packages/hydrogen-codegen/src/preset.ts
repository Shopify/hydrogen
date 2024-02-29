import type {Types} from '@graphql-codegen/plugin-helpers';
import {
  preset as internalPreset,
  type PresetConfig as InternalPresetConfig,
} from '@shopify/graphql-codegen';
import {getDefaultOptions} from './defaults.js';

export const preset: Types.OutputPreset<Partial<InternalPresetConfig>> = {
  [Symbol.for('name')]: 'hydrogen',
  buildGeneratesSection: (options) => {
    try {
      const defaultOptions = getDefaultOptions(options.baseOutputDir);

      return internalPreset.buildGeneratesSection({
        ...options,
        presetConfig: {
          importTypes: {
            namespace: defaultOptions.namespacedImportName,
            from: defaultOptions.importTypesFrom,
          },
          interfaceExtension: defaultOptions.interfaceExtensionCode,
          ...options.presetConfig,
        } satisfies Partial<InternalPresetConfig>,
      });
    } catch (err) {
      const error = err as Error;

      error.message = error.message.replace(
        '[@shopify/graphql-codegen]',
        '[hydrogen-preset]',
      );

      throw error;
    }
  },
};
