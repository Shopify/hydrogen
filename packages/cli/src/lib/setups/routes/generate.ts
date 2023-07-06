import {readdir} from 'fs/promises';
import {fileExists, readFile, writeFile, mkdir} from '@shopify/cli-kit/node/fs';
import {joinPath, dirname, relativizePath} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortSignal} from '@shopify/cli-kit/node/abort';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {
  transpileFile,
  type TranspilerOptions,
} from '../../../lib/transpile-ts.js';
import {
  type FormatOptions,
  formatCode,
  getCodeFormatOptions,
} from '../../../lib/format-code.js';
import {getRouteFile} from '../../../lib/build.js';
import {
  convertRouteToV2,
  convertTemplateToRemixVersion,
  getV2Flags,
  type RemixV2Flags,
} from '../../../lib/remix-version-interop.js';
import {getRemixConfig} from '../../../lib/config.js';

export const ROUTE_MAP: Record<string, string | string[]> = {
  home: 'index',
  page: 'pages/$pageHandle',
  cart: 'cart',
  products: 'products/$productHandle',
  collections: 'collections/$collectionHandle',
  policies: ['policies/index', 'policies/$policyHandle'],
  robots: '[robots.txt]',
  sitemap: '[sitemap.xml]',
  account: ['account/login', 'account/register'],
};

export const ALL_ROUTE_CHOICES = [...Object.keys(ROUTE_MAP), 'all'];

type GenerateMultipleRoutesResult = {
  sourceRoute: string;
  destinationRoute: string;
  operation: 'created' | 'skipped' | 'replaced';
};

type GenerateMultipleRoutesOptions = Omit<
  GenerateRouteOptions,
  'localePrefix'
> & {
  routeName: string | string[];
  directory: string;
  localePrefix?: GenerateRouteOptions['localePrefix'] | false;
};

export async function generateMultipleRoutes(
  options: GenerateMultipleRoutesOptions,
) {
  const routePath =
    options.routeName === 'all'
      ? Object.values(ROUTE_MAP).flat()
      : typeof options.routeName === 'string'
      ? ROUTE_MAP[options.routeName as keyof typeof ROUTE_MAP]
      : options.routeName
          .flatMap(
            (item: keyof typeof ROUTE_MAP) =>
              ROUTE_MAP[item as keyof typeof ROUTE_MAP] as string | string[],
          )
          .filter(Boolean);

  if (!routePath) {
    throw new AbortError(
      `No route found for ${
        options.routeName
      }. Try one of ${ALL_ROUTE_CHOICES.join()}.`,
    );
  }

  const {rootDirectory, appDirectory, future, tsconfigPath} =
    await getRemixConfig(options.directory);

  const routesArray = Array.isArray(routePath) ? routePath : [routePath];
  const v2Flags = await getV2Flags(rootDirectory, future);
  const formatOptions = await getCodeFormatOptions(rootDirectory);
  const localePrefix = await getLocalePrefix(appDirectory, options);
  const typescript = options.typescript ?? !!tsconfigPath;
  const transpilerOptions = typescript
    ? undefined
    : await getJsTranspilerOptions(rootDirectory);

  const routes: GenerateMultipleRoutesResult[] = [];
  for (const route of routesArray) {
    routes.push(
      await generateRoute(route, {
        ...options,
        typescript,
        localePrefix,
        rootDirectory,
        appDirectory,
        formatOptions,
        transpilerOptions,
        v2Flags,
      }),
    );
  }

  return {
    routes,
    isTypescript: typescript,
    transpilerOptions,
    v2Flags,
    formatOptions,
  };
}

type GenerateRouteOptions = {
  typescript?: boolean;
  force?: boolean;
  adapter?: string;
  templatesRoot?: string;
  localePrefix?: string;
  signal?: AbortSignal;
};

