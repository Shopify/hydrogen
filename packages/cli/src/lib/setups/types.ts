import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';

export const setupJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenSetupResult',
  schema: zod.object({
    directory: zod.string(),
    name: zod.string(),
    location: zod.string(),
    i18n: zod.enum(['subfolders', 'domains', 'subdomains']).optional(),
    routes: zod.record(zod.array(zod.string())).optional(),
    shortcut: zod.boolean(),
  }),
});
export type SetupResult = InferJsonOutputSchema<typeof setupJsonOutputSchema>;
export const setupCssJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenSetupCssResult',
  schema: zod.object({
    status: zod.enum(['configured', 'built-in', 'cancelled']),
    directory: zod.string(),
    strategy: zod.enum([
      'tailwind',
      'vanilla-extract',
      'css-modules',
      'postcss',
    ]),
    files: zod.array(zod.string()),
    dependenciesInstalled: zod.boolean(),
    needsNpmReinstall: zod.boolean(),
  }),
});
export type SetupCssResult = InferJsonOutputSchema<
  typeof setupCssJsonOutputSchema
>;
export const setupMarketsJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenSetupMarketsResult',
  schema: zod.object({
    directory: zod.string(),
    strategy: zod.enum(['subfolders', 'domains', 'subdomains']),
    serverEntryPoint: zod.string().optional(),
  }),
});
export type SetupMarketsResult = InferJsonOutputSchema<
  typeof setupMarketsJsonOutputSchema
>;
export const setupViteJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenSetupViteResult',
  schema: zod.object({
    directory: zod.string(),
    viteConfig: zod.string(),
    serverEntryPoint: zod.string(),
    dependenciesInstalled: zod.literal(true),
    needsMdxSetup: zod.boolean(),
  }),
});
export type SetupViteResult = InferJsonOutputSchema<
  typeof setupViteJsonOutputSchema
>;
