import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {
  fileExists,
  readFile,
  writeFile,
  copyFile,
  mkdir,
} from '@shopify/cli-kit/node/fs';
import {
  joinPath,
  dirname,
  relativizePath,
  relativePath,
  resolvePath,
  basename,
} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortSignal} from '@shopify/cli-kit/node/abort';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';
import {transpileFile} from '../../transpile/index.js';
import {
  type FormatOptions,
  formatCode,
  getCodeFormatOptions,
} from '../../../lib/format-code.js';
import {
  GENERATOR_ROUTE_DIR,
  getSetupAssetDir,
  getStarterDir,
  getTemplateAppFile,
} from '../../../lib/build.js';
import {convertRouteToV1} from '../../../lib/remix-version-interop.js';
import {type RemixConfig, getRemixConfig} from '../../remix-config.js';
import {findFileWithExtension} from '../../file.js';

const NO_LOCALE_PATTERNS = [/robots\.txt/];

const ROUTE_MAP = {
  home: ['_index', '$'],
  page: 'pages*',
  cart: ['cart', 'cart.$lines', 'discount.$code'],
  products: 'products*',
  collections: 'collections*',
  policies: 'policies*',
  blogs: 'blogs*',
  account: 'account*',
  search: ['search', 'api.predictive-search'],
  robots: '[robots.txt]',
  sitemap: '[sitemap.xml]',
};

type RouteKey = keyof typeof ROUTE_MAP;

let allRouteTemplateFiles: string[] = [];
export async function getResolvedRoutes(
  routeKeys = Object.keys(ROUTE_MAP) as RouteKey[],
) {
  if (allRouteTemplateFiles.length === 0) {
    allRouteTemplateFiles = (
      await readdir(await getTemplateAppFile(GENERATOR_ROUTE_DIR))
    ).map((item) => item.replace(/\.tsx?$/, ''));
  }

  const routeGroups: Record<string, string[]> = {};
  const resolvedRouteFiles: string[] = [];

  for (const key of routeKeys) {
    routeGroups[key] = [];

    const value = ROUTE_MAP[key];

    if (!value) {
      throw new AbortError(
        `No route found for ${key}. Try one of ${ALL_ROUTE_CHOICES.join()}.`,
      );
    }

    const routes = Array.isArray(value) ? value : [value];

    for (const route of routes) {
      const routePrefix = route.replace('*', '');

      routeGroups[key]!.push(
        ...allRouteTemplateFiles.filter((file) => file.startsWith(routePrefix)),
      );
    }

    resolvedRouteFiles.push(...routeGroups[key]!);
  }

  return {routeGroups, resolvedRouteFiles};
}

export const ALL_ROUTE_CHOICES = [...Object.keys(ROUTE_MAP), 'all'];

type GenerateRoutesResult = {
  sourceRoute: string;
  destinationRoute: string;
  operation: 'created' | 'skipped' | 'replaced';
};

type GenerateRoutesOptions = Omit<
  GenerateProjectFileOptions,
  'localePrefix'
> & {
  routeName: string | string[];
  directory: string;
  localePrefix?: GenerateProjectFileOptions['localePrefix'] | false;
  v1RouteConvention?: boolean;
};

type RemixConfigParam = Pick<RemixConfig, 'rootDirectory' | 'appDirectory'>;

export async function generateRoutes(
  options: GenerateRoutesOptions,
  remixConfig?: RemixConfigParam,
) {
  const {routeGroups, resolvedRouteFiles} =
    options.routeName === 'all'
      ? await getResolvedRoutes()
      : await getResolvedRoutes([options.routeName as RouteKey]);

  const {rootDirectory, appDirectory} =
    remixConfig || (await getRemixConfig(options.directory));

  const routesArray = resolvedRouteFiles.flatMap(
    (item) => GENERATOR_ROUTE_DIR + '/' + item,
  );

  const formatOptions = await getCodeFormatOptions(rootDirectory);
  const routesDirectory = joinPath(appDirectory, GENERATOR_ROUTE_DIR);
  const localePrefix = await getLocalePrefix(routesDirectory, options);
  const typescript = !!(
    options.typescript ??
    (await fileExists(joinPath(rootDirectory, 'tsconfig.json')))
  );

  const routes: GenerateRoutesResult[] = [];
  for (const route of routesArray) {
    routes.push(
      await generateProjectFile(route, {
        ...options,
        typescript,
        localePrefix,
        rootDirectory,
        appDirectory,
        formatOptions,
      }),
    );
  }

  if (localePrefix) {
    await copyLocaleNamelessRoute({
      typescript,
      localePrefix,
      routesDirectory,
      formatOptions,
      adapter: options.adapter,
    });
  }

  return {
    routes,
    routeGroups,
    isTypescript: typescript,
    formatOptions,
  };
}

