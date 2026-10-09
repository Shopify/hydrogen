import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';
import {absolutePath, status} from '../json-contract.js';
export const setupJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenSetupResult',
  schema: zod
    .object({
      status: zod.literal('success'),
      changed: zod.boolean(),
      directory: absolutePath,
      name: zod.string(),
      i18n: zod.enum(['subfolders', 'domains', 'subdomains']).nullable(),
      routes: zod.record(zod.array(zod.string())).nullable(),
      shortcut: zod.boolean(),
    })
    .strict(),
});
export type SetupResult = InferJsonOutputSchema<typeof setupJsonOutputSchema>;
export const setupCssJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenSetupCssResult',
  definitions: {AbsolutePath: absolutePath},
  schema: zod
    .object({
      status,
      changed: zod.boolean(),
      directory: absolutePath,
      strategy: zod.enum([
        'tailwind',
        'vanilla-extract',
        'css-modules',
        'postcss',
      ]),
      filePaths: zod.array(absolutePath),
      dependenciesInstalled: zod.boolean(),
      needsNpmReinstall: zod.boolean(),
    })
    .strict(),
});
export type SetupCssResult = InferJsonOutputSchema<
  typeof setupCssJsonOutputSchema
>;
export const setupMarketsJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenSetupMarketsResult',
  definitions: {AbsolutePath: absolutePath},
  schema: zod
    .object({
      status: zod.literal('success'),
      changed: zod.literal(true),
      directory: absolutePath,
      strategy: zod.enum(['subfolders', 'domains', 'subdomains']),
      serverPath: absolutePath.nullable(),
    })
    .strict(),
});
export type SetupMarketsResult = InferJsonOutputSchema<
  typeof setupMarketsJsonOutputSchema
>;
export const setupViteJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenSetupViteResult',
  definitions: {AbsolutePath: absolutePath},
  schema: zod
    .object({
      status: zod.literal('success'),
      changed: zod.literal(true),
      directory: absolutePath,
      viteConfigPath: absolutePath,
      serverPath: absolutePath,
      dependenciesInstalled: zod.literal(true),
      needsMdxSetup: zod.boolean(),
    })
    .strict(),
});
export type SetupViteResult = InferJsonOutputSchema<
  typeof setupViteJsonOutputSchema
>;
