import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const buildJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenBuildResult',
  schema: zod.object({
    directory: zod.string(),
    clientDirectory: zod.string(),
    serverDirectory: zod.string(),
    serverFile: zod.string(),
  }),
});
export type BuildResult = InferJsonOutputSchema<typeof buildJsonOutputSchema>;
