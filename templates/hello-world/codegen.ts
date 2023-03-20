import type {CodegenConfig} from '@graphql-codegen/cli';
import {preset, pluckConfig, schema} from '@shopify/hydrogen-codegen';

export default <CodegenConfig>{
  overwrite: true,
  pluckConfig,
  generates: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'hydrogen.generated.d.ts': {
      preset,
      schema,
      documents: 'app/**/*.(ts|tsx)',
    },
  },
};
