import {writeJsonResult, isJsonOutput} from '../../lib/json-output.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {codegenJsonOutputSchema} from '../../lib/codegen/types.js';
import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess} from '../../lib/ui.js';
import colors from '@shopify/cli-kit/node/colors';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {Flags} from '@oclif/core';
import {getProjectPaths, getRemixConfig} from '../../lib/remix-config.js';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {codegen} from '../../lib/codegen.js';

export default class Codegen extends Command {
  static get jsonOutputSchema(): typeof codegenJsonOutputSchema {
    return codegenJsonOutputSchema;
  }

  static descriptionWithMarkdown =
    'Automatically generates GraphQL types for your project’s Storefront API queries.';

  static description = this.descriptionForHelp();
  static flags = {
    ...jsonFlag,
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
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    if (flags.json && flags.watch)
      throw new AbortError(
        '--json cannot be combined with --watch. Run without --watch for a finite result.',
      );

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

  if (!isJsonOutput()) console.log(''); // New line

  const generatedFiles = await codegen({
    ...remixConfig,
    configFilePath: codegenConfigPath,
    forceSfapiVersion,
    watch,
  });

  const result = {generatedFiles};
  if (!watch && !writeJsonResult(codegenJsonOutputSchema, result)) {
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
  return result;
}
