import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {storefrontGid} from '../json-contract.js';
import {zod} from '@shopify/cli-kit/node/schema';

export const customerAccountPushJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenCustomerAccountPushResult',
  schema: zod
    .object({
      storefrontGid,
      redirectUri: zod.string().url(),
      javascriptOrigin: zod.string().url(),
      logoutUri: zod.string().url(),
    })
    .strict(),
});
export type CustomerAccountPushResult = InferJsonOutputSchema<
  typeof customerAccountPushJsonOutputSchema
>;
