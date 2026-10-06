import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {absolutePath} from '../json-contract.js';
import {zod} from '@shopify/cli-kit/node/schema';

export const shortcutJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenShortcutResult',
  schema: zod
    .object({
      alias: zod.string(),
      shells: zod
        .array(
          zod.enum([
            'bash',
            'zsh',
            'fish',
            'powershell',
            'powershell-7',
            'cmd',
          ]),
        )
        .min(1),
    })
    .strict(),
});
export type ShortcutResult = InferJsonOutputSchema<
  typeof shortcutJsonOutputSchema
>;
export const upgradeJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenUpgradeResult',
  definitions: {AbsolutePath: absolutePath},
  schema: zod
    .object({
      status: zod.literal('success'),
      changed: zod.boolean(),
      directory: absolutePath,
      previousVersion: zod.string(),
      version: zod.string(),
      packages: zod.array(zod.string()),
      removedPackages: zod.array(zod.string()),
      instructionsPath: absolutePath.nullable(),
    })
    .strict(),
});
export type UpgradeResult = InferJsonOutputSchema<
  typeof upgradeJsonOutputSchema
>;
