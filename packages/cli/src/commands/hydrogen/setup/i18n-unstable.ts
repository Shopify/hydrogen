import {resolvePath} from '@shopify/cli-kit/node/path';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderSelectPrompt,
  renderSuccess,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {Args} from '@oclif/core';
import {getRemixConfig} from '../../../lib/config.js';
import {
  setupI18nStrategy,
  SETUP_I18N_STRATEGIES,
  type I18nStrategy,
} from '../../../lib/setups/i18n/index.js';

export const I18N_STRATEGY_NAME_MAP: Record<I18nStrategy, string> = {
  pathname: 'Pathname (example.com/fr-ca/...)',
  subdomains: 'Subdomains (de.example.com/...)',
  domains: 'Top-level Domains (example.jp/...)',
};

export default class SetupI18n extends Command {
  static description =
    'Setup internationalization strategies for your project.';

  static hidden = true;

  static flags = {
    path: commonFlags.path,
    force: commonFlags.force,
  };

  static args = {
    strategy: Args.string({
      name: 'strategy',
      description: `The internationalization strategy to setup. One of ${SETUP_I18N_STRATEGIES.join()}`,
      options: SETUP_I18N_STRATEGIES as unknown as string[],
    }),
  };

  async run(): Promise<void> {
    const {flags, args} = await this.parse(SetupI18n);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runSetupI18n({
      ...flagsToCamelObject(flags),
      strategy: args.strategy as I18nStrategy,
      directory,
    });
  }
}

export async function runSetupI18n({
  strategy,
  directory,
  force = false,
}: {
  strategy?: I18nStrategy;
  directory: string;
  force?: boolean;
}) {
  if (!strategy) {
    strategy = await renderSelectPrompt<I18nStrategy>({
      message: `Select an internationalization strategy`,
      choices: SETUP_I18N_STRATEGIES.map((strategy) => ({
        label: I18N_STRATEGY_NAME_MAP[strategy],
        value: strategy,
      })),
    });
  }

  const remixConfig = await getRemixConfig(directory);

  const setupOutput = await setupI18nStrategy(strategy, remixConfig);
  if (!setupOutput) return;

  const {workPromise} = setupOutput;

  await renderTasks([
    {
      title: 'Updating files',
      task: async () => {
        await workPromise;
      },
    },
  ]);

  renderSuccess({
    headline: `Internationalization setup complete with strategy ${I18N_STRATEGY_NAME_MAP[
      strategy
    ].toLocaleLowerCase()}.`,
    body: `You can now modify the supported locales in ${
      remixConfig.serverEntryPoint ?? 'your server entry file.'
    }\n`,
  });
}
