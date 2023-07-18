import Command from '@shopify/cli-kit/node/base-command';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {renderTasks} from '@shopify/cli-kit/node/ui';
import {basename, resolvePath} from '@shopify/cli-kit/node/path';
import {
  commonFlags,
  overrideFlag,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {
  I18nStrategy,
  renderI18nPrompt,
  setupI18nStrategy,
} from '../../lib/setups/i18n/index.js';
import {getRemixConfig} from '../../lib/config.js';
import {
  generateProjectEntries,
  handleCliShortcut,
  handleRouteGeneration,
  renderProjectReady,
} from '../../lib/onboarding/common.js';
import {getCliCommand} from '../../lib/shell.js';

export default class Setup extends Command {
  static description = 'Scaffold routes and core functionality.';

  static flags = {
    path: commonFlags.path,
    force: commonFlags.force,
    styling: commonFlags.styling,
    i18n: commonFlags.i18n,
    shortcut: commonFlags.shortcut,
    'install-deps': overrideFlag(commonFlags.installDeps, {default: true}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Setup);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runSetup({
      ...flagsToCamelObject(flags),
      directory,
    });
  }
}

type RunSetupOptions = {
  directory: string;
  installDeps: boolean;
  styling?: string;
  i18n?: string;
  shortcut?: boolean;
};

async function runSetup(options: RunSetupOptions) {
  const controller = new AbortController();
  const remixConfig = await getRemixConfig(options.directory);
  const location = basename(remixConfig.rootDirectory);
  const cliCommandPromise = getCliCommand();

  // TODO: add CSS setup + install deps
  let backgroundWorkPromise = Promise.resolve();

  const tasks = [
    {
      title: 'Setting up project',
      task: async () => {
        await backgroundWorkPromise;
      },
    },
  ];

  const i18nStrategy = options.i18n
    ? (options.i18n as I18nStrategy)
    : await renderI18nPrompt({
        abortSignal: controller.signal,
        extraChoices: {none: 'Set up later'},
      });

  const i18n = i18nStrategy === 'none' ? undefined : i18nStrategy;

  if (i18n) {
    backgroundWorkPromise = backgroundWorkPromise.then(() =>
      setupI18nStrategy(i18n, remixConfig),
    );
  }

  const {routes, setupRoutes} = await handleRouteGeneration(controller);
  const needsRouteGeneration = Object.keys(routes).length > 0;

  if (needsRouteGeneration) {
    const typescript = !!remixConfig.tsconfigPath;

    backgroundWorkPromise = backgroundWorkPromise
      .then(() =>
        generateProjectEntries({
          rootDirectory: remixConfig.rootDirectory,
          appDirectory: remixConfig.appDirectory,
          typescript,
        }),
      )
      .then(() =>
        setupRoutes(remixConfig.rootDirectory, typescript ? 'ts' : 'js', i18n),
      );
  }

  let hasCreatedShortcut = false;
  const cliCommand = await cliCommandPromise;
  const needsAlias = cliCommand !== 'h2';
  if (needsAlias) {
    const {createShortcut, showShortcutBanner} = await handleCliShortcut(
      controller,
      await cliCommandPromise,
      options.shortcut,
    );

    if (createShortcut) {
      backgroundWorkPromise = backgroundWorkPromise.then(async () => {
        hasCreatedShortcut = await createShortcut();
      });

      showShortcutBanner();
    }
  }

  if (!i18n && !needsRouteGeneration && !needsAlias) return;

  await renderTasks(tasks);

  await renderProjectReady(
    {
      location,
      name: location,
      directory: remixConfig.rootDirectory,
    },
    {
      hasCreatedShortcut,
      depsInstalled: true,
      packageManager: 'npm',
      i18n,
      routes,
    },
  );
}
