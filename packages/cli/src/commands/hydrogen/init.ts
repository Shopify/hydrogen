import Command from '@shopify/cli-kit/node/base-command';
import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {
  installNodeModules,
  packageManagerUsedForCreating,
  type PackageManager,
} from '@shopify/cli-kit/node/node-package-manager';
import {
  renderSuccess,
  renderInfo,
  renderSelectPrompt,
  renderTextPrompt,
  renderConfirmationPrompt,
  renderTasks,
  renderFatalError,
  renderWarning,
} from '@shopify/cli-kit/node/ui';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import {Flags} from '@oclif/core';
import {basename, resolvePath, joinPath} from '@shopify/cli-kit/node/path';
import {
  initializeGitRepository,
  addAllToGitFromDirectory,
  createGitCommit,
} from '@shopify/cli-kit/node/git';
import {
  rmdir,
  copyFile,
  fileExists,
  isDirectory,
} from '@shopify/cli-kit/node/fs';
import {
  outputDebug,
  formatPackageManagerCommand,
} from '@shopify/cli-kit/node/output';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {capitalize, hyphenate} from '@shopify/cli-kit/common/string';
import colors from '@shopify/cli-kit/node/colors';
import {
  commonFlags,
  parseProcessFlags,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {transpileProject} from '../../lib/transpile-ts.js';
import {getLatestTemplates} from '../../lib/template-downloader.js';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {getStarterDir} from '../../lib/build.js';
import {setUserAccount, setStorefront} from '../../lib/shopify-config.js';
import {replaceFileContent} from '../../lib/file.js';
import {
  SETUP_CSS_STRATEGIES,
  setupCssStrategy,
  type CssStrategy,
} from './../../lib/setups/css/index.js';
import {createPlatformShortcut} from './shortcut.js';
import {CSS_STRATEGY_NAME_MAP} from './setup/css-unstable.js';
import {
  I18nStrategy,
  setupI18nStrategy,
  SETUP_I18N_STRATEGIES,
} from '../../lib/setups/i18n/index.js';
import {I18N_STRATEGY_NAME_MAP} from './setup/i18n-unstable.js';
import {ROUTE_MAP, runGenerate} from './generate/route.js';
import {supressNodeExperimentalWarnings} from '../../lib/process.js';
import {ALIAS_NAME, getCliCommand, type CliCommand} from '../../lib/shell.js';
import {type AdminSession, login} from '../../lib/auth.js';
import {createStorefront} from '../../lib/graphql/admin/create-storefront.js';
import {waitForJob} from '../../lib/graphql/admin/fetch-job.js';
import {titleize} from '../../lib/string.js';

const FLAG_MAP = {f: 'force'} as Record<string, string>;
const LANGUAGES = {
  js: 'JavaScript',
  ts: 'TypeScript',
} as const;
type Language = keyof typeof LANGUAGES;

type StylingChoice = (typeof SETUP_CSS_STRATEGIES)[number];

type I18nChoice = I18nStrategy | 'none';
const I18N_CHOICES = [...SETUP_I18N_STRATEGIES, 'none'] as const;

export default class Init extends Command {
  static description = 'Creates a new Hydrogen storefront.';
  static flags = {
    force: commonFlags.force,
    path: Flags.string({
      description: 'The path to the directory of the new Hydrogen storefront.',
      env: 'SHOPIFY_HYDROGEN_FLAG_PATH',
    }),
    language: Flags.string({
      description: 'Sets the template language to use. One of `js` or `ts`.',
      choices: Object.keys(LANGUAGES),
      env: 'SHOPIFY_HYDROGEN_FLAG_LANGUAGE',
    }),
    template: Flags.string({
      description:
        'Sets the template to use. Pass `demo-store` for a fully-featured store template.',
      env: 'SHOPIFY_HYDROGEN_FLAG_TEMPLATE',
    }),
    'install-deps': commonFlags.installDeps,
    'mock-shop': Flags.boolean({
      description: 'Use mock.shop as the data source for the storefront.',
      default: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_MOCK_DATA',
    }),
    styling: Flags.string({
      description: `Sets the styling strategy to use. One of ${SETUP_CSS_STRATEGIES.map(
        (item) => `\`${item}\``,
      ).join(', ')}.`,
      choices: SETUP_CSS_STRATEGIES,
      env: 'SHOPIFY_HYDROGEN_FLAG_STYLING',
    }),
    i18n: Flags.string({
      description: `Sets the internationalization strategy to use. One of ${I18N_CHOICES.map(
        (item) => `\`${item}\``,
      ).join(', ')}.`,
      choices: I18N_CHOICES,
      env: 'SHOPIFY_HYDROGEN_FLAG_I18N',
    }),
    routes: Flags.boolean({
      description: 'Generate routes for all pages.',
      env: 'SHOPIFY_HYDROGEN_FLAG_ROUTES',
      hidden: true,
    }),
    shortcut: Flags.boolean({
      description: 'Create a shortcut to the Shopify Hydrogen CLI.',
      env: 'SHOPIFY_HYDROGEN_FLAG_SHORTCUT',
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Init);

    if (flags.i18n && !I18N_CHOICES.includes(flags.i18n as I18nChoice)) {
      throw new AbortError(
        `Invalid i18n strategy: ${
          flags.i18n
        }. Must be one of ${I18N_CHOICES.join(', ')}`,
      );
    }

    if (
      flags.styling &&
      !SETUP_CSS_STRATEGIES.includes(flags.styling as StylingChoice)
    ) {
      throw new AbortError(
        `Invalid styling strategy: ${
          flags.styling
        }. Must be one of ${SETUP_CSS_STRATEGIES.join(', ')}`,
      );
    }

    await runInit(flagsToCamelObject(flags) as InitOptions);
  }
}

type InitOptions = {
  path?: string;
  template?: string;
  language?: Language;
  mockShop?: boolean;
  styling?: StylingChoice;
  i18n?: I18nChoice;
  token?: string;
  force?: boolean;
  routes?: boolean;
  shortcut?: boolean;
  installDeps?: boolean;
};

export async function runInit(
  options: InitOptions = parseProcessFlags(process.argv, FLAG_MAP),
) {
  supressNodeExperimentalWarnings();

  const showUpgrade = await checkHydrogenVersion(
    // Resolving the CLI package from a local directory might fail because
    // this code could be run from a global dependency (e.g. on `npm create`).
    // Therefore, pass the known path to the package.json directly from here:
    fileURLToPath(new URL('../../../package.json', import.meta.url)),
    'cli',
  );

  if (showUpgrade) {
    const packageManager = await packageManagerUsedForCreating();
    showUpgrade(
      packageManager === 'unknown'
        ? ''
        : `Please use the latest version with \`${packageManager} create @shopify/hydrogen@latest\``,
    );
  }

  const controller = new AbortController();

  try {
    return options.template
      ? await setupRemoteTemplate(options, controller)
      : await setupLocalStarterTemplate(options, controller);
  } catch (error) {
    controller.abort();
    throw error;
  }
}

