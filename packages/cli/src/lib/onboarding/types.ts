import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const initJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenInitResult',
  schema: zod
    .object({
      location: zod.string(),
      name: zod.string(),
      directory: zod.string(),
      storefrontTitle: zod.string().optional(),
      language: zod.enum(['js', 'ts']).optional(),
      packageManager: zod.string(),
      depsInstalled: zod.boolean(),
      cssStrategy: zod.string().optional(),
      i18n: zod.string().optional(),
      routes: zod
        .record(zod.union([zod.string(), zod.array(zod.string())]))
        .optional(),
      failures: zod.array(zod.enum(['dependencies', 'markets', 'routes'])),
    })
    .nullable(),
});
export type InitResult = InferJsonOutputSchema<typeof initJsonOutputSchema>;
