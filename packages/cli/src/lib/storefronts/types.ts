import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

const Deployment = zod.object({
  id: zod.string(),
  createdAt: zod.string(),
  commitMessage: zod.string().nullable(),
});
const Storefront = zod.object({
  id: zod.string(),
  title: zod.string(),
  productionUrl: zod.string().nullish(),
  parsedId: zod.string().optional(),
});
const StorefrontWithDeployment = Storefront.extend({
  currentProductionDeployment: Deployment.nullable(),
});
export const listJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenListResult',
  schema: zod.object({
    shop: zod.string(),
    storefronts: zod.array(StorefrontWithDeployment),
  }),
  definitions: {Storefront: StorefrontWithDeployment, Deployment},
});
export type ListResult = InferJsonOutputSchema<typeof listJsonOutputSchema>;
export const linkJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenLinkResult',
  schema: zod.object({shop: zod.string(), storefront: Storefront.nullable()}),
  definitions: {Storefront},
});
export type LinkResult = InferJsonOutputSchema<typeof linkJsonOutputSchema>;
export const unlinkJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenUnlinkResult',
  schema: zod.object({
    unlinked: zod.boolean(),
    storefront: zod.object({id: zod.string(), title: zod.string()}).nullable(),
  }),
});
export type UnlinkResult = InferJsonOutputSchema<typeof unlinkJsonOutputSchema>;
