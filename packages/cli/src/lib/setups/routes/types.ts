import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const Route = zod
  .object({
    sourceRoute: zod.string(),
    destinationRoute: zod.string(),
    operation: zod.enum(['created', 'skipped', 'replaced']),
    skipReason: zod.enum(['declined', 'exists']).optional(),
  })
  .strict();
export const generateRoutesJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenGenerateRoutesResult',
  schema: zod
    .object({
      status: zod.enum(['success', 'skipped']),
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

export type GeneratedRoute = zod.infer<typeof Route>;
