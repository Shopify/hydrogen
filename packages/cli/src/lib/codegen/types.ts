import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {absolutePath} from '../json-contract.js';
import {zod} from '@shopify/cli-kit/node/schema';
import {
  cycleSchema,
  watchErrorSchema,
  watchStartedSchema,
  watchStoppedSchema,
} from '../watch/types.js';

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

export const codegenWatchSchema = zod.discriminatedUnion('type', [
  watchStartedSchema,
  zod
    .object({type: zod.literal('generation-started'), cycle: cycleSchema})
    .strict(),
  zod
    .object({
      type: zod.literal('generation-completed'),
      cycle: cycleSchema,
      files: codegenJsonOutputSchema.schema.shape.files,
    })
    .strict(),
  zod
    .object({
      type: zod.literal('generation-failed'),
      cycle: cycleSchema,
      error: watchErrorSchema,
    })
    .strict(),
  watchStoppedSchema,
]);

export type CodegenWatchRecord = zod.infer<typeof codegenWatchSchema>;

export const codegenCommandOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenCodegenOutput',
  schema: zod.union([codegenJsonOutputSchema.schema, codegenWatchSchema]),
  definitions: {
    HydrogenCodegenResult: codegenJsonOutputSchema.schema,
    HydrogenCodegenWatchRecord: codegenWatchSchema,
  },
});
