import Command from '@shopify/cli-kit/node/base-command';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {commonFlags} from '../../../lib/flags.js';
import {Args} from '@oclif/core';

// Fix for a TypeScript bug:
// https://github.com/microsoft/TypeScript/issues/42873
import type {} from '@oclif/core/lib/interfaces/parser.js';
import {
  ALL_ROUTE_CHOICES,
  generateRoutes,
} from '../../../lib/setups/routes/generate.js';

export default class GenerateRoute extends Command {
  static description = 'Generates a standard Shopify route.';
  static flags = {
    adapter: commonFlags.adapter,
    typescript: commonFlags.typescript,
    force: commonFlags.force,
    path: commonFlags.path,
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

    await runGenerateRoute({
      ...flags,
      directory,
      routeName,
    });
  }
}

export async function runGenerateRoute(options: {
  routeName: string;
  directory: string;
  adapter?: string;
  typescript?: boolean;
  force?: boolean;
}) {
  const {routes} = await generateRoutes(options);

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
