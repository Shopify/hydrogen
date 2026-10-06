import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const checkJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenCheckResult',
  schema: zod
    .object({
      valid: zod.boolean(),
      missingRoutes: zod.array(zod.string()),
      reservedRoutes: zod.array(zod.string()),
    })
    .strict(),
});
export type CheckResult = InferJsonOutputSchema<typeof checkJsonOutputSchema>;
