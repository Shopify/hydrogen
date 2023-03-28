import type {CodegenConfig} from '@graphql-codegen/cli';
import {preset, pluckConfig, schema} from '@shopify/hydrogen-codegen';

export default <CodegenConfig>{
  overwrite: true,
  schema,
  pluckConfig,
  generates: {
    'hydrogen.generated.d.ts': {
      preset,
      documents: 'app/**/*.(ts|tsx)',
    },
  },
};