/**
 * Flow for creating a project starting from a remote template (e.g. demo-store).
 */
async function setupRemoteTemplate(
  options: InitOptions,
  controller: AbortController,
) {
  const isDemoStoreTemplate = options.template === 'demo-store';

  if (!isDemoStoreTemplate) {
    // TODO: support GitHub repos as templates
    throw new AbortError(
      'Only `demo-store` is supported in --template flag for now.',
      'Skip the --template flag to run the setup flow.',
    );
  }

  const appTemplate = options.template!;

  // Start downloading templates early.
  const backgroundDownloadPromise = getLatestTemplates({
    signal: controller.signal,
  }).catch((error) => {
    throw abort(error); // Throw to fix TS error
  });

  const project = await handleProjectLocation({...options, controller});

  if (!project) return;

  const abort = createAbortHandler(controller, project);

  let backgroundWorkPromise = backgroundDownloadPromise.then(({templatesDir}) =>
    copyFile(joinPath(templatesDir, appTemplate), project.directory).catch(
      abort,
    ),
  );

  const {language, transpileProject} = await handleLanguage(
    project.directory,
    controller,
    options.language,
  );

  backgroundWorkPromise = backgroundWorkPromise
    .then(() => transpileProject().catch(abort))
    .then(() => createInitialCommit(project.directory));

  const {packageManager, shouldInstallDeps, installDeps} =
    await handleDependencies(
      project.directory,
      controller,
      options.installDeps,
    );

  const setupSummary: SetupSummary = {
    language,
    packageManager,
    depsInstalled: false,
    hasCreatedShortcut: false,
  };

  const tasks = [
    {
      title: 'Downloading template',
      task: async () => {
        await backgroundDownloadPromise;
      },
    },
    {
      title: 'Setting up project',
      task: async () => {
        await backgroundWorkPromise;
      },
    },
  ];

  if (shouldInstallDeps) {
    tasks.push({
      title: 'Installing dependencies',
      task: async () => {
        try {
          await installDeps();
          setupSummary.depsInstalled = true;
        } catch (error) {
          setupSummary.depsError = error as AbortError;
        }
      },
    });
  }

  await renderTasks(tasks);

  await renderProjectReady(project, setupSummary);

  if (isDemoStoreTemplate) {
    renderInfo({
      headline: `Your project will display inventory from the Hydrogen Demo Store.`,
      body: `To connect this project to your Shopify store’s inventory, update \`${project.name}/.env\` with your store ID and Storefront API key.`,
    });
  }
}

