import {fileURLToPath} from 'url';
import Command from '@shopify/cli-kit/node/base-command';
import {fileExists, readFile, writeFile, mkdir} from '@shopify/cli-kit/node/fs';
import {
  joinPath,
  dirname,
  resolvePath,
  relativePath,
  relativizePath,
} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  renderSuccess,
  renderConfirmationPrompt,
} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../../lib/flags.js';
import {Flags, Args} from '@oclif/core';
import {
  format,
  transpileFile,
  resolveFormatConfig,
} from '../../../lib/transpile-ts.js';
import {
  convertRouteToV2,
  convertTemplateToRemixVersion,
  getV2Flags,
  type RemixV2Flags,
} from '../../../lib/remix-version-interop.js';

export const GENERATOR_TEMPLATES_DIR = 'generator-templates';

// Fix for a TypeScript bug:
// https://github.com/microsoft/TypeScript/issues/42873
import type {} from '@oclif/core/lib/interfaces/parser.js';

const ROUTE_MAP: Record<string, string | string[]> = {
  home: '/index',
  page: '/pages/$pageHandle',
  cart: '/cart',
  products: '/products/$productHandle',
  collections: '/collections/$collectionHandle',
  policies: ['/policies/index', '/policies/$policyHandle'],
  robots: '/[robots.txt]',
  sitemap: '/[sitemap.xml]',
  account: ['/account/login', '/account/register'],
};

const ROUTES = [...Object.keys(ROUTE_MAP), 'all'];

interface Result {
  operation: 'generated' | 'skipped' | 'overwritten';
}

export default class GenerateRoute extends Command {
  static description = 'Generates a standard Shopify route.';
  static flags = {
    adapter: Flags.string({
      description:
        'Remix adapter used in the route. The default is `@shopify/remix-oxygen`.',
      env: 'SHOPIFY_HYDROGEN_FLAG_ADAPTER',
    }),
    typescript: Flags.boolean({
      description: 'Generate TypeScript files',
      env: 'SHOPIFY_HYDROGEN_FLAG_TYPESCRIPT',
    }),
    force: commonFlags.force,
    path: commonFlags.path,
  };

  static hidden: true;

  static args = {
    route: Args.string({
      name: 'route',
      description: `The route to generate. One of ${ROUTES.join()}.`,
      required: true,
      options: ROUTES,
      env: 'SHOPIFY_HYDROGEN_ARG_ROUTE',
    }),
  };

  async run(): Promise<void> {
    const result = new Map<string, Result>();
    const {
      flags,
      args: {route},
    } = await this.parse(GenerateRoute);

    const routePath =
      route === 'all'
        ? Object.values(ROUTE_MAP).flat()
        : ROUTE_MAP[route as keyof typeof ROUTE_MAP];

    if (!routePath) {
      throw new AbortError(
        `No route found for ${route}. Try one of ${ROUTES.join()}.`,
      );
    }

    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    const isTypescript =
      flags.typescript ||
      (await fileExists(joinPath(directory, 'tsconfig.json')));

    const routesArray = Array.isArray(routePath) ? routePath : [routePath];

    try {
      const {isV2RouteConvention, ...v2Flags} = await getV2Flags(directory);

      for (const item of routesArray) {
        const routeFrom = item;
        const routeTo = isV2RouteConvention ? convertRouteToV2(item) : item;

        result.set(
          routeTo,
          await runGenerate(routeFrom, routeTo, {
            directory,
            typescript: isTypescript,
            force: flags.force,
            adapter: flags.adapter,
            v2Flags,
          }),
        );
      }
    } catch (err: unknown) {
      throw new AbortError((err as Error).message);
    }

    const extension = isTypescript ? '.tsx' : '.jsx';

    const success = Array.from(result.values()).filter(
      (result) => result.operation !== 'skipped',
    );

    renderSuccess({
      headline: `${success.length} of ${result.size} route${
        result.size > 1 ? 's' : ''
      } generated`,
      body: {
        list: {
          items: Array.from(result.entries()).map(
            ([path, {operation}]) =>
              `[${operation}] app/routes${path}${extension}`,
          ),
        },
      },
    });
  }
}

export async function runGenerate(
  routeFrom: string,
  routeTo: string,
  {
    directory,
    typescript,
    force,
    adapter,
    templatesRoot = fileURLToPath(new URL('../../../', import.meta.url)),
    v2Flags = {},
  }: {
    directory: string;
    typescript?: boolean;
    force?: boolean;
    adapter?: string;
    templatesRoot?: string;
    v2Flags?: RemixV2Flags;
  },
): Promise<Result> {
  let operation;
  const extension = typescript ? '.tsx' : '.jsx';
  const templatePath = joinPath(
    templatesRoot,
    GENERATOR_TEMPLATES_DIR,
    'routes',
    `${routeFrom}.tsx`,
  );
  const destinationPath = joinPath(
    directory,
    'app',
    'routes',
    `${routeTo}${extension}`,
  );
  const relativeDestinationPath = relativePath(directory, destinationPath);

  if (!force && (await fileExists(destinationPath))) {
    const shouldOverwrite = await renderConfirmationPrompt({
      message: `The file ${relativizePath(
        relativeDestinationPath,
      )} already exists. Do you want to overwrite it?`,
      defaultValue: false,
    });

    operation = shouldOverwrite ? 'overwritten' : 'skipped';

    if (operation === 'skipped') {
      return {operation};
    }
  } else {
    operation = 'generated';
  }

  let templateContent = await readFile(templatePath);

  templateContent = convertTemplateToRemixVersion(templateContent, v2Flags);

  // If the project is not using TypeScript, we need to compile the template
  // to JavaScript. We try to read the project's jsconfig.json, but if it
  // doesn't exist, we use a default configuration.
  if (!typescript) {
    const jsConfigPath = joinPath(directory, 'jsconfig.json');
    const config = (await fileExists(jsConfigPath))
      ? JSON.parse(
          (await readFile(jsConfigPath, {encoding: 'utf8'})).replace(
            /^\s*\/\/.*$/gm,
            '',
          ),
        )
      : undefined;

    // We compile the template to JavaScript.
    templateContent = transpileFile(templateContent, config?.compilerOptions);
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
  templateContent = format(
    templateContent,
    await resolveFormatConfig(destinationPath),
    destinationPath,
  );

  // Create the directory if it doesn't exist.
  if (!(await fileExists(dirname(destinationPath)))) {
    await mkdir(dirname(destinationPath));
  }
  // Write the final file to the user's project.
  await writeFile(destinationPath, templateContent);

  return {
    operation: operation as 'generated' | 'overwritten',
  };
}
