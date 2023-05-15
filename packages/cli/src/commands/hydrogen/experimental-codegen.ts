import path from 'path';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {getProjectPaths, getRemixConfig} from '../../lib/config.js';
import {commonFlags, flagsToCamelObject} from '../../lib/flags.js';
import {generateTypes, patchGqlPluck} from '../../lib/codegen.js';

export default class Codegen extends Command {
  static description =
    'Generate types automatically for the Storefront API queries.';
  static flags = {
    path: commonFlags.path,
    'codegen-config-path': Flags.string({
      description:
        ' Specify a path to a codegen configuration file. Defaults to `codegen.ts`.',
      required: false,
    }),
    watch: Flags.boolean({
      description: '',
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
  watch,
}: {
  path?: string;
  codegenConfigPath?: string;
  watch?: boolean;
}) {
  const {root} = getProjectPaths(appPath);
  const remixConfig = await getRemixConfig(root);

  await patchGqlPluck();

  await generateTypes({
    ...remixConfig,
    configFilePath: codegenConfigPath,
    watch,
  });
}
