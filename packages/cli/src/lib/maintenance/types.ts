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
      status: zod.literal('success'),
      changed: zod.boolean(),
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
const upgradeFields = () =>
  zod.object({
    status: zod.literal('success'),
    directory: absolutePath,
    previousVersion: zod.string(),
    version: zod.string(),
  });
export const upgradeJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenUpgradeResult',
  definitions: {AbsolutePath: absolutePath},
  schema: zod
    .discriminatedUnion('changed', [
      upgradeFields()
        .extend({
          changed: zod.literal(true),
          packages: zod.array(zod.string()),
          removedPackages: zod.array(zod.string()),
          instructionsPath: absolutePath.nullable(),
        })
        .strict(),
      upgradeFields()
        .extend({
          changed: zod.literal(false),
          packages: zod.array(zod.string()).length(0),
          removedPackages: zod.array(zod.string()).length(0),
          instructionsPath: zod.null(),
        })
        .strict(),
    ])
    .refine(
      (result) => result.changed || result.version === result.previousVersion,
      {
        message: 'An unchanged upgrade must keep the previous version.',
        path: ['version'],
      },
    ),
});
export type UpgradeResult = InferJsonOutputSchema<
  typeof upgradeJsonOutputSchema
>;
