import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const checkJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenCheckResult',
  schema: zod.object({
    missingRoutes: zod.array(zod.string()),
    reservedRoutes: zod.array(zod.string()),
  }),
});
export type CheckResult = InferJsonOutputSchema<typeof checkJsonOutputSchema>;
