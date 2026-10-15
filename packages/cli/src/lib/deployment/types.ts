import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

const Deployment = zod
  .object({
    url: zod.string().url(),
    authBypassToken: zod.string().nullable(),
  })
  .strict();
export const deployJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenDeployResult',
  schema: zod
    .object({
      status: zod.enum(['success', 'cancelled']),
      deployment: Deployment.nullable(),
    })
    .strict()
    .describe(
      'The command result. The existing h2_deploy_log.json file retains Oxygen CompletedDeployment format, independently of this result.',
    ),
  definitions: {Deployment},
});
export type DeployResult = InferJsonOutputSchema<typeof deployJsonOutputSchema>;
