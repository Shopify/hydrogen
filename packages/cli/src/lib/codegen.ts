import {
  generate,
  loadCodegenConfig,
  type LoadCodegenConfigResult,
} from '@graphql-codegen/cli';
import {
  schema,
  preset,
  pluckConfig,
  patchGqlPluck,
} from '@shopify/hydrogen-codegen';
import {format, resolveFormatConfig} from './transpile-ts.js';
import {renderFatalError, renderWarning} from '@shopify/cli-kit/node/ui';
import {joinPath} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const nodePath = process.argv[1];
const modulePath = fileURLToPath(import.meta.url);
const isStandaloneProcess = nodePath === modulePath;

if (isStandaloneProcess) {
  codegen({
    rootDirectory: process.argv[2]!,
    appDirectory: process.argv[3]!,
    configFilePath: process.argv[4],
    watch: true,
  });
}

function normalizeCodegenError(errorMessage: string, rootDirectory?: string) {
  const [first = '', ...rest] = errorMessage
    .replaceAll('[FAILED]', '')
    .replace(/\s{2,}/g, '\n')
    .replace(/\n,\n/, '\n')
    .trim()
    .split('\n');

  const message = '[Codegen] ' + first;

  let details = rest.join('\n');
  if (rootDirectory) {
    // Codegen CLI shows errors using forward slashes even on Windows.
    const forwardSlashRootDir = rootDirectory.replaceAll('\\', '/') + '/';
    details = details.replaceAll(forwardSlashRootDir, '');
  }

  return {message, details};
}

/**
 * Spawns a child process to run GraphlQL CLI Codegen.
 * Running on a separate process splits work from this processor
 * and also allows us to filter out logs.
 */
export function spawnCodegenProcess({
  rootDirectory,
  appDirectory,
  configFilePath,
}: CodegenOptions) {
  const child = spawn(
    'node',
    [
      fileURLToPath(import.meta.url),
      rootDirectory,
      appDirectory,
      configFilePath ?? '',
    ],
    {stdio: ['inherit', 'ignore', 'pipe']},
  );

  child.stderr.on('data', (data) => {
    const dataString: string =
      typeof data === 'string' ? data : data?.toString?.('utf8') ?? '';

    if (!dataString) return;

    const {message, details} = normalizeCodegenError(dataString, rootDirectory);

    console.log('');
    renderWarning({headline: message, body: details});
  });

  child.on('close', (code) => {
    if (code && code > 0) {
      renderFatalError({
        type: 0,
        name: 'CodegenError',
        message: `Codegen process exited with code ${code}`,
        tryMessage: 'Try restarting the dev server.',
      });

      process.exit(code);
    }
  });

  return child;
}

type ProjectDirs = {
  rootDirectory: string;
  appDirectory: string;
};

type CodegenOptions = ProjectDirs & {
  watch?: boolean;
  configFilePath?: string;
  forceSfapiVersion?: string;
};

export async function codegen(options: CodegenOptions) {
  await patchGqlPluck();

  try {
    return await generateTypes(options);
  } catch (error) {
    const {message, details} = normalizeCodegenError(
      (error as Error).message,
      options.rootDirectory,
    );

    throw new AbortError(message, details);
  }
}

async function generateTypes({
  watch,
  configFilePath,
  forceSfapiVersion,
  ...dirs
}: CodegenOptions) {
  const {config: codegenConfig} =
    // Load <root>/codegen.ts if available
    (await loadCodegenConfig({
      configFilePath,
      searchPlaces: [dirs.rootDirectory],
    })) ||
    // Fall back to default config
    generateDefaultConfig(dirs, forceSfapiVersion);

  await addHooksToHydrogenOptions(codegenConfig, dirs);

  await generate(
    {
      ...codegenConfig,
      cwd: dirs.rootDirectory,
      watch,
      // Note: do not use `silent` without `watch`, it will swallow errors and
      // won't hide all logs. `errorsOnly` flag doesn't work either.
      silent: !watch,
    },
    true,
  );

  return Object.keys(codegenConfig.generates);
}

function generateDefaultConfig(
  {rootDirectory, appDirectory}: ProjectDirs,
  forceSfapiVersion?: string,
): LoadCodegenConfigResult {
  const tsDefaultGlob = '*!(*.d).{ts,tsx}'; // No d.ts files

  return {
    filepath: 'virtual:codegen',
    config: {
      overwrite: true,
      pluckConfig: pluckConfig as any,
      generates: {
        ['storefrontapi.generated.d.ts']: {
          preset,
          schema,
          documents: [
            joinPath(rootDirectory, tsDefaultGlob), // E.g. ./server.ts
            joinPath(appDirectory, '**', tsDefaultGlob), // E.g. app/routes/_index.tsx
          ],

          ...(!!forceSfapiVersion && {
            presetConfig: {importTypes: false},
            schema: {
              [`https://hydrogen-preview.myshopify.com/api/${
                forceSfapiVersion.split(':')[0]
              }/graphql.json`]: {
                headers: {
                  'content-type': 'application/json',
                  'X-Shopify-Storefront-Access-Token':
                    forceSfapiVersion.split(':')[1] ??
                    '3b580e70970c4528da70c98e097c2fa0',
                },
              },
            },
            config: {
              defaultScalarType: 'string',
              scalars: {JSON: 'unknown'},
            },
          }),
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
      beforeOneFileWrite: (file: string, content: string) =>
        format(content, formatConfig, file), // Run Prettier before writing files
      ...hydrogenOptions.hooks,
    };
  }
}
