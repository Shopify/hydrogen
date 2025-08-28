import Command from '@shopify/cli-kit/node/base-command';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {commonFlags} from '../../../lib/flags.js';
import {Flags, Args} from '@oclif/core';

// Fix for a TypeScript bug:
// https://github.com/microsoft/TypeScript/issues/42873
import type {} from '@oclif/core/lib/interfaces/parser.js';
import {
  ALL_ROUTE_CHOICES,
  generateRoutes,
} from '../../../lib/setups/routes/generate.js';
import {isV1RouteConventionInstalled} from '../../../lib/remix-version-interop.js';

export default class GenerateRoute extends Command {
  static descriptionWithMarkdown = `Generates a set of default routes from the starter template.`;
  static description = 'Generates a standard Shopify route.';
  static flags = {
    adapter: Flags.string({
      description:
        'Adapter used in the route. The default is `react-router`.',
      env: 'SHOPIFY_HYDROGEN_FLAG_ADAPTER',
    }),
    typescript: Flags.boolean({
      description: 'Generate TypeScript files',
      env: 'SHOPIFY_HYDROGEN_FLAG_TYPESCRIPT',
    }),
    'locale-param': Flags.string({
      description:
        'The param name in Remix routes for the i18n locale, if any. Example: `locale` becomes ($locale).',
      env: 'SHOPIFY_HYDROGEN_FLAG_ADAPTER',
    }),
    ...commonFlags.force,
    ...commonFlags.path,
  };

  static hidden: true;

  static args = {
    routeName: Args.string({
      name: 'routeName',
      description: `The route to generate. One of ${ALL_ROUTE_CHOICES.join()}.`,
      required: true,
      options: ALL_ROUTE_CHOICES,
      env: 'SHOPIFY_HYDROGEN_ARG_ROUTE',
    }),
  };

  async run(): Promise<void> {
    const {
      flags,
      args: {routeName},
    } = await this.parse(GenerateRoute);

    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runGenerate({
      ...flags,
      directory,
      routeName,
      localePrefix: flags['locale-param'],
    });
  }
}

export async function runGenerate(options: {
  routeName: string;
  directory: string;
  adapter?: string;
  typescript?: boolean;
  force?: boolean;
  localePrefix?: string;
}) {
  const {routes} = await generateRoutes({
    ...options,
    v1RouteConvention: isV1RouteConventionInstalled(),
  });

  const padEnd =
    3 +
    routes.reduce(
      (acc, route) => Math.max(acc, route.destinationRoute.length),
      0,
    );

  const successfulGenerationCount = routes.filter(
    ({operation}) => operation !== 'skipped',
  ).length;

  renderSuccess({
    headline: `${successfulGenerationCount} of ${routes.length} route${
      routes.length > 1 ? 's' : ''
    } generated`,
    body: {
      list: {
        items: routes.map(
          ({operation, destinationRoute}) =>
            destinationRoute.padEnd(padEnd) + colors.dim(`[${operation}]`),
        ),
      },
    },
  });
}