async function getLocalePrefix(
  appDirectory: string,
  {localePrefix, routeName}: GenerateMultipleRoutesOptions,
) {
  if (localePrefix) return localePrefix;
  if (localePrefix !== undefined || routeName === 'all') return;

  const existingFiles = await readdir(joinPath(appDirectory, 'routes')).catch(
    () => [],
  );

  const homeRouteWithLocaleRE = /^\(\$(\w+)\)\._index.[jt]sx?$/;
  const homeRouteWithLocale = existingFiles.find((file) =>
    homeRouteWithLocaleRE.test(file),
  );

  if (homeRouteWithLocale) {
    return homeRouteWithLocale.match(homeRouteWithLocaleRE)?.[1];
  }
}

export async function generateRoute(
  routeFrom: string,
  {
    rootDirectory,
    appDirectory,
    typescript,
    force,
    adapter,
    templatesRoot,
    transpilerOptions,
    formatOptions,
    localePrefix,
    v2Flags = {},
    signal,
  }: GenerateRouteOptions & {
    rootDirectory: string;
    appDirectory: string;
    transpilerOptions?: TranspilerOptions;
    formatOptions?: FormatOptions;
    v2Flags?: RemixV2Flags;
  },
): Promise<GenerateMultipleRoutesResult> {
  const filePrefix =
    localePrefix && !/\.(txt|xml)/.test(routeFrom)
      ? `($${localePrefix})` + (v2Flags.isV2RouteConvention ? '.' : '/')
      : '';

  const templatePath = getRouteFile(routeFrom, templatesRoot);
  const destinationPath = joinPath(
    appDirectory,
    'routes',
    filePrefix +
      (v2Flags.isV2RouteConvention ? convertRouteToV2(routeFrom) : routeFrom) +
      `.${typescript ? 'tsx' : 'jsx'}`,
  );

  const result: GenerateMultipleRoutesResult = {
    operation: 'created',
    sourceRoute: routeFrom,
    destinationRoute: relativizePath(destinationPath, rootDirectory),
  };

  if (!force && (await fileExists(destinationPath))) {
    const shouldOverwrite = await renderConfirmationPrompt({
      message: `The file ${result.destinationRoute} already exists. Do you want to replace it?`,
      defaultValue: false,
      confirmationMessage: 'Yes',
      cancellationMessage: 'No',
      abortSignal: signal,
    });

    if (!shouldOverwrite) return {...result, operation: 'skipped'};

    result.operation = 'replaced';
  }

  let templateContent = convertTemplateToRemixVersion(
    await readFile(templatePath),
    v2Flags,
  );

  // If the project is not using TS, we need to compile the template to JS.
  if (!typescript) {
    templateContent = transpileFile(templateContent, transpilerOptions);
  }

  // If the command was run with an adapter flag, we replace the default
  // import with the adapter that was passed.
  if (adapter) {
    templateContent = templateContent.replace(
      /@shopify\/remix-oxygen/g,
      adapter,
    );
  }

  // We format the template content with Prettier.
  // TODO use @shopify/cli-kit's format function once it supports TypeScript
  // templateContent = await file.format(templateContent, destinationPath);
  templateContent = formatCode(templateContent, formatOptions, destinationPath);

  // Create the directory if it doesn't exist.
  if (!(await fileExists(dirname(destinationPath)))) {
    await mkdir(dirname(destinationPath));
  }

  // Write the final file to the user's project.
  await writeFile(destinationPath, templateContent);

  return result;
}

async function getJsTranspilerOptions(rootDirectory: string) {
  const jsConfigPath = joinPath(rootDirectory, 'jsconfig.json');
  if (!(await fileExists(jsConfigPath))) return;

  return JSON.parse(
    (await readFile(jsConfigPath, {encoding: 'utf8'})).replace(
      /^\s*\/\/.*$/gm,
      '',
    ),
  )?.compilerOptions as undefined | TranspilerOptions;
}

export async function renderRoutePrompt(options?: {abortSignal: AbortSignal}) {
  const generateAll = await renderConfirmationPrompt({
    message:
      'Scaffold all standard route files? ' + Object.keys(ROUTE_MAP).join(', '),
    confirmationMessage: 'Yes',
    cancellationMessage: 'No',
    ...options,
  });

  return generateAll ? 'all' : ([] as string[]);
}
