import path from 'path';
import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {Flags} from '@oclif/core';
import {getProjectPaths, getRemixConfig} from '../../lib/remix-config.js';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {codegen} from '../../lib/codegen.js';

export default class Codegen extends Command {
  static descriptionWithMarkdown =
    'Automatically generates GraphQL types for your project’s Storefront API queries.';

  static description =
    'Generate types for the Storefront API queries found in your project.';
  static flags = {
    ...commonFlags.path,
    'codegen-config-path': Flags.string({
      description:
        'Specify a path to a codegen configuration file. Defaults to `<root>/codegen.ts` if it exists.',
      required: false,
    }),
    'force-sfapi-version': Flags.string({
      description:
        'Force generating Storefront API types for a specific version instead of using the one provided in Hydrogen. A token can also be provided with this format: `<version>:<token>`.',
      hidden: true,
    }),
    watch: Flags.boolean({
      description:
        'Watch the project for changes to update types on file save.',
      required: false,
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Codegen);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    await runCodegen({
      ...flagsToCamelObject(flags),
      directory,
    });
  }
}

export async function runCodegen({
  directory,
  codegenConfigPath,
  forceSfapiVersion,
  watch,
}: {
  directory?: string;
  codegenConfigPath?: string;
  forceSfapiVersion?: string;
  watch?: boolean;
}) {
  const {root} = getProjectPaths(directory);
  const remixConfig = await getRemixConfig(root);

  console.log(''); // New line

  const generatedFiles = await codegen({
    ...remixConfig,
    configFilePath: codegenConfigPath,
    forceSfapiVersion,
    watch,
  });

  if (!watch) {
    renderSuccess({
      headline: 'Generated types for GraphQL:',
      body: {
        list: {
          items: Object.entries(generatedFiles).map(
            ([key, value]) =>
              key +
              '\n' +
              value.map((item) => colors.dim(`- ${item}`)).join('\n'),
          ),
        },
      },
    });
  }
}
