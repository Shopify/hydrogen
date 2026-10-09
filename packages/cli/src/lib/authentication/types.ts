import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {storeDomain} from '../json-contract.js';
import {zod} from '@shopify/cli-kit/node/schema';

export const loginJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenLoginResult',
  schema: zod
    .object({
      storeDomain,
      name: zod.string().nullable(),
      email: zod.string().email().nullable(),
    })
    .strict(),
});
export type LoginResult = InferJsonOutputSchema<typeof loginJsonOutputSchema>;
export const logoutJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenLogoutResult',
  schema: zod
    .object({status: zod.literal('success'), loggedOut: zod.literal(true)})
    .strict(),
});
export type LogoutResult = InferJsonOutputSchema<typeof logoutJsonOutputSchema>;