/**
 * Flow for setting up a project from the locally bundled starter template (hello-world).
 */
async function setupLocalStarterTemplate(
  options: InitOptions,
  controller: AbortController,
) {
  const templateAction = options.mockShop
    ? 'mock'
    : await renderSelectPrompt<'mock' | 'link'>({
        message: 'Connect to Shopify',
        choices: [
          {
            label: 'Use sample data from Mock.shop (no login required)',
            value: 'mock',
          },
          {label: 'Link your Shopify account', value: 'link'},
        ],
        defaultValue: 'mock',
        abortSignal: controller.signal,
      });

  const storefrontInfo =
    templateAction === 'link'
      ? await handleStorefrontLink(controller)
      : undefined;

  const project = await handleProjectLocation({
    ...options,
    storefrontInfo,
    controller,
  });

  if (!project) return;

  const abort = createAbortHandler(controller, project);

  const createStorefrontPromise =
    storefrontInfo &&
    createStorefront(storefrontInfo.session, storefrontInfo.title)
      .then(async ({storefront, jobId}) => {
        if (jobId) await waitForJob(storefrontInfo.session, jobId);
        return storefront;
      })
      .catch(abort);

  let backgroundWorkPromise: Promise<any> = copyFile(
    getStarterDir(),
    project.directory,
  ).catch(abort);

  const tasks = [
    {
      title: 'Creating storefront',
      task: async () => {
        await createStorefrontPromise;
      },
    },
    {
      title: 'Setting up project',
      task: async () => {
        await backgroundWorkPromise;
      },
    },
  ];

  backgroundWorkPromise = backgroundWorkPromise.then(() => {
    const promises: Array<Promise<any>> = [
      // Add project name to package.json
      replaceFileContent(
        joinPath(project.directory, 'package.json'),
        false,
        (content) =>
          content.replace(
            '"hello-world"',
            `"${storefrontInfo?.title ?? titleize(project.name)}"`,
          ),
      ),
    ];

    if (storefrontInfo && createStorefrontPromise) {
      promises.push(
        // Save linked storefront in project
        setUserAccount(project.directory, storefrontInfo),
        createStorefrontPromise.then((storefront) =>
          // Save linked storefront in project
          setStorefront(project.directory, storefront),
        ),
        // Remove public env variables to fallback to remote Oxygen variables
        replaceFileContent(
          joinPath(project.directory, '.env'),
          false,
          (content) =>
            content.replace(/^[^#].*\n/gm, '').replace(/\n\n$/gm, '\n'),
        ),
      );
    } else if (templateAction === 'mock') {
      promises.push(
        // Empty tokens and set mock.shop domain
        replaceFileContent(
          joinPath(project.directory, '.env'),
          false,
          (content) =>
            content
              .replace(/(PUBLIC_\w+)="[^"]*?"\n/gm, '$1=""\n')
              .replace(/(PUBLIC_STORE_DOMAIN)=""\n/gm, '$1="mock.shop"\n')
              .replace(/\n\n$/gm, '\n'),
        ),
      );
    }

    return Promise.all(promises).catch(abort);
  });

  const {language, transpileProject} = await handleLanguage(
    project.directory,
    controller,
    options.language,
  );

  backgroundWorkPromise = backgroundWorkPromise.then(() =>
    transpileProject().catch(abort),
  );

  const {setupCss, cssStrategy} = await handleCssStrategy(
    project.directory,
    controller,
    options.styling,
  );

  backgroundWorkPromise = backgroundWorkPromise.then(() =>
    setupCss().catch(abort),
  );

  const {packageManager, shouldInstallDeps, installDeps} =
    await handleDependencies(
      project.directory,
      controller,
      options.installDeps,
    );

  const setupSummary: SetupSummary = {
    language,
    packageManager,
    cssStrategy,
    depsInstalled: false,
    hasCreatedShortcut: false,
  };

  if (shouldInstallDeps) {
    const installingDepsPromise = backgroundWorkPromise.then(async () => {
      try {
        await installDeps();
        setupSummary.depsInstalled = true;
      } catch (error) {
        setupSummary.depsError = error as AbortError;
      }
    });

    tasks.push({
      title: 'Installing dependencies',
      task: async () => {
        await installingDepsPromise;
      },
    });
  }

  const cliCommand = await getCliCommand('', packageManager);

  const createShortcut = await handleCliShortcut(
    controller,
    cliCommand,
    options.shortcut,
  );

  if (createShortcut) {
    backgroundWorkPromise = backgroundWorkPromise.then(async () => {
      setupSummary.hasCreatedShortcut = await createShortcut();
    });
  }

  renderSuccess({
    headline: [
      {userInput: storefrontInfo?.title ?? project.name},
      'is ready to build.',
    ],
  });

  const continueWithSetup =
    (options.i18n ?? options.routes) !== undefined ||
    (await renderConfirmationPrompt({
      message: 'Do you want to scaffold routes and core functionality?',
      confirmationMessage: 'Yes, set up now',
      cancellationMessage:
        'No, set up later ' +
        colors.dim(
          `(run \`${createShortcut ? ALIAS_NAME : cliCommand} setup\`)`,
        ),
      abortSignal: controller.signal,
    }));

  if (continueWithSetup) {
    const {i18nStrategy, setupI18n} = await handleI18n(
      controller,
      options.i18n,
    );

    const i18nPromise = setupI18n(project.directory, language).catch(
      (error) => {
        setupSummary.i18nError = error as AbortError;
      },
    );

    const {routes, setupRoutes} = await handleRouteGeneration(
      controller,
      options.routes,
    );

    const routesPromise = setupRoutes(
      project.directory,
      language,
      i18nStrategy,
    ).catch((error) => {
      setupSummary.routesError = error as AbortError;
    });

    setupSummary.i18n = i18nStrategy;
    setupSummary.routes = routes;
    backgroundWorkPromise = backgroundWorkPromise.then(() =>
      Promise.all([i18nPromise, routesPromise]),
    );
  }

  // Directory files are all setup, commit them to git
  backgroundWorkPromise = backgroundWorkPromise.then(() =>
    createInitialCommit(project.directory),
  );

  await renderTasks(tasks);

  await renderProjectReady(project, setupSummary);
}

const i18nStrategies = {
  ...I18N_STRATEGY_NAME_MAP,
  none: 'No internationalization',
};

async function handleI18n(controller: AbortController, flagI18n?: I18nChoice) {
  let selection =
    flagI18n ??
    (await renderSelectPrompt<I18nChoice>({
      message: 'Select an internationalization strategy',
      choices: Object.entries(i18nStrategies).map(([value, label]) => ({
        value: value as I18nStrategy,
        label,
      })),
      abortSignal: controller.signal,
    }));

  const i18nStrategy = selection === 'none' ? undefined : selection;

  return {
    i18nStrategy,
    setupI18n: async (rootDirectory: string, language: Language) => {
      if (i18nStrategy) {
        await setupI18nStrategy(i18nStrategy, {
          rootDirectory,
          serverEntryPoint: language === 'ts' ? 'server.ts' : 'server.js',
        });
      }
    },
  };
}

async function handleRouteGeneration(
  controller: AbortController,
  flagRoutes: boolean = true, // TODO: Remove default value when multi-select UI component is available
) {
  // TODO: Need a multi-select UI component
  const shouldScaffoldAllRoutes =
    flagRoutes ??
    (await renderConfirmationPrompt({
      message:
        'Scaffold all standard route files? ' +
        Object.keys(ROUTE_MAP).join(', '),
      confirmationMessage: 'Yes',
      cancellationMessage: 'No',
      abortSignal: controller.signal,
    }));

  const routes = shouldScaffoldAllRoutes ? ROUTE_MAP : {};

  return {
    routes,
    setupRoutes: async (
      directory: string,
      language: Language,
      i18nStrategy?: I18nStrategy,
    ) => {
      if (shouldScaffoldAllRoutes) {
        await runGenerate({
          routeName: 'all',
          directory,
          force: true,
          typescript: language === 'ts',
          localePrefix: i18nStrategy === 'subfolders' ? 'locale' : false,
          signal: controller.signal,
        });
      }
    },
  };
}

/**
 * Prompts the user to create a global alias (h2) for the Hydrogen CLI.
 * @returns A function that creates the shortcut, or undefined if the user chose not to create a shortcut.
 */
async function handleCliShortcut(
  controller: AbortController,
  cliCommand: CliCommand,
  flagShortcut?: boolean,
) {
  const shouldCreateShortcut =
    flagShortcut ??
    (await renderConfirmationPrompt({
      confirmationMessage: 'Yes',
      cancellationMessage: 'No',
      message: [
        'Create a global',
        {command: ALIAS_NAME},
        'alias to run commands instead of',
        {command: cliCommand},
        '?',
      ],
      abortSignal: controller.signal,
    }));

  if (!shouldCreateShortcut) return;

  return async () => {
    try {
      const shortcuts = await createPlatformShortcut();
      return shortcuts.length > 0;
    } catch (error: any) {
      // Ignore errors.
      // We'll inform the user to create the
      // shortcut manually in the next step.
      outputDebug(
        'Failed to create shortcut.' +
          (error?.stack ?? error?.message ?? error),
      );

      return false;
    }
  };
}

type StorefrontInfo = {
  title: string;
  shop: string;
  shopName: string;
  email: string;
  session: AdminSession;
};

/**
 * Prompts the user to link a Hydrogen storefront to their project.
 * @returns The linked shop and storefront.
 */
async function handleStorefrontLink(
  controller: AbortController,
): Promise<StorefrontInfo> {
  const {session, config} = await login();

  const title = await renderTextPrompt({
    message: 'New storefront name',
    defaultValue: titleize(config.shopName),
    abortSignal: controller.signal,
  });

  return {...config, title, session};
}

type Project = {
  location: string;
  name: string;
  directory: string;
  storefrontInfo?: Awaited<ReturnType<typeof handleStorefrontLink>>;
};

/**
 * Prompts the user to select a project directory location.
 * @returns Project information, or undefined if the user chose not to force project creation.
 */
async function handleProjectLocation({
  storefrontInfo,
  controller,
  force,
  path: flagPath,
}: {
  path?: string;
  force?: boolean;
  controller: AbortController;
  storefrontInfo?: StorefrontInfo;
}): Promise<Project | undefined> {
  const storefrontDirectory = storefrontInfo && hyphenate(storefrontInfo.title);

  let location =
    flagPath ??
    storefrontDirectory ??
    (await renderTextPrompt({
      message: 'Where would you like to create your storefront?',
      defaultValue: './hydrogen-storefront',
      abortSignal: controller.signal,
    }));

  let directory = resolvePath(process.cwd(), location);

  if (await projectExists(directory)) {
    if (!force && storefrontDirectory) {
      location = await renderTextPrompt({
        message: `There's already a folder called \`${storefrontDirectory}\`. Where do you want to create the app?`,
        defaultValue: './' + storefrontDirectory,
        abortSignal: controller.signal,
      });

      directory = resolvePath(process.cwd(), location);

      if (!(await projectExists(directory))) {
        force = true;
      }
    }

    if (!force) {
      const deleteFiles = await renderConfirmationPrompt({
        message: outputContent`${outputToken.cyan(
          location,
        )} is not an empty directory. Do you want to delete the existing files and continue?`
          .value,
        defaultValue: false,
        abortSignal: controller.signal,
      });

      if (!deleteFiles) {
        renderInfo({
          headline: `Destination path ${location} already exists and is not an empty directory. You may use \`--force\` or \`-f\` to override it.`,
        });

        return;
      }
    }
  }

  return {location, name: basename(location), directory, storefrontInfo};
}

/**
 * Prompts the user to select a JS or TS.
 * @returns A function that optionally transpiles the project to JS, if that was chosen.
 */
async function handleLanguage(
  projectDir: string,
  controller: AbortController,
  flagLanguage?: Language,
) {
  const language =
    flagLanguage ??
    (await renderSelectPrompt({
      message: 'Choose a language',
      choices: [
        {label: 'JavaScript', value: 'js'},
        {label: 'TypeScript', value: 'ts'},
      ],
      defaultValue: 'js',
      abortSignal: controller.signal,
    }));

  return {
    language,
    async transpileProject() {
      if (language === 'js') {
        await transpileProject(projectDir);
      }
    },
  };
}

/**
 * Prompts the user to select a CSS strategy.
 * @returns The chosen strategy name and a function that sets up the CSS strategy.
 */
async function handleCssStrategy(
  projectDir: string,
  controller: AbortController,
  flagStyling?: StylingChoice,
) {
  const selectedCssStrategy =
    flagStyling ??
    (await renderSelectPrompt<CssStrategy>({
      message: `Select a styling library`,
      choices: SETUP_CSS_STRATEGIES.map((strategy) => ({
        label: CSS_STRATEGY_NAME_MAP[strategy],
        value: strategy,
      })),
      defaultValue: 'tailwind',
      abortSignal: controller.signal,
    }));

  return {
    cssStrategy: selectedCssStrategy,
    async setupCss() {
      const result = await setupCssStrategy(
        selectedCssStrategy,
        {
          rootDirectory: projectDir,
          appDirectory: joinPath(projectDir, 'app'), // Default value in new projects
        },
        true,
      );

      if (result) {
        await result.workPromise;
      }
    },
  };
}

/**
 * Prompts the user to choose whether to install dependencies and which package manager to use.
 * It infers the package manager used for creating the project and uses that as the default.
 * @returns The chosen pacakge manager and a function that optionally installs dependencies.
 */
async function handleDependencies(
  projectDir: string,
  controller: AbortController,
  shouldInstallDeps?: boolean,
) {
  const detectedPackageManager = await packageManagerUsedForCreating();
  let actualPackageManager: PackageManager = 'npm';

  if (shouldInstallDeps !== false) {
    if (detectedPackageManager === 'unknown') {
      const result = await renderSelectPrompt<'no' | PackageManager>({
        message: `Select package manager to install dependencies`,
        choices: [
          {label: 'NPM', value: 'npm'},
          {label: 'PNPM', value: 'pnpm'},
          {label: 'Yarn v1', value: 'yarn'},
          {label: 'Skip, install later', value: 'no'},
        ],
        defaultValue: 'npm',
        abortSignal: controller.signal,
      });

      if (result === 'no') {
        shouldInstallDeps = false;
      } else {
        actualPackageManager = result;
        shouldInstallDeps = true;
      }
    } else if (shouldInstallDeps === undefined) {
      actualPackageManager = detectedPackageManager;
      shouldInstallDeps = await renderConfirmationPrompt({
        message: `Install dependencies with ${detectedPackageManager}?`,
        confirmationMessage: 'Yes',
        cancellationMessage: 'No',
        abortSignal: controller.signal,
      });
    }
  }

  return {
    packageManager: actualPackageManager,
    shouldInstallDeps,
    installDeps: shouldInstallDeps
      ? async () => {
          await installNodeModules({
            directory: projectDir,
            packageManager: actualPackageManager,
            args: [],
            signal: controller.signal,
          });
        }
      : () => {},
  };
}

async function createInitialCommit(directory: string) {
  try {
    await initializeGitRepository(directory);
    await addAllToGitFromDirectory(directory);
    await createGitCommit('Scaffold Storefront', {directory});
  } catch (error: any) {
    // Ignore errors
    outputDebug(
      'Failed to initialize Git.\n' + error?.stack ?? error?.message ?? error,
    );
  }
}

type SetupSummary = {
  language: Language;
  packageManager: 'npm' | 'pnpm' | 'yarn';
  cssStrategy?: CssStrategy;
  hasCreatedShortcut: boolean;
  depsInstalled: boolean;
  depsError?: Error;
  i18n?: I18nStrategy;
  i18nError?: Error;
  routes?: Record<string, string | string[]>;
  routesError?: Error;
};

/**
 * Shows a summary success message with next steps.
 */
async function renderProjectReady(
  project: Project,
  {
    language,
    packageManager,
    depsInstalled,
    cssStrategy,
    hasCreatedShortcut,
    routes,
    i18n,
    depsError,
    i18nError,
    routesError,
  }: SetupSummary,
) {
  const hasErrors = Boolean(depsError || i18nError || routesError);
  const bodyLines: [string, string][] = [
    ['Shopify', project.storefrontInfo?.title ?? 'Mock.shop'],
    ['Language', LANGUAGES[language]],
  ];

  if (cssStrategy) {
    bodyLines.push(['Styling', CSS_STRATEGY_NAME_MAP[cssStrategy]]);
  }

  if (!i18nError && i18n) {
    bodyLines.push(['i18n', I18N_STRATEGY_NAME_MAP[i18n].split(' (')[0]!]);
  }

  let routeSummary = '';

  if (!routesError && routes && Object.keys(routes).length) {
    bodyLines.push(['Routes', '']);

    for (let [routeName, routePaths] of Object.entries(routes)) {
      routePaths = Array.isArray(routePaths) ? routePaths : [routePaths];

      routeSummary += `\n    • ${capitalize(routeName)} ${colors.dim(
        '(' +
          routePaths.map((item) => '/' + normalizeRoutePath(item)).join(' & ') +
          ')',
      )}`;
    }
  }

  const padMin =
    1 + bodyLines.reduce((max, [label]) => Math.max(max, label.length), 0);

  const cliCommand = hasCreatedShortcut
    ? ALIAS_NAME
    : await getCliCommand(project.directory, packageManager);

  const render = hasErrors ? renderWarning : renderSuccess;

  render({
    headline:
      `Storefront setup complete` +
      (hasErrors ? ' with errors (see warnings below).' : '!'),

    body:
      bodyLines
        .map(
          ([label, value]) =>
            `  ${(label + ':').padEnd(padMin, ' ')}  ${colors.dim(value)}`,
        )
        .join('\n') + routeSummary,

    // Use `customSections` instead of `nextSteps` and `references`
    // here to enforce a newline between title and items.
    customSections: [
      hasErrors && {
        title: 'Warnings\n',
        body: [
          {
            list: {
              items: [
                depsError && [
                  'Failed to install dependencies:',
                  {subdued: depsError.message},
                ],
                i18nError && [
                  'Failed to scaffold i18n:',
                  {subdued: i18nError.message},
                ],
                routesError && [
                  'Failed to scaffold routes:',
                  {subdued: routesError.message},
                ],
              ].filter((step): step is string[] => Boolean(step)),
            },
          },
        ],
      },
      {
        title: 'Help\n',
        body: {
          list: {
            items: [
              {
                link: {
                  label: 'Guides',
                  url: 'https://shopify.dev/docs/custom-storefronts/hydrogen/building',
                },
              },
              {
                link: {
                  label: 'API reference',
                  url: 'https://shopify.dev/docs/api/storefront',
                },
              },
              {
                link: {
                  label: 'Demo Store code',
                  url: 'https://github.com/Shopify/hydrogen/tree/HEAD/templates/demo-store',
                },
              },
              [
                'Run',
                {
                  command: `${cliCommand} --help`,
                },
              ],
            ],
          },
        },
      },
      {
        title: 'Next steps\n',
        body: [
          {
            list: {
              items: [
                [
                  'Run',
                  {command: `cd ${project.location}`},
                  'to enter your app directory.',
                ],

                !depsInstalled && [
                  'Run',
                  {command: `${packageManager} install`},
                  'to install the dependencies.',
                ],

                i18nError && [
                  'Run',
                  {command: `${cliCommand} setup i18n-unstable`},
                  'to scaffold internationalization.',
                ],

                hasCreatedShortcut && [
                  'Restart your terminal session to make the new',
                  {command: ALIAS_NAME},
                  'alias available.',
                ],

                [
                  'Run',
                  {
                    command: hasCreatedShortcut
                      ? `${ALIAS_NAME} dev`
                      : formatPackageManagerCommand(packageManager, 'dev'),
                  },
                  'to start your local development server.',
                ],
              ].filter((step): step is string[] => Boolean(step)),
            },
          },
        ],
      },
    ].filter((step): step is {title: string; body: any} => Boolean(step)),
  });
}

/**
 * @returns Whether the project directory exists and is not empty.
 */
async function projectExists(projectDir: string) {
  return (
    (await fileExists(projectDir)) &&
    (await isDirectory(projectDir)) &&
    (await readdir(projectDir)).length > 0
  );
}

function normalizeRoutePath(routePath: string) {
  const isIndex = /(^|\/)index$/.test(routePath);
  return isIndex
    ? routePath.slice(0, -'index'.length).replace(/\/$/, '')
    : routePath
        .replace(/\$/g, ':')
        .replace(/[\[\]]/g, '')
        .replace(/:(\w+)Handle/i, ':handle');
}

function createAbortHandler(
  controller: AbortController,
  project: {directory: string},
) {
  return async function abort(error: AbortError): Promise<never> {
    controller.abort();

    if (typeof project !== 'undefined') {
      await rmdir(project!.directory, {force: true}).catch(() => {});
    }

    renderFatalError(
      new AbortError(
        'Failed to initialize project: ' + error?.message ?? '',
        error?.tryMessage ?? error?.stack,
      ),
    );

    process.exit(1);
  };
}
