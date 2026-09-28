import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const codegenJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenCodegenResult',
  schema: zod.object({generatedFiles: zod.record(zod.array(zod.string()))}),
});
export type CodegenResult = InferJsonOutputSchema<
  typeof codegenJsonOutputSchema
>;