type GenerateProjectFileOptions = {
  typescript?: boolean;
  force?: boolean;
  adapter?: string;
  templatesRoot?: string;
  localePrefix?: string;
  signal?: AbortSignal;
};

/**
 * Find the '($locale)' prefix from the routes directory.
 * In V1, we check for the existence of a directory named `($...)`.
 * In V2, we check the home route for the presence of `($...)._index` in the filename.
 */
async function getLocalePrefix(
  routesDirectory: string,
  {localePrefix, routeName, v1RouteConvention}: GenerateRoutesOptions,
) {
  if (localePrefix) return localePrefix;
  if (localePrefix !== undefined || routeName === 'all') return;

  const existingFiles = await readdir(routesDirectory).catch(() => []);

  const coreRouteWithLocaleRE = v1RouteConvention
    ? /^\(\$(\w+)\)$/
    : /^\(\$(\w+)\)\.(_index|\$|cart).[jt]sx?$/;

  const coreRouteWithLocale = existingFiles.find((file) =>
    coreRouteWithLocaleRE.test(file),
  );

  if (coreRouteWithLocale) {
    return coreRouteWithLocale.match(coreRouteWithLocaleRE)?.[1];
  }
}

/**
 * Copies a template file to the destination directory, including
 * all its dependencies (imported files).
 */
