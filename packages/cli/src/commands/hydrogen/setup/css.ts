import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  commonFlags,
  overrideFlag,
  flagsToCamelObject,
} from '../../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess, renderTasks} from '@shopify/cli-kit/node/ui';
import {
  getPackageManager,
  installNodeModules,
} from '@shopify/cli-kit/node/node-package-manager';
import {Args} from '@oclif/core';
import {
  setupCssStrategy,
  SETUP_CSS_STRATEGIES,
  CSS_STRATEGY_NAME_MAP,
  CSS_STRATEGY_HELP_URL_MAP,
  type CssStrategy,
  renderCssPrompt,
} from '../../../lib/setups/css/index.js';
import {getViteConfig} from '../../../lib/vite-config.js';
import {AbortError} from '@shopify/cli-kit/node/error';

export default class SetupCSS extends Command {
  static descriptionWithMarkdown =
    'Adds support for certain CSS strategies to your project.';

  static description = 'Setup CSS strategies for your project.';

  static flags = {
    ...commonFlags.path,
    ...commonFlags.force,
    ...overrideFlag(commonFlags.installDeps, {'install-deps': {default: true}}),
  };

  static args = {
    strategy: Args.string({
      name: 'strategy',
      description: `The CSS strategy to setup. One of ${SETUP_CSS_STRATEGIES.join()}`,
      options: SETUP_CSS_STRATEGIES as unknown as string[],
    }),
  };

  async run(): Promise<void> {
    const {flags, args} = await this.parse(SetupCSS);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runSetupCSS({
      ...flagsToCamelObject(flags),
      strategy: args.strategy as CssStrategy,
      directory,
    });
  }
}

export async function runSetupCSS({
  strategy: flagStrategy,
  directory,
  force = false,
  installDeps = true,
}: {
  strategy?: CssStrategy;
  directory: string;
  force?: boolean;
  installDeps: boolean;
}) {
  const viteConfig = await getViteConfig(directory).catch(() => null);
  if (!viteConfig) {
    throw new AbortError(
      'No Vite config found. This command is only supported in Vite projects.',
    );
  }

  const {remixConfig} = viteConfig;

  const strategy = flagStrategy ? flagStrategy : await renderCssPrompt();

  if (strategy === 'css-modules' || strategy === 'postcss') {
    renderSuccess({
      headline: `Vite works out of the box with ${CSS_STRATEGY_NAME_MAP[strategy]}.`,
      body: `See the Vite documentation for more information:\n${CSS_STRATEGY_HELP_URL_MAP[strategy]}`,
    });

    return;
  }

  const setupOutput = await setupCssStrategy(strategy, remixConfig, force);
  if (!setupOutput) return;

  const {workPromise, generatedAssets} = setupOutput;

  const tasks = [
    {
      title: 'Updating files',
      task: async () => {
        await workPromise;
      },
    },
  ];

  if (installDeps) {
    const gettingPkgManagerPromise = getPackageManager(
      remixConfig.rootDirectory,
    );

    tasks.push({
      title: 'Installing new dependencies',
      task: async () => {
        const packageManager = await gettingPkgManagerPromise;
        await installNodeModules({
          directory: remixConfig.rootDirectory,
          packageManager,
          args: [],
        });
      },
    });
  }

  await renderTasks(tasks);

  renderSuccess({
    headline: `${CSS_STRATEGY_NAME_MAP[strategy]} setup complete.`,
    body:
      (generatedAssets.length > 0
        ? 'You can now modify CSS configuration in the following files:\n' +
          generatedAssets.map((file) => `  - ${file}`).join('\n') +
          '\n'
        : '') +
      `\nFor more information, visit ${CSS_STRATEGY_HELP_URL_MAP[strategy]}`,
  });
}
