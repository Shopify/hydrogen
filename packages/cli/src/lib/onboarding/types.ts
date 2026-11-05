import {
  defineJsonOutputSchema,
  type InferJsonOutputSchema,
} from '@shopify/cli-kit/node/json-output-schema';
import {zod} from '@shopify/cli-kit/node/schema';
import {absolutePath, status} from '../json-contract.js';
const Project = zod
  .object({
    name: zod.string(),
    directory: absolutePath,
    storefrontName: zod.string().nullable(),
    language: zod.enum(['js', 'ts']).nullable(),
    packageManager: zod.enum(['npm', 'pnpm', 'yarn', 'bun', 'unknown']),
    dependenciesInstalled: zod.boolean(),
    cssStrategy: zod
      .enum(['none', 'tailwind', 'vanilla-extract', 'css-modules', 'postcss'])
      .nullable(),
    i18n: zod.enum(['none', 'subfolders', 'domains', 'subdomains']).nullable(),
    routes: zod
      .record(zod.union([zod.string(), zod.array(zod.string())]))
      .nullable(),
  })
  .strict()
  .describe(
    'All projected fields are present; unavailable settings are null. Route values are relative route names.',
  );
export const initJsonOutputSchema = defineJsonOutputSchema({
  name: 'HydrogenInitResult',
  schema: zod
    .object({
      status,
      project: Project.nullable(),
      failures: zod.array(zod.enum(['dependencies', 'markets', 'routes'])),
    })
    .strict(),
  definitions: {Project},
});
export type InitResult = InferJsonOutputSchema<typeof initJsonOutputSchema>;
