import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';
import {
  deploymentGid,
  storefrontGid,
  storeDomain,
  status,
  toStoreDomain,
  toUtcInstant,
  utcInstant,
} from '../json-contract.js';
import type {HydrogenStorefront as ApiStorefront} from '../graphql/admin/list-storefronts.js';
const Deployment = zod
  .object({
    gid: deploymentGid,
    createdAt: utcInstant,
    commitMessage: zod.string().nullable(),
  })
  .strict();
const Storefront = zod
  .object({
    gid: storefrontGid,
    name: zod.string(),
    productionUrl: zod.string().url().nullable(),
  })
  .strict()
  .describe(
    'All projected fields are present; unavailable productionUrl is null.',
  );
const StorefrontWithDeployment = Storefront.extend({
  currentProductionDeployment: Deployment.nullable(),
}).strict();
export function toStorefront(storefront: {
  id: string;
  title: string;
  productionUrl?: string | null;
}) {
  return {
    gid: storefront.id,
    name: storefront.title,
    productionUrl: storefront.productionUrl || null,
  };
}
export function toListResult({
  shop,
  storefronts,
}: {
  shop: string;
  storefronts: ApiStorefront[];
}) {
  return {
    storeDomain: toStoreDomain(shop),
    storefronts: storefronts.map((storefront) => ({
      ...toStorefront(storefront),
      currentProductionDeployment: storefront.currentProductionDeployment
        ? {
            gid: storefront.currentProductionDeployment.id,
            createdAt: toUtcInstant(
              storefront.currentProductionDeployment.createdAt,
            ),
            commitMessage:
              storefront.currentProductionDeployment.commitMessage ?? null,
          }
        : null,
    })),
  };
}
export const listJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenListResult',
  schema: zod
    .object({storeDomain, storefronts: zod.array(StorefrontWithDeployment)})
    .strict()
    .describe('The complete list of Hydrogen storefronts for the store.'),
  definitions: {Storefront: StorefrontWithDeployment, Deployment},
});
export type ListResult = InferJsonOutputSchema<typeof listJsonOutputSchema>;
export const linkJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenLinkResult',
  schema: zod
    .object({
      status,
      changed: zod.boolean(),
      storeDomain,
      storefront: Storefront.nullable(),
    })
    .strict(),
  definitions: {Storefront},
});
export type LinkResult = InferJsonOutputSchema<typeof linkJsonOutputSchema>;
export const unlinkJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenUnlinkResult',
  schema: zod
    .object({
      status: zod.literal('success'),
      changed: zod.boolean(),
      storefront: zod
        .object({gid: storefrontGid, name: zod.string()})
        .strict()
        .nullable(),
    })
    .strict(),
});
export type UnlinkResult = InferJsonOutputSchema<typeof unlinkJsonOutputSchema>;
