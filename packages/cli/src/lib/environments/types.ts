import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const Environment = zod.object({
  id: zod.string(),
  name: zod.string(),
  handle: zod.string(),
  branch: zod.string().nullable(),
  createdAt: zod.string(),
  type: zod.enum(['PREVIEW', 'PRODUCTION', 'CUSTOM']),
  url: zod.string().nullable(),
});
const Variable = zod.object({
  id: zod.string(),
  key: zod.string(),
  isSecret: zod.boolean(),
  readOnly: zod.boolean(),
});
export const envListJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenEnvListResult',
  schema: zod
    .object({
      id: zod.string(),
      title: zod.string(),
      productionUrl: zod.string().nullable(),
      environments: zod.array(Environment),
    })
    .nullable(),
  definitions: {Environment},
});
export type EnvListResult = InferJsonOutputSchema<
  typeof envListJsonOutputSchema
>;
export const envPullJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenEnvPullResult',
  schema: zod.object({
    status: zod.enum(['pulled', 'unchanged', 'empty', 'cancelled']),
    file: zod.string(),
    storefrontId: zod.string().optional(),
    storefrontTitle: zod.string().optional(),
    environment: zod.string().optional(),
    variables: zod.array(Variable),
  }),
  definitions: {Variable},
});
export type EnvPullResult = InferJsonOutputSchema<
  typeof envPullJsonOutputSchema
>;
export const envPushJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenEnvPushResult',
  schema: zod.object({
    status: zod.enum(['pushed', 'unchanged', 'dry-run', 'cancelled']),
    file: zod.string(),
    environment: Environment.optional(),
    variables: zod.array(zod.string()),
    skipped: zod.array(zod.string()),
  }),
  definitions: {Environment},
});
export type EnvPushResult = InferJsonOutputSchema<
  typeof envPushJsonOutputSchema
>;
