import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const shortcutJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenShortcutResult',
  schema: zod.object({
    alias: zod.string(),
    shells: zod.array(zod.string()).min(1),
  }),
});
export type ShortcutResult = InferJsonOutputSchema<
  typeof shortcutJsonOutputSchema
>;
export const upgradeJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenUpgradeResult',
  schema: zod.object({
    status: zod.enum(['upgraded', 'unchanged']),
    directory: zod.string(),
    currentVersion: zod.string(),
    version: zod.string(),
    packages: zod.array(zod.string()),
    removedPackages: zod.array(zod.string()),
    instructionsFile: zod.string().optional(),
  }),
});
export type UpgradeResult = InferJsonOutputSchema<
  typeof upgradeJsonOutputSchema
>;
