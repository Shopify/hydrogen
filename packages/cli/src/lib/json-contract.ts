import {isAbsolute, resolve} from 'node:path';
import {zod} from '@shopify/cli-kit/node/schema';

// CLI Kit uses forward slashes on Windows; public paths use native separators.
export const absolutePath = zod
  .string()
  .refine(isAbsolute, 'Expected an absolute native filesystem path')
  .transform((value) => resolve(value));
export const utcInstant = zod.string().datetime({precision: 0});
export const storefrontGid = zod
  .string()
  .regex(/^gid:\/\/shopify\/HydrogenStorefront\/\d+$/)
  .describe('A Shopify HydrogenStorefront GID.');
export const environmentGid = zod
  .string()
  .regex(/^gid:\/\/shopify\/HydrogenStorefrontEnvironment\/\d+$/)
  .describe('A Shopify HydrogenStorefrontEnvironment GID.');
export const deploymentGid = zod
  .string()
  .regex(/^gid:\/\/shopify\/HydrogenStorefrontDeployment\/\d+$/)
  .describe('A Shopify HydrogenStorefrontDeployment GID.');
export const status = zod.enum(['success', 'partial', 'skipped', 'cancelled']);
export const storeDomain = zod
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/)
  .nullable();

/** API instants can carry fractions and offsets; public instants are UTC whole seconds. */
export function toUtcInstant(value: string) {
  return new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Only a canonical Shopify store hostname is a storeDomain. */
export function toStoreDomain(value?: string | null) {
  const domain = value?.toLowerCase();
  return domain && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)
    ? domain
    : null;
}
