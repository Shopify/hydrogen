import {fileURLToPath} from 'url';
import Command from '@shopify/cli-kit/node/base-command';
import {ui} from '@shopify/cli-kit';
import {file, path} from '@shopify/cli-kit';
import {AbortError} from '@shopify/cli-kit/node/error';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../../utils/flags.js';
import Flags from '@oclif/core/lib/flags.js';
import {
  format,
  transpileFile,
  resolveFormatConfig,
} from '../../../utils/transpile-ts.js';
import {getRemixConfig, isRemixV2} from '../../../utils/config.js';

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

  static args = [
    {
      name: 'route',
      description: `The route to generate. One of ${ROUTES.join()}.`,
      required: true,
      options: ROUTES,
      env: 'SHOPIFY_HYDROGEN_ARG_ROUTE',
    },
  ];

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

    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    const isTypescript =
      flags.typescript ||
      (await file.exists(path.join(directory, 'tsconfig.json')));

    const routesArray = Array.isArray(routePath) ? routePath : [routePath];

    try {
      const {isV2Meta, isV2RouteConvention} = await getV2Flags(directory);

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
            isV2Meta,
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
    isV2Meta,
  }: {
    directory: string;
    typescript?: boolean;
    force?: boolean;
    adapter?: string;
    templatesRoot?: string;
    isV2Meta?: boolean;
  },
): Promise<Result> {
  let operation;
  const extension = typescript ? '.tsx' : '.jsx';
  const templatePath = path.join(
    templatesRoot,
    GENERATOR_TEMPLATES_DIR,
    'routes',
    `${routeFrom}.tsx`,
  );
  const destinationPath = path.join(
    directory,
    'app',
    'routes',
    `${routeTo}${extension}`,
  );
  const relativeDestinationPath = path.relative(directory, destinationPath);

  if (!force && (await file.exists(destinationPath))) {
    const options = [
      {name: 'No', value: 'skip'},
      {name: `Yes`, value: 'overwrite'},
    ];

    const choice = await ui.prompt([
      {
        type: 'select',
        name: 'value',
        message: `The file ${path.relativize(
          relativeDestinationPath,
        )} already exists. Do you want to overwrite it?`,
        choices: options,
      },
    ]);

    operation = choice.value === 'skip' ? 'skipped' : 'overwritten';

    if (operation === 'skipped') {
      return {operation};
    }
  } else {
    operation = 'generated';
  }

  let templateContent = await file.read(templatePath);

  templateContent = isV2Meta
    ? convertToMetaV2(templateContent)
    : convertToMetaV1(templateContent);

  // If the project is not using TypeScript, we need to compile the template
  // to JavaScript. We try to read the project's jsconfig.json, but if it
  // doesn't exist, we use a default configuration.
  if (!typescript) {
    const jsConfigPath = path.join(directory, 'jsconfig.json');
    const config = (await file.exists(jsConfigPath))
      ? JSON.parse(
          (await file.read(jsConfigPath, {encoding: 'utf8'})).replace(
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
  if (!(await file.exists(path.dirname(destinationPath)))) {
    await file.mkdir(path.dirname(destinationPath));
  }
  // Write the final file to the user's project.
  await file.write(destinationPath, templateContent);

  return {
    operation: operation as 'generated' | 'overwritten',
  };
}

async function getV2Flags(root: string) {
  const isV2 = isRemixV2();
  const futureFlags = {
    ...(!isV2 && (await getRemixConfig(root)).future),
  };

  return {
    isV2Meta: isV2 || !!futureFlags.v2_meta,
    isV2RouteConvention: isV2 || !!futureFlags.v2_routeConvention,
  };
}

export function convertRouteToV2(route: string) {
  return route.replace(/\/index$/, '/_index').replace(/(?<!^)\//g, '.');
}

function convertToMetaV2(template: string) {
  return template
    .replace(/type MetaFunction\s*,?/, '')
    .replace(/export const meta:.+?\n};/s, '')
    .replace(/const metaV2:/, 'const meta:');
}

function convertToMetaV1(template: string) {
  return template
    .replace(/type V2_MetaFunction\s*,?/, '')
    .replace(/export const metaV2:.+?\n};/s, '');
}
