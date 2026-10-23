import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';
import {buildWatchSchema} from '../build-tooling/types.js';
import {absolutePath} from '../json-contract.js';
import {cycleSchema, watchErrorSchema} from '../watch/types.js';

export const cpuJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenCpuWatchRecord',
  schema: zod.discriminatedUnion('type', [
    ...buildWatchSchema.options,
    zod
      .object({type: zod.literal('profile-started'), cycle: cycleSchema})
      .strict(),
    zod
      .object({
        type: zod.literal('profile-completed'),
        cycle: cycleSchema,
        path: absolutePath,
        format: zod.literal('cpuprofile'),
        totalTimeMs: zod.number().finite().nonnegative(),
        totalScriptTimeMs: zod.number().finite().nonnegative(),
      })
      .strict(),
    zod
      .object({
        type: zod.literal('profile-failed'),
        cycle: cycleSchema,
        error: watchErrorSchema,
      })
      .strict(),
  ]),
});

export type CpuWatchRecord = InferJsonOutputSchema<typeof cpuJsonOutputSchema>;
