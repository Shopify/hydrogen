import Command from '@shopify/cli-kit/node/base-command';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {renderTasks} from '@shopify/cli-kit/node/ui';
import {basename, joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import {copyFile, fileExists, glob} from '@shopify/cli-kit/node/fs';
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
import {getRemixConfig} from '../../lib/remix-config.js';
import {
  generateProjectEntries,
  handleCliShortcut,
  handleRouteGeneration,
  renderProjectReady,
} from '../../lib/onboarding/common.js';
import {ALIAS_NAME, getCliCommand} from '../../lib/shell.js';
import {getTemplateAppFile} from '../../lib/build.js';

export default class Setup extends Command {
  static description = 'Scaffold routes and core functionality.';

  static flags = {
    ...commonFlags.path,
    ...commonFlags.force,
    ...commonFlags.markets,
    ...commonFlags.shortcut,
    ...overrideFlag(commonFlags.installDeps, {
      'install-deps': {default: true},
    }),
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
  markets?: string;
  shortcut?: boolean;
};

export async function runSetup(options: RunSetupOptions) {
  const controller = new AbortController();
  const {rootDirectory, appDirectory, serverEntryPoint} = await getRemixConfig(
    options.directory,
  );

  const location = basename(rootDirectory);
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

  const i18nStrategy = options.markets
    ? (options.markets as I18nStrategy)
    : await renderI18nPrompt({
        abortSignal: controller.signal,
        extraChoices: {none: 'Set up later'},
      });

  const i18n = i18nStrategy === 'none' ? undefined : i18nStrategy;

  const {needsRouteGeneration, setupRoutes} = await handleRouteGeneration(
    controller,
  );

  let routes: Record<string, string[]> | undefined;

  if (needsRouteGeneration) {
    const templateRoot = await getTemplateAppFile('..');
    const [typescript, dtsFiles] = await Promise.all([
      fileExists(joinPath(rootDirectory, 'tsconfig.json')),
      glob('*.d.ts', {cwd: templateRoot}),
    ]);

    backgroundWorkPromise = backgroundWorkPromise
      .then(() =>
        Promise.all([
          ...dtsFiles.map((filename) =>
            copyFile(
              joinPath(templateRoot, filename),
              resolvePath(rootDirectory, filename),
            ),
          ),
          // Copy app entries
          generateProjectEntries({
            rootDirectory,
            appDirectory,
            typescript,
          }),
        ]),
      )
      .then(async () => {
        routes = await setupRoutes(
          rootDirectory,
          typescript ? 'ts' : 'js',
          i18n,
        );
      });
  }

  if (i18n) {
    // i18n setup needs to happen after copying the app entries,
    // because it needs to modify the server entry point.
    backgroundWorkPromise = backgroundWorkPromise.then(() =>
      setupI18nStrategy(i18n, {rootDirectory, serverEntryPoint}),
    );
  }

  let cliCommand = await Promise.resolve(cliCommandPromise);

  const {createShortcut, showShortcutBanner} = await handleCliShortcut(
    controller,
    cliCommand,
    options.shortcut,
  );

  if (!i18n && !needsRouteGeneration && !createShortcut) return;

  if (createShortcut) {
    backgroundWorkPromise = backgroundWorkPromise.then(async () => {
      if (await createShortcut()) {
        cliCommand = ALIAS_NAME;
      }
    });

    showShortcutBanner();
  }

  await renderTasks(tasks);

  await renderProjectReady(
    {
      location,
      name: location,
      directory: rootDirectory,
    },
    {
      cliCommand,
      depsInstalled: true,
      packageManager: 'npm',
      i18n,
      routes,
    },
  );
}
