import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const loginJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenLoginResult',
  schema: zod.object({
    shop: zod.string(),
    shopName: zod.string(),
    email: zod.string(),
  }),
});
export type LoginResult = InferJsonOutputSchema<typeof loginJsonOutputSchema>;
export const logoutJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenLogoutResult',
  schema: zod.object({loggedOut: zod.literal(true)}),
});
export type LogoutResult = InferJsonOutputSchema<typeof logoutJsonOutputSchema>;
