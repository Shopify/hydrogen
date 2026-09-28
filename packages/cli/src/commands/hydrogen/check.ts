import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {checkJsonOutputSchema} from '../../lib/check/types.js';
import Command from '../../lib/hydrogen-command.js';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {commonFlags} from '../../lib/flags.js';
import {getRemixConfig} from '../../lib/remix-config.js';
import {
  findMissingRoutes,
  findReservedRoutes,
  logMissingRoutes,
  warnReservedRoutes,
} from '../../lib/route-validator.js';

import {Args} from '@oclif/core';

export default class GenerateRoute extends Command {
  static get jsonOutputSchema(): typeof checkJsonOutputSchema {
    return checkJsonOutputSchema;
  }

  static descriptionWithMarkdown = `Checks whether your Hydrogen app includes a set of standard Shopify routes.`;

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
  };

  static args = {
    resource: Args.string({
      name: 'resource',
      description: `The resource to check. Currently only 'routes' is supported.`,
      required: true,
      options: ['routes'],
    }),
  };

  async run(): Promise<void> {
    const {flags, args} = await this.parse(GenerateRoute);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    if (args.resource === 'routes') {
      await runCheckRoutes({directory}, flags.json);
    } else {
      throw new Error('Invalid command argument.');
    }
  }
}

export async function runCheckRoutes(
  options: {directory: string},
  json?: boolean,
) {
  const result = await checkRoutes(options);
  if (!writeJsonResult(checkJsonOutputSchema, result, json)) {
    logMissingRoutes(result.missingRoutes);
    warnReservedRoutes(result.reservedRoutes);
  }
  return result;
}

export async function checkRoutes({
  directory,
}: {
  directory: string;
}): Promise<import('../../lib/check/types.js').CheckResult> {
  const remixConfig = await getRemixConfig(directory);
  return {
    missingRoutes: findMissingRoutes(remixConfig),
    reservedRoutes: findReservedRoutes(remixConfig),
  };
}
