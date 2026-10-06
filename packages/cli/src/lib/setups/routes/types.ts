import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {status} from '../../json-contract.js';
import {zod} from '@shopify/cli-kit/node/schema';

const Route = zod
  .object({
    sourceRoute: zod.string(),
    destinationRoute: zod.string(),
    operation: zod.enum(['created', 'skipped', 'replaced']),
  })
  .strict();
export const generateRoutesJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenGenerateRoutesResult',
  schema: zod
    .object({
      status,
      changed: zod.boolean(),
      routes: zod.array(Route),
      routeGroups: zod.record(zod.array(zod.string())),
      isTypescript: zod.boolean(),
    })
    .strict(),
  definitions: {Route},
});
export type GenerateRoutesResult = InferJsonOutputSchema<
  typeof generateRoutesJsonOutputSchema
>;
