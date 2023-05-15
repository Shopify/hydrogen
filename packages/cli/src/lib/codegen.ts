import {
  generate,
  loadCodegenConfig,
  type LoadCodegenConfigResult,
} from '@graphql-codegen/cli';
import {schema, preset, pluckConfig} from '@shopify/hydrogen-codegen';
import {format, resolveFormatConfig} from './transpile-ts.js';

export {patchGqlPluck} from '@shopify/hydrogen-codegen';

type ProjectDirs = {
  rootDirectory: string;
  appDirectory: string;
};

type CodegenOptions = ProjectDirs & {
  configFilePath?: string;
  watch?: boolean;
};

export async function generateTypes({
  configFilePath,
  watch,
  ...dirs
}: CodegenOptions) {
  const {config: codegenConfig} =
    // Load <root>/codegen.ts if available
    (await loadCodegenConfig({
      configFilePath,
      searchPlaces: [dirs.rootDirectory],
    })) ||
    // Fall back to default config
    generateDefaultConfig(dirs);

  await addHooksToHydrogenOptions(codegenConfig, dirs);

  await generate(
    {
      ...codegenConfig,
      cwd: dirs.rootDirectory,
      watch,
      // Note: do not use `silent` here, it will swallow errors and
      // won't hide all logs. `errorsOnly` flag doesn't work either.
    },
    true,
  );
}

function generateDefaultConfig({rootDirectory, appDirectory}: ProjectDirs) {
  const tsDefaultGlob = '*!(*.d).{ts,tsx}'; // No d.ts files
  const appDirRelative = appDirectory
    .replace(rootDirectory, '')
    .replaceAll('/', '');

  return {
    filepath: 'virtual:codegen',
    config: {
      overwrite: true,
      pluckConfig: pluckConfig as any,
      generates: {
        ['sfapi.generated.d.ts']: {
          preset,
          schema,
          documents: [
            `${tsDefaultGlob}`, // E.g. ./server.ts
            `${appDirRelative}/**/${tsDefaultGlob}`, // E.g. app/routes/_index.tsx
          ],
        },
      },
    },
  };
}

async function addHooksToHydrogenOptions(
  codegenConfig: LoadCodegenConfigResult['config'],
  {rootDirectory}: ProjectDirs,
) {
  const [, options] =
    Object.entries(codegenConfig.generates).find(
      ([, value]) =>
        (Array.isArray(value) ? value[0] : value)?.schema === schema,
    ) || [];

  const hydrogenOptions = Array.isArray(options) ? options[0] : options;

  if (hydrogenOptions) {
    const formatConfig = await resolveFormatConfig(rootDirectory);

    hydrogenOptions.hooks = {
      beforeOneFileWrite: (file, content) =>
        format(content, formatConfig, file), // Run Prettier before writing files
      ...hydrogenOptions.hooks,
    };
  }
}
