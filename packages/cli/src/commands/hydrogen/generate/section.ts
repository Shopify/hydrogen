import Command from '@shopify/cli-kit/node/base-command';
import {joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import {capitalize} from '@shopify/cli-kit/common/string';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../../lib/flags.js';
import {Args} from '@oclif/core';

import {generateProjectFile} from '../../../lib/setups/routes/generate.js';
import {getRemixConfig} from '../../../lib/config.js';

const ALL_COMPONENT_CHOICES = ['ImageText'];

export default class GenerateSection extends Command {
  static description = 'Generates a commerce component.';
  static flags = {
    adapter: commonFlags.adapter,
    typescript: commonFlags.typescript,
    force: commonFlags.force,
    path: commonFlags.path,
  };

  static hidden: true;

  static args = {
    componentName: Args.string({
      name: 'componentName',
      description: `The section to generate. One of ${ALL_COMPONENT_CHOICES.join()}.`,
      required: true,
      options: ALL_COMPONENT_CHOICES,
      env: 'SHOPIFY_HYDROGEN_ARG_SECTION',
    }),
  };

  async run(): Promise<void> {
    const {
      flags,
      args: {componentName},
    } = await this.parse(GenerateSection);

    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runGenerateComponent({
      ...flags,
      directory,
      componentName: capitalize(componentName.toLowerCase()),
    });
  }
}

interface GenerateComponentOptions {
  componentName: string;
  directory: string;
  adapter?: string;
  typescript?: boolean;
  force?: boolean;
}

export async function runGenerateComponent({
  componentName,
  directory,
  typescript,
  ...options
}: GenerateComponentOptions) {
  const remixConfig = await getRemixConfig(directory);
  const result = await generateProjectFile(
    joinPath('sections', componentName),
    {
      ...remixConfig,
      ...options,
      typescript: typescript ?? !!remixConfig.tsconfigPath,
    },
  );

  renderSuccess({
    headline: `Component ${componentName} generated`,
    body: {
      list: {
        items: [result.destinationRoute],
      },
    },
  });
}
