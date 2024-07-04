import { resolvePath } from '@shopify/cli-kit/node/path';
import { commonFlags, flagsToCamelObject } from '../../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import { renderTasks, renderSuccess } from '@shopify/cli-kit/node/ui';
import { Args } from '@oclif/core';
import { getRemixConfig } from '../../../lib/remix-config.js';
import { SETUP_I18N_STRATEGIES, renderI18nPrompt, setupI18nStrategy, I18N_STRATEGY_NAME_MAP } from '../../../lib/setups/i18n/index.js';

class SetupMarkets extends Command {
  static descriptionWithMarkdown = "Adds support for multiple [markets](https://shopify.dev/docs/custom-storefronts/hydrogen/markets) to your project by using the URL structure.";
  static description = "Setup support for multiple markets in your project.";
  static flags = {
    ...commonFlags.path
  };
  static args = {
    strategy: Args.string({
      name: "strategy",
      description: `The URL structure strategy to setup multiple markets. One of ${SETUP_I18N_STRATEGIES.join()}`,
      options: SETUP_I18N_STRATEGIES
    })
  };
  async run() {
    const { flags, args } = await this.parse(SetupMarkets);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();
    await runSetupMarkets({
      ...flagsToCamelObject(flags),
      strategy: args.strategy,
      directory
    });
  }
}
async function runSetupMarkets({
  strategy: flagStrategy,
  directory
}) {
  const remixConfigPromise = getRemixConfig(directory);
  const strategy = flagStrategy ? flagStrategy : await renderI18nPrompt();
  const remixConfig = await remixConfigPromise;
  await renderTasks([
    {
      title: "Updating files",
      task: async () => {
        await setupI18nStrategy(strategy, remixConfig);
      }
    }
  ]);
  renderSuccess({
    headline: `Makerts support setup complete with strategy ${I18N_STRATEGY_NAME_MAP[strategy].toLocaleLowerCase()}.`,
    body: `You can now modify the supported locales in ${remixConfig.serverEntryPoint ?? "your server entry file."}
`
  });
}

export { SetupMarkets as default, runSetupMarkets };
