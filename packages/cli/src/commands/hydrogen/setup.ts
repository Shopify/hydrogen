import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {setupJsonOutputSchema} from '../../lib/setups/types.js';
import Command from '../../lib/hydrogen-command.js';
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
  static get jsonOutputSchema(): typeof setupJsonOutputSchema {
    return setupJsonOutputSchema;
  }

  static descriptionWithMarkdown = 'Scaffold routes and core functionality.';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
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

    await runSetup(
      {
        ...flagsToCamelObject(flags),
        directory,
      },
      flags.json,
    );
  }
}

type RunSetupOptions = {
  directory: string;
  installDeps: boolean;
  markets?: string;
  shortcut?: boolean;
};

export async function executeSetup(options: RunSetupOptions) {
  const controller = new AbortController();
  const {rootDirectory, appDirectory} = await getRemixConfig(options.directory);

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

  const {setupRoutes} = handleRouteGeneration(controller);

  let routes: Record<string, string[]> | undefined;

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
      routes = await setupRoutes(rootDirectory, typescript ? 'ts' : 'js', {
        i18nStrategy: i18n,
        // User might have added files before running this command.
        // We should overwrite them to ensure the routes are set up correctly.
        // Relies on Git to restore the files if needed.
        overwriteFileDeps: true,
      });
    });

  if (i18n) {
    // i18n setup needs to happen after copying the app entries,
    // because it needs to modify the server entry point.
    backgroundWorkPromise = backgroundWorkPromise.then(() =>
      setupI18nStrategy(i18n, {rootDirectory}),
    );
  }

  let cliCommand = await Promise.resolve(cliCommandPromise);

  const {createShortcut, showShortcutBanner} = await handleCliShortcut(
    controller,
    cliCommand,
    options.shortcut,
  );

  if (!i18n && !createShortcut) {
    await backgroundWorkPromise;
    return {
      directory: rootDirectory,
      name: location,
      location,
      i18n,
      routes,
      shortcut: false,
      cliCommand,
      showSummary: false,
    };
  }
  let shortcut = false;

  if (createShortcut) {
    backgroundWorkPromise = backgroundWorkPromise.then(async () => {
      if (await createShortcut()) {
        shortcut = true;
        cliCommand = ALIAS_NAME;
      }
    });

    showShortcutBanner();
  }

  await renderTasks(tasks);

  return {
    directory: rootDirectory,
    name: location,
    location,
    i18n,
    routes,
    shortcut,
    cliCommand,
    showSummary: true,
  };
}

export async function runSetup(options: RunSetupOptions, json?: boolean) {
  const result = await executeSetup(options);
  if (
    !writeJsonResult(
      setupJsonOutputSchema,
      {
        status: 'success',
        changed: true,
        directory: resolvePath(result.directory),
        name: result.name,
        i18n: result.i18n ?? null,
        routes: result.routes ?? null,
        shortcut: result.shortcut,
      },
      json,
    ) &&
    result.showSummary
  ) {
    await renderProjectReady(result, {
      cliCommand: result.cliCommand,
      depsInstalled: true,
      packageManager: 'npm',
      i18n: result.i18n,
      routes: result.routes,
    });
  }
  return result;
}
