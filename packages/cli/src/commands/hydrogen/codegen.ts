import {writeJsonResult, isJsonOutput} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {
  codegenJsonOutputSchema,
  codegenCommandOutputSchema,
} from '../../lib/codegen/types.js';
import Command from '../../lib/hydrogen-command.js';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {Flags} from '@oclif/core';
import {getProjectPaths, getRemixConfig} from '../../lib/remix-config.js';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {codegen, watchCodegen} from '../../lib/codegen.js';
import {runWatchCommand, writeWatchRecord} from '../../lib/watch.js';

export default class Codegen extends Command {
  static get jsonOutputSchema(): typeof codegenCommandOutputSchema {
    return codegenCommandOutputSchema;
  }

  static descriptionWithMarkdown =
    'Automatically generates GraphQL types for your project’s Storefront API queries. With `--json --watch`, emits JSONL lifecycle and generation records to stdout and diagnostics to stderr until stopped.';

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
  json = isJsonOutput(),
}: {
  directory?: string;
  codegenConfigPath?: string;
  forceSfapiVersion?: string;
  watch?: boolean;
  json?: boolean;
}) {
  const {root} = getProjectPaths(directory);
  const remixConfig = await getRemixConfig(root);

  if (json && watch) {
    const write = (
      record: import('../../lib/codegen/types.js').CodegenWatchRecord,
    ) => writeWatchRecord(codegenCommandOutputSchema, record);
    await runWatchCommand(async (signal) => {
      write({type: 'watch-started', directory: resolvePath(root)});
      await watchCodegen(
        {
          ...remixConfig,
          configFilePath: codegenConfigPath,
          forceSfapiVersion,
        },
        signal,
        write,
      );
      write({type: 'watch-stopped'});
    });
    return;
  }

  if (!json) console.log(''); // New line

  const generatedFiles = await codegen({
    ...remixConfig,
    configFilePath: codegenConfigPath,
    forceSfapiVersion,
    watch,
  });

  const result = {
    files: Object.entries(generatedFiles).map(([path, sources]) => ({
      path: resolvePath(root, path),
      sources,
    })),
  };
  if (!watch && !writeJsonResult(codegenJsonOutputSchema, result, json)) {
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
