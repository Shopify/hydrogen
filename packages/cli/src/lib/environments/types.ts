import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';
import {
  absolutePath,
  environmentGid,
  storefrontGid,
  status,
  toUtcInstant,
  utcInstant,
} from '../json-contract.js';
import type {Environment as ApiEnvironment} from '../graphql/admin/list-environments.js';

export const Environment = zod
  .object({
    gid: environmentGid,
    name: zod.string(),
    handle: zod.string(),
    branch: zod.string().nullable(),
    createdAt: utcInstant,
    type: zod
      .string()
      .describe(
        'Upstream environment type; known values are PREVIEW, PRODUCTION, CUSTOM.',
      ),
    url: zod.string().url().nullable(),
  })
  .strict();
export function toEnvironment(environment: ApiEnvironment) {
  return {
    gid: environment.id,
    name: environment.name,
    handle: environment.handle,
    branch: environment.branch ?? null,
    createdAt: toUtcInstant(environment.createdAt),
    type: environment.type,
    url: environment.url || null,
  };
}
const Variable = zod
  .object({
    name: zod.string(),
    id: zod
      .string()
      .regex(/^\d+$/)
      .describe(
        'The decimal HydrogenStorefrontEnvironmentVariable ID, not a GID.',
      )
      .optional(),
    isSecret: zod.boolean().optional(),
    readOnly: zod.boolean().optional(),
  })
  .strict()
  .describe(
    'Metadata only: variable spelling is preserved and values are never included. Unknown metadata is omitted.',
  );
const Storefront = zod
  .object({
    gid: storefrontGid,
    name: zod.string(),
    productionUrl: zod.string().url().nullable(),
  })
  .strict();
export const envListJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenEnvListResult',
  schema: zod
    .object({
      status,
      storefront: Storefront.nullable(),
      environments: zod.array(Environment),
    })
    .strict()
    .describe('The complete environment list for the linked storefront.'),
  definitions: {Environment, Storefront},
});
export type EnvListResult = InferJsonOutputSchema<
  typeof envListJsonOutputSchema
>;
export const envPullJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenEnvPullResult',
  schema: zod
    .object({
      status,
      changed: zod.boolean(),
      path: absolutePath,
      storefrontGid: storefrontGid.nullable(),
      storefrontName: zod.string().nullable(),
      environment: zod.string().nullable(),
      variables: zod.array(Variable),
    })
    .strict()
    .describe(
      'The dotenv file keeps its native format. The result reports variable metadata without values.',
    ),
  definitions: {Variable},
});
export type EnvPullResult = InferJsonOutputSchema<
  typeof envPullJsonOutputSchema
>;
export const envPushJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenEnvPushResult',
  schema: zod
    .object({
      status,
      changed: zod.boolean(),
      dryRun: zod.boolean(),
      path: absolutePath,
      environment: Environment.nullable(),
      variables: zod.array(Variable),
      skipped: zod.array(Variable),
    })
    .strict(),
  definitions: {Environment, Variable},
});
export type EnvPushResult = InferJsonOutputSchema<
  typeof envPushJsonOutputSchema
>;
