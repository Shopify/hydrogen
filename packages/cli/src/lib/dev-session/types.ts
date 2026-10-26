import {devInstanceLogOutputSchema} from '@shopify/cli-kit/node/dev-instance';
import {defineJsonOutputSchema} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';
import {absolutePath} from '../json-contract.js';

const runtimeDetailsSchema = zod
  .object({
    environment: zod.string().nullable(),
    environmentBranch: zod.string().nullable(),
    envFile: absolutePath,
    urls: zod.array(zod.string().url()),
    watch: zod.boolean(),
  })
  .strict();

export const devSessionJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenDevLogEntry',
  schema: devInstanceLogOutputSchema.schema,
  definitions: {HydrogenRuntimeDetails: runtimeDetailsSchema},
});
