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
  generateMultipleRoutes,
} from '../../../lib/setups/routes/generate.js';

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
    });
  }
}

export async function runGenerate(options: {
  routeName: string;
  directory: string;
  adapter?: string;
  typescript?: boolean;
  force?: boolean;
}) {
  const {routes} = await generateMultipleRoutes(options);

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