export async function generateProjectFile(
  routeFrom: string,
  {
    rootDirectory,
    appDirectory,
    typescript,
    force,
    adapter,
    templatesRoot,
    formatOptions,
    localePrefix,
    v1RouteConvention = false,
    signal,
  }: GenerateProjectFileOptions & {
    rootDirectory: string;
    appDirectory: string;
    formatOptions?: FormatOptions;
    v1RouteConvention?: boolean;
  },
): Promise<GenerateRoutesResult> {
  templatesRoot ??= await getStarterDir();

  const extension = (routeFrom.match(/(\.[jt]sx?)$/) ?? [])[1] ?? '.tsx';
  routeFrom = routeFrom.replace(extension, '');

  const routeTemplatePath = await getTemplateAppFile(
    routeFrom + extension,
    templatesRoot,
  );
  const allFilesToGenerate = await findRouteDependencies(
    routeTemplatePath,
    await getTemplateAppFile('', templatesRoot),
  );

  const routeDestinationPath = joinPath(
    appDirectory,
    getDestinationRoute(routeFrom, localePrefix, {v1RouteConvention}) +
      (typescript ? extension : extension.replace('.ts', '.js')),
  );

  const result: GenerateRoutesResult = {
    operation: 'created',
    sourceRoute: routeFrom,
    destinationRoute: relativizePath(routeDestinationPath, rootDirectory),
  };

  if (!force && (await fileExists(routeDestinationPath))) {
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

  for (const filePath of allFilesToGenerate) {
    const isRoute = filePath.startsWith(GENERATOR_ROUTE_DIR + '/');
    const destinationPath = isRoute
      ? routeDestinationPath
      : joinPath(
          appDirectory,
          filePath.replace(/\.ts(x?)$/, `.${typescript ? 'ts$1' : 'js$1'}`),
        );

    // Create the directory if it doesn't exist.
    if (!(await fileExists(dirname(destinationPath)))) {
      await mkdir(dirname(destinationPath));
    }

    const templateAppFilePath = await getTemplateAppFile(
      filePath,
      templatesRoot,
    );

    if (!/\.[jt]sx?$/.test(filePath)) {
      // Nothing to transform for non-JS files.
      await copyFile(templateAppFilePath, destinationPath);
      continue;
    }

    let templateContent = await readFile(templateAppFilePath);

    // If the project is not using TS, we need to compile the template to JS.
    if (!typescript) {
      templateContent = await transpileFile(
        templateContent,
        templateAppFilePath,
      );
    }

    // If the command was run with an adapter flag, we replace the default
    // import with the adapter that was passed.
    if (adapter) {
      templateContent = replaceAdapters(templateContent, adapter);
    }

    // We format the template content with Prettier.
    // TODO use @shopify/cli-kit's format function once it supports TypeScript
    // templateContent = await file.format(templateContent, destinationPath);
    templateContent = await formatCode(
      templateContent,
      formatOptions,
      destinationPath,
    );

    // Write the final file to the user's project.
    await writeFile(destinationPath, templateContent);
  }

  return result;
}

function replaceAdapters(templateContent: string, adapter: string) {
  return templateContent.replace(/@shopify\/remix-oxygen/g, adapter);
}

/**
 * Find the destination path for a route file in the user project.
 */
function getDestinationRoute(
  routeFrom: string,
  localePrefix: string | undefined,
  options: {v1RouteConvention?: boolean},
) {
  const routePath = routeFrom.replace(GENERATOR_ROUTE_DIR + '/', '');
  const filePrefix =
    localePrefix &&
    !NO_LOCALE_PATTERNS.some((pattern) => pattern.test(routePath))
      ? `($${localePrefix})` + (options.v1RouteConvention ? '/' : '.')
      : '';

  return (
    GENERATOR_ROUTE_DIR +
    '/' +
    filePrefix +
    // The template file uses the v2 route convention, so we need to convert
    // it to v1 if the user is not using v2.
    (options.v1RouteConvention ? convertRouteToV1(routePath) : routePath)
  );
}

/**
 * Find all local files imported by a route file iteratively.
 */
async function findRouteDependencies(
  routeFilePath: string,
  appDirectory: string,
) {
  const filesToCheck = new Set([routeFilePath]);
  const fileDependencies = new Set([relativePath(appDirectory, routeFilePath)]);

  for (const filePath of filesToCheck) {
    // Find all imports and exports in the file
    const importMatches = (
      await readFile(filePath, {encoding: 'utf8'})
    ).matchAll(/^(import|export)\s+.*?\s+from\s+['"](.*?)['"];?$/gims);

    for (let [, , match] of importMatches) {
      // Skip imports that are not relative (local)
      if (!match || !/^(\.|~)/.test(match)) continue;

      // Remove querystrings
      match = match.replace(/\?[a-z.]+$/, '');

      // Resolve leading '~' to the app directory
      match = match.replace(
        '~', // import from '~/components/...'
        relativePath(dirname(filePath), appDirectory) || '.',
      );

      // Resolve extensionless imports to their JS/TS extension
      const resolvedMatchPath = resolvePath(dirname(filePath), match);
      const absoluteFilepath =
        (
          await findFileWithExtension(
            dirname(resolvedMatchPath),
            basename(resolvedMatchPath),
          )
        ).filepath || resolvedMatchPath;

      // Skip imports from other routes because these files
      // will be copied over directly by the generator
      if (!absoluteFilepath.includes(`/${GENERATOR_ROUTE_DIR}/`)) {
        fileDependencies.add(relativePath(appDirectory, absoluteFilepath));
        if (/\.[jt]sx?$/.test(absoluteFilepath)) {
          // Check for dependencies in the imported file if it's a TS/JS file
          filesToCheck.add(absoluteFilepath);
        }
      }
    }
  }

  return [...fileDependencies];
}

export async function renderRoutePrompt(options?: {abortSignal: AbortSignal}) {
  // TODO this should be a multi-select prompt
  const generateAll = await renderConfirmationPrompt({
    message:
      'Scaffold all standard route files? ' + Object.keys(ROUTE_MAP).join(', '),
    confirmationMessage: 'Yes',
    cancellationMessage: 'No',
    ...options,
  });

  return generateAll ? 'all' : ([] as string[]);
}

function copyLocaleNamelessRoute({
  typescript,
  localePrefix,
  ...options
}: {localePrefix: string} & Omit<
  RouteTemplateOptions,
  'templateName' | 'routeName'
>) {
  return copyRouteTemplate({
    ...options,
    typescript,
    templateName: 'locale-check.ts',
    routeName: `(\$${localePrefix})${typescript ? '.tsx' : '.jsx'}`,
  });
}

type RouteTemplateOptions = {
  routesDirectory: string;
  templateName: string;
  routeName: string;
  formatOptions?: FormatOptions;
} & Pick<GenerateProjectFileOptions, 'adapter' | 'typescript'>;

async function copyRouteTemplate({
  templateName,
  routeName,
  routesDirectory,
  formatOptions,
  typescript,
  adapter,
}: RouteTemplateOptions) {
  const routePath = joinPath(routesDirectory, routeName);
  if (await fileExists(routePath)) return;

  const templatePath = await getSetupAssetDir('routes', templateName);

  if (!(await fileExists(templatePath))) {
    throw new Error('Unknown strategy');
  }

  let templateContent = await readFile(templatePath);

  if (adapter) {
    templateContent = replaceAdapters(templateContent, adapter);
  }

  if (!typescript) {
    templateContent = await transpileFile(templateContent, templatePath);
  }

  templateContent = await formatCode(templateContent, formatOptions, routePath);

  await writeFile(routePath, templateContent);
}
