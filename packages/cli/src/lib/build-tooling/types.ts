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

export const buildWatchSchema = zod.discriminatedUnion('type', [
  watchStartedSchema,
  zod.object({type: zod.literal('build-started'), cycle: cycleSchema}).strict(),
  zod
    .object({
      type: zod.literal('build-completed'),
      cycle: cycleSchema,
      ...buildJsonOutputSchema.schema.shape,
    })
    .strict(),
  zod
    .object({
      type: zod.literal('build-failed'),
      cycle: cycleSchema,
      error: watchErrorSchema,
    })
    .strict(),
  watchStoppedSchema,
]);

export type BuildWatchRecord = zod.infer<typeof buildWatchSchema>;

export const buildCommandOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenBuildOutput',
  schema: zod.union([buildJsonOutputSchema.schema, buildWatchSchema]),
  definitions: {
    HydrogenBuildResult: buildJsonOutputSchema.schema,
    HydrogenBuildWatchRecord: buildWatchSchema,
  },
});
