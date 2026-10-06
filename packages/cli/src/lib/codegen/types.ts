import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {absolutePath} from '../json-contract.js';
import {zod} from '@shopify/cli-kit/node/schema';

export const codegenJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenCodegenResult',
  schema: zod
    .object({
      files: zod.array(
        zod
          .object({
            path: absolutePath,
            sources: zod
              .array(zod.string())
              .describe(
                'Source patterns from the GraphQL codegen configuration.',
              ),
          })
          .strict(),
      ),
    })
    .strict(),
});
export type CodegenResult = InferJsonOutputSchema<
  typeof codegenJsonOutputSchema
>;
