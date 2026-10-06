import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {absolutePath} from '../json-contract.js';
import {zod} from '@shopify/cli-kit/node/schema';

export const buildJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenBuildResult',
  definitions: {AbsolutePath: absolutePath},
  schema: zod
    .object({
      directory: absolutePath,
      clientDirectory: absolutePath,
      serverDirectory: absolutePath,
      serverPath: absolutePath,
    })
    .strict(),
});
export type BuildResult = InferJsonOutputSchema<typeof buildJsonOutputSchema>;
