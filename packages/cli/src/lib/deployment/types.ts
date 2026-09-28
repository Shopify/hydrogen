import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

const Deployment = zod.object({
  url: zod.string(),
  authBypassToken: zod.string().optional(),
});
export const deployJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenDeployResult',
  schema: Deployment.nullable(),
  definitions: {Deployment},
});
export type DeployResult = InferJsonOutputSchema<typeof deployJsonOutputSchema>;
