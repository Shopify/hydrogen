import {writeJsonResult} from '../../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {setupMarketsJsonOutputSchema} from '../../../lib/setups/types.js';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess, renderTasks} from '../../../lib/ui.js';
import {Args} from '@oclif/core';
import {getRemixConfig} from '../../../lib/remix-config.js';
import {
  setupI18nStrategy,
  SETUP_I18N_STRATEGIES,
  I18N_STRATEGY_NAME_MAP,
  type I18nStrategy,
  renderI18nPrompt,
} from '../../../lib/setups/i18n/index.js';

export default class SetupMarkets extends Command {
  static get jsonOutputSchema(): typeof setupMarketsJsonOutputSchema {
    return setupMarketsJsonOutputSchema;
  }

  static descriptionWithMarkdown =
    'Adds support for multiple [markets](https://shopify.dev/docs/custom-storefronts/hydrogen/markets) to your project by using the URL structure.';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
  };

  static args = {
    strategy: Args.string({
      name: 'strategy',
      description: `The URL structure strategy to setup multiple markets. One of ${SETUP_I18N_STRATEGIES.join()}`,
      options: SETUP_I18N_STRATEGIES as unknown as string[],
    }),
  };

  async run(): Promise<void> {
    const {flags, args} = await this.parse(SetupMarkets);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runSetupMarkets(
      {
        ...flagsToCamelObject(flags),
        strategy: args.strategy as I18nStrategy,
        directory,
      },
      flags.json,
    );
  }
}

export async function executeSetupMarkets({
  strategy: flagStrategy,
  directory,
}: {
  strategy?: I18nStrategy;
  directory: string;
}) {
  const remixConfigPromise = getRemixConfig(directory);

  const strategy = flagStrategy ? flagStrategy : await renderI18nPrompt();

  const remixConfig = await remixConfigPromise;

  await renderTasks([
    {
      title: 'Updating files',
      task: async () => {
        await setupI18nStrategy(strategy, remixConfig);
      },
    },
  ]);

  return {
    directory: remixConfig.rootDirectory,
    strategy,
    serverEntryPoint: remixConfig.serverEntryPoint,
  };
}

export async function runSetupMarkets(
  options: Parameters<typeof executeSetupMarkets>[0],
  json?: boolean,
) {
  const result = await executeSetupMarkets(options);
  if (!writeJsonResult(setupMarketsJsonOutputSchema, result, json))
    renderSetupMarkets(result);
  return result;
}

export function renderSetupMarkets({
  strategy,
  serverEntryPoint,
}: import('../../../lib/setups/types.js').SetupMarketsResult) {
  renderSuccess({
    headline: `Markets support setup complete with strategy ${I18N_STRATEGY_NAME_MAP[
      strategy
    ].toLowerCase()}.`,
    body: `You can now modify the supported locales in ${
      serverEntryPoint ?? 'your server entry file.'
    }\n`,
  });
}
