import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const customerAccountPushJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenCustomerAccountPushResult',
  schema: zod.object({
    storefrontId: zod.string(),
    redirectUri: zod.string(),
    javascriptOrigin: zod.string(),
    logoutUri: zod.string(),
  }),
});
export type CustomerAccountPushResult = InferJsonOutputSchema<
  typeof customerAccountPushJsonOutputSchema
>;
