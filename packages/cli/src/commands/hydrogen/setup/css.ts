import {writeJsonResult} from '../../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {setupCssJsonOutputSchema} from '../../../lib/setups/types.js';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  commonFlags,
  overrideFlag,
  flagsToCamelObject,
} from '../../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess, renderTasks, renderWarning} from '../../../lib/ui.js';
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
  static get jsonOutputSchema(): typeof setupCssJsonOutputSchema {
    return setupCssJsonOutputSchema;
  }

  static descriptionWithMarkdown =
    'Adds support for certain CSS strategies to your project.';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
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

    await runSetupCSS(
      {
        ...flagsToCamelObject(flags),
        strategy: args.strategy as CssStrategy,
        directory,
      },
      flags.json,
    );
  }
}

export async function executeSetupCSS({
  strategy: flagStrategy,
  directory,
  force = false,
  installDeps = true,
}: {
  strategy?: CssStrategy;
  directory: string;
  force?: boolean;
  installDeps: boolean;
}): Promise<import('../../../lib/setups/types.js').SetupCssResult> {
  const viteConfig = await getViteConfig(directory).catch(() => null);
  if (!viteConfig) {
    throw new AbortError(
      'No Vite config found. This command is only supported in Vite projects.',
    );
  }

  const {remixConfig} = viteConfig;

  const strategy = flagStrategy ? flagStrategy : await renderCssPrompt();

  const result = {
    directory,
    strategy,
    files: [] as string[],
    dependenciesInstalled: false,
    needsNpmReinstall: false,
  };
  if (strategy === 'css-modules' || strategy === 'postcss')
    return {...result, status: 'built-in'};
  const setupOutput = await setupCssStrategy(strategy, remixConfig, force);
  if (!setupOutput) return {...result, status: 'cancelled'};

  const {workPromise, generatedAssets, needsInstallDeps} = setupOutput;

  const tasks = [
    {
      title: 'Updating files',
      task: async () => {
        await workPromise;
      },
    },
  ];

  let isNpm = false;

  if (installDeps && needsInstallDeps) {
    const gettingPkgManagerPromise = getPackageManager(
      remixConfig.rootDirectory,
    );

    tasks.push({
      title: 'Installing new dependencies',
      task: async () => {
        const packageManager = await gettingPkgManagerPromise;
        isNpm = packageManager === 'npm' || packageManager === 'unknown';

        await installNodeModules({
          directory: remixConfig.rootDirectory,
          packageManager,
          args: [],
        });
      },
    });
  }

  await renderTasks(tasks);

  return {
    ...result,
    status: 'configured',
    files: generatedAssets,
    dependenciesInstalled: Boolean(installDeps && needsInstallDeps),
    needsNpmReinstall: Boolean(
      needsInstallDeps && isNpm && strategy === 'tailwind',
    ),
  };
}

export async function runSetupCSS(
  options: Parameters<typeof executeSetupCSS>[0],
  json?: boolean,
) {
  const result = await executeSetupCSS(options);
  if (!writeJsonResult(setupCssJsonOutputSchema, result, json))
    renderSetupCSS(result);
  return result;
}

export function renderSetupCSS(
  result: import('../../../lib/setups/types.js').SetupCssResult,
) {
  const {strategy, files: generatedAssets} = result;
  if (result.status === 'cancelled') return;
  if (result.status === 'built-in') {
    renderSuccess({
      headline: `Vite works out of the box with ${CSS_STRATEGY_NAME_MAP[strategy]}.`,
      body: `See the Vite documentation for more information:\n${CSS_STRATEGY_HELP_URL_MAP[strategy]}`,
    });
    return;
  }
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
  if (result.needsNpmReinstall)
    renderWarning({
      body: [
        'Due to a bug in NPM, you might need to reinstall dependencies again.\nRun',
        {command: 'npm install'},
      ],
    });
}
