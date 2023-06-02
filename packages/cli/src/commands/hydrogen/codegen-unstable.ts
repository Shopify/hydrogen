import path from 'path';
import Command from '@shopify/cli-kit/node/base-command';
import {AbortError} from '@shopify/cli-kit/node/error';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {Flags} from '@oclif/core';
import {getProjectPaths, getRemixConfig} from '../../lib/config.js';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {
  generateTypes,
  normalizeCodegenError,
  patchGqlPluck,
} from '../../lib/codegen.js';

export default class Codegen extends Command {
  static description =
    'Generate types for the Storefront API queries found in your project.';
  static flags = {
    path: commonFlags.path,
    ['codegen-config-path']: Flags.string({
      description:
        'Specify a path to a codegen configuration file. Defaults to `<root>/codegen.ts` if it exists.',
      required: false,
    }),
    ['force-sfapi-version']: Flags.string({
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
      path: directory,
    });
  }
}

async function runCodegen({
  path: appPath,
  codegenConfigPath,
  forceSfapiVersion,
  watch,
}: {
  path?: string;
  codegenConfigPath?: string;
  forceSfapiVersion?: string;
  watch?: boolean;
}) {
  const {root} = getProjectPaths(appPath);
  const remixConfig = await getRemixConfig(root);

  await patchGqlPluck();

  try {
    const generatedFiles = await generateTypes({
      ...remixConfig,
      configFilePath: codegenConfigPath,
      forceSfapiVersion,
      watch,
    });

    if (!watch) {
      console.log('');
      renderSuccess({
        headline: 'Generated types for GraphQL:',
        body: generatedFiles.map((file) => `- ${file}`).join('\n'),
      });
    }
  } catch (error) {
    const {message, details} = normalizeCodegenError(
      (error as Error).message,
      remixConfig.rootDirectory,
    );

    console.log('');
    throw new AbortError(message, details);
  }
}
