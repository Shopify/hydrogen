import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {formatCode, getCodeFormatOptions} from './format-code.js';
import {renderFatalError, renderWarning} from '@shopify/cli-kit/node/ui';
import {joinPath, relativePath, basename} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';

// Do not import code synchronously from this dependency, it must be patched first
import type {LoadCodegenConfigResult} from '@graphql-codegen/cli';
import type {GraphQLConfig} from 'graphql-config';

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
        skipOclifErrorHandling: true,
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
  await import('@shopify/hydrogen-codegen/patch').catch((error: Error) => {
    throw new AbortError(
      `Failed to patch dependencies for codegen.\n${error.stack}`,
      'Please report this issue.',
    );
  });

  return generateTypes(options).catch((error: Error) => {
    const {message, details} = normalizeCodegenError(
      error.message,
      options.rootDirectory,
    );

    throw new AbortError(message, details);
  });
}

async function generateTypes({
  watch,
  configFilePath,
  forceSfapiVersion,
  ...dirs
}: CodegenOptions) {
  const {generate, loadCodegenConfig, CodegenContext} = await import(
    '@graphql-codegen/cli'
  );

  const {config: codegenConfig} =
    // Load <root>/codegen.ts if available
    (await loadCodegenConfig({
      configFilePath,
      searchPlaces: [dirs.rootDirectory],
    })) ||
    // Fall back to default config
    (await generateDefaultConfig(dirs, forceSfapiVersion));

  await addHooksToHydrogenOptions(codegenConfig, dirs);

  const codegenContext = new CodegenContext({
    config: {
      ...codegenConfig,
      watch,
      // Note: do not use `silent` without `watch`, it will swallow errors and
      // won't hide all logs. `errorsOnly` flag doesn't work either.
      silent: !watch,

      // @ts-expect-error this is to avoid process.cwd() in tests
      cwd: dirs.rootDirectory,
    },
    // https://github.com/dotansimha/graphql-code-generator/issues/9490
    filepath: 'not-used-but-must-be-set',
  });

  codegenContext.cwd = dirs.rootDirectory;

  await generate(codegenContext, true);

  return Object.entries(codegenConfig.generates).reduce((acc, [key, value]) => {
    if ('documents' in value) {
      const documents = (
        Array.isArray(value.documents) ? value.documents : [value.documents]
      ).filter((document) => typeof document === 'string') as string[];

      acc[key] = documents;
    }

    return acc;
  }, {} as Record<string, string[]>);
}

async function generateDefaultConfig(
  {rootDirectory, appDirectory}: ProjectDirs,
  forceSfapiVersion?: string,
): Promise<LoadCodegenConfigResult> {
  const {getSchema, preset, pluckConfig} = await import(
    '@shopify/hydrogen-codegen'
  );

  const {loadConfig} = await import('graphql-config');
  const gqlConfig = await loadConfig({
    rootDir: rootDirectory,
    throwOnEmpty: false,
    throwOnMissing: false,
    legacy: false,
  }).catch(() => undefined);

  const sfapiSchema = getSchema('storefront');
  const sfapiProject = findGqlProject(sfapiSchema, gqlConfig);

  const defaultGlob = '*!(*.d).{ts,tsx,js,jsx}'; // No d.ts files
  const appDirRelative = relativePath(rootDirectory, appDirectory);

  return {
    filepath: 'virtual:codegen',
    config: {
      overwrite: true,
      pluckConfig: pluckConfig as any,
      generates: {
        ['storefrontapi.generated.d.ts']: {
          preset,
          schema: sfapiSchema,
          documents: sfapiProject?.documents ?? [
            defaultGlob, // E.g. ./server.(t|j)s
            joinPath(appDirRelative, '**', defaultGlob), // E.g. app/routes/_index.(t|j)sx
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

function findGqlProject(schemaFilepath: string, gqlConfig?: GraphQLConfig) {
  if (!gqlConfig) return;

  const schemaFilename = basename(schemaFilepath);
  return Object.values(gqlConfig.projects || {}).find(
    (project) =>
      typeof project.schema === 'string' &&
      project.schema.endsWith(schemaFilename),
  ) as GraphQLConfig['projects'][number];
}

async function addHooksToHydrogenOptions(
  codegenConfig: LoadCodegenConfigResult['config'],
  {rootDirectory}: ProjectDirs,
) {
  const {schema} = await import('@shopify/hydrogen-codegen');

  const [, options] =
    Object.entries(codegenConfig.generates).find(
      ([, value]) =>
        (Array.isArray(value) ? value[0] : value)?.schema === schema,
    ) || [];

  const hydrogenOptions = Array.isArray(options) ? options[0] : options;

  if (hydrogenOptions) {
    const formatConfig = await getCodeFormatOptions(rootDirectory);

    hydrogenOptions.hooks = {
      beforeOneFileWrite: (file: string, content: string) =>
        formatCode(content, formatConfig, file), // Run Prettier before writing files
      ...hydrogenOptions.hooks,
    };
  }
}
