import Command from '@shopify/cli-kit/node/base-command';
import {
  installNodeModules,
  packageManagerUsedForCreating,
} from '@shopify/cli-kit/node/node-package-manager';
import {
  renderSuccess,
  renderInfo,
  renderSelectPrompt,
  renderTextPrompt,
  renderConfirmationPrompt,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {Flags} from '@oclif/core';
import {basename, resolvePath, joinPath} from '@shopify/cli-kit/node/path';
import {
  rmdir,
  copyFile,
  fileExists,
  isDirectory,
} from '@shopify/cli-kit/node/fs';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import {AbortError} from '@shopify/cli-kit/node/error';
import {hyphenate, capitalize} from '@shopify/cli-kit/common/string';
import {
  commonFlags,
  parseProcessFlags,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {transpileProject} from '../../lib/transpile-ts.js';
import {getLatestTemplates} from '../../lib/template-downloader.js';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {readdir} from 'fs/promises';
import {fileURLToPath} from 'url';
import {getStarterDir} from '../../lib/build.js';
import {getStorefronts} from '../../lib/graphql/admin/link-storefront.js';
import {setShop, setStorefront} from '../../lib/shopify-config.js';
import {replaceFileContent} from '../../lib/file.js';
import {
  SETUP_CSS_STRATEGIES,
  setupCssStrategy,
  type CssStrategy,
} from './../../lib/setups/css/index.js';
import {ALIAS_NAME, createPlatformShortcut} from './shortcut.js';

const FLAG_MAP = {f: 'force'} as Record<string, string>;

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
      choices: ['js', 'ts'],
      env: 'SHOPIFY_HYDROGEN_FLAG_LANGUAGE',
    }),
    template: Flags.string({
      description:
        'Sets the template to use. Pass `demo-store` for a fully-featured store template.',
      env: 'SHOPIFY_HYDROGEN_FLAG_TEMPLATE',
    }),
    'install-deps': Flags.boolean({
      description: 'Auto install dependencies using the active package manager',
      env: 'SHOPIFY_HYDROGEN_FLAG_INSTALL_DEPS',
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Init);

    await runInit(flagsToCamelObject(flags));
  }
}

type InitOptions = {
  path?: string;
  template?: string;
  language?: string;
  token?: string;
  force?: boolean;
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

  return options.template
    ? setupRemoteTemplate(options)
    : setupLocalStarterTemplate(options);
}

async function setupRemoteTemplate(options: InitOptions) {
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
  const backgroundDownloadPromise = getLatestTemplates();

  const project = await handleProjectLocation({...options});
  if (!project) return;

  // Templates might be cached or the download might be finished already.
  // Only output progress if the download is still in progress.
  const backgroundWorkPromise = Promise.resolve().then(async () => {
    const {templatesDir} = await backgroundDownloadPromise;
    return templatesDir;
  });

  backgroundWorkPromise.then(async (templatesDir) => {
    await copyFile(joinPath(templatesDir, appTemplate), project.directory);
  });

  const convertFiles = await handleLanguage(
    project.directory,
    options.language,
  );

  backgroundWorkPromise.then(() => convertFiles());

  const {packageManager, shouldInstallDeps, installDeps} =
    await handleDependencies(project.directory, options.installDeps);

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
        await installDeps();
      },
    });
  }

  await renderTasks(tasks);

  renderProjectReady(project, packageManager, shouldInstallDeps);

  if (isDemoStoreTemplate) {
    renderInfo({
      headline: `Your project will display inventory from the Hydrogen Demo Store.`,
      body: `To connect this project to your Shopify store’s inventory, update \`${project.name}/.env\` with your store ID and Storefront API key.`,
    });
  }
}

async function setupLocalStarterTemplate(options: InitOptions) {
  const templateAction = await renderSelectPrompt({
    message: 'Connect to Shopify',
    choices: [
      {
        // TODO use Mock shop
        label: 'Use sample data from Hydrogen Preview shop (no login required)',
        value: 'preview',
      },
      {label: 'Link your Shopify account', value: 'link'},
    ],
    defaultValue: 'preview',
  });

  const storefrontInfo =
    templateAction === 'link' ? await handleStorefrontLink() : null;

  const project = await handleProjectLocation({
    ...options,
    defaultLocation: storefrontInfo?.title,
  });

  if (!project) return;

  let backgroundWorkPromise: Promise<any> = copyFile(
    getStarterDir(),
    project.directory,
  );

  const tasks = [
    {
      title: 'Setting up project',
      task: async () => {
        await backgroundWorkPromise;
      },
    },
  ];

  if (storefrontInfo) {
    backgroundWorkPromise = backgroundWorkPromise.then(() =>
      Promise.all([
        // Save linked shop/storefront in project
        setShop(project.directory, storefrontInfo.shop).then(() =>
          setStorefront(project.directory, storefrontInfo),
        ),
        // Remove public env variables to fallback to remote Oxygen variables
        replaceFileContent(
          joinPath(project.directory, '.env'),
          false,
          (content) =>
            content.replace(/PUBLIC_.*\n/gm, '').replace(/\n\n$/gm, '\n'),
        ),
      ]),
    );
  }

  const transpileFiles = await handleLanguage(
    project.directory,
    options.language,
  );

  backgroundWorkPromise = backgroundWorkPromise.then(() => transpileFiles());

  const {setupCss} = await handleCssStrategy(project.directory);

  backgroundWorkPromise = backgroundWorkPromise.then(() => setupCss());

  const {packageManager, shouldInstallDeps, installDeps} =
    await handleDependencies(project.directory, options.installDeps);

  if (shouldInstallDeps) {
    const installingDepsPromise = backgroundWorkPromise.then(() =>
      installDeps(),
    );

    tasks.push({
      title: 'Installing dependencies',
      task: async () => {
        await installingDepsPromise;
      },
    });
  }

  let hasCreatedShortcut = false;
  const createShortcut = await handleCliAlias();
  if (createShortcut) {
    backgroundWorkPromise = backgroundWorkPromise.then(async () => {
      try {
        const shortcuts = await createShortcut();
        hasCreatedShortcut = shortcuts.length > 0;
      } catch {
        // Ignore errors.
        // We'll inform the user to create the
        // shortcut manually in the next step.
      }
    });
  }

  await renderTasks(tasks);

  renderProjectReady(
    project,
    packageManager,
    shouldInstallDeps,
    hasCreatedShortcut,
  );
}

async function handleCliAlias() {
  const shouldCreateShortcut = await renderConfirmationPrompt({
    message: outputContent`Create a global ${outputToken.genericShellCommand(
      ALIAS_NAME,
    )} alias for the Hydrogen CLI?`.value,
    confirmationMessage: 'Yes',
    cancellationMessage: 'No',
  });

  if (!shouldCreateShortcut) return;

  return () => createPlatformShortcut();
}

async function handleStorefrontLink() {
  let shop = await renderTextPrompt({
    message:
      'Specify which Store you would like to use (e.g. {store}.myshopify.com)',
    allowEmpty: false,
  });

  shop = shop.trim().toLowerCase();

  if (!shop.endsWith('.myshopify.com')) {
    shop += '.myshopify.com';
  }

  // Triggers a browser login flow if necessary.
  const {storefronts} = await getStorefronts(shop);

  if (storefronts.length === 0) {
    throw new AbortError('No storefronts found for this shop.');
  }

  const storefrontId = await renderSelectPrompt({
    message: 'Choose a Hydrogen storefront to link this project to:',
    choices: storefronts.map((storefront) => ({
      label: `${storefront.title} ${storefront.productionUrl}`,
      value: storefront.id,
    })),
  });

  let selected = storefronts.find(
    (storefront) => storefront.id === storefrontId,
  )!;

  if (!selected) {
    throw new AbortError('No storefront found with this ID.');
  }

  return {...selected, shop};
}

async function handleProjectLocation(options: {
  path?: string;
  defaultLocation?: string;
  force?: boolean;
}) {
  const location =
    options.path ??
    (await renderTextPrompt({
      message: 'Where would you like to create your app?',
      defaultValue: options.defaultLocation
        ? hyphenate(options.defaultLocation)
        : 'hydrogen-storefront',
    }));

  const name = basename(location);
  const directory = resolvePath(process.cwd(), location);

  if (await projectExists(directory)) {
    if (!options.force) {
      const deleteFiles = await renderConfirmationPrompt({
        message: `${location} is not an empty directory. Do you want to delete the existing files and continue?`,
        defaultValue: false,
      });

      if (!deleteFiles) {
        renderInfo({
          headline: `Destination path ${location} already exists and is not an empty directory. You may use \`--force\` or \`-f\` to override it.`,
        });

        return;
      }
    }
  }

  return {location, name, directory};
}

async function handleLanguage(projectDir: string, flagLanguage?: string) {
  const language =
    flagLanguage ??
    (await renderSelectPrompt({
      message: 'Choose a language',
      choices: [
        {label: 'JavaScript', value: 'js'},
        {label: 'TypeScript', value: 'ts'},
      ],
      defaultValue: 'js',
    }));

  return async () => {
    if (language === 'js') {
      try {
        await transpileProject(projectDir);
      } catch (error) {
        await rmdir(projectDir, {force: true});
        throw error;
      }
    }
  };
}

async function handleCssStrategy(projectDir: string) {
  const selectedCssStrategy = await renderSelectPrompt<'no' | CssStrategy>({
    message: `Select a styling library`,
    choices: [
      {label: 'No', value: 'no'},
      ...SETUP_CSS_STRATEGIES.map((strategy) => ({
        label: capitalize(strategy),
        value: strategy,
      })),
    ],
    defaultValue: 'no',
  });

  const skipCssSetup = selectedCssStrategy === 'no';

  return {
    cssStrategy: skipCssSetup ? null : selectedCssStrategy,
    async setupCss() {
      if (skipCssSetup) return;

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

async function handleDependencies(
  projectDir: string,
  shouldInstallDeps?: boolean,
) {
  const detectedPackageManager = await packageManagerUsedForCreating();
  let actualPackageManager: Exclude<typeof detectedPackageManager, 'unknown'> =
    'npm';

  if (shouldInstallDeps !== false) {
    if (detectedPackageManager === 'unknown') {
      const result = await renderSelectPrompt<'no' | 'npm' | 'pnpm' | 'yarn'>({
        message: `Install dependencies?`,
        choices: [
          {label: 'No', value: 'no'},
          {label: 'Yes, use NPM', value: 'npm'},
          {label: 'Yes, use PNPM', value: 'pnpm'},
          {label: 'Yes, use Yarn v1', value: 'yarn'},
        ],
        defaultValue: 'no',
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
      });
    }
  }

  return {
    packageManager: actualPackageManager,
    shouldInstallDeps,
    installDeps: shouldInstallDeps
      ? () =>
          installNodeModules({
            directory: projectDir,
            packageManager: actualPackageManager,
            args: [],
          })
      : () => {},
  };
}

function renderProjectReady(
  project: NonNullable<Awaited<ReturnType<typeof handleProjectLocation>>>,
  packageManager: 'npm' | 'pnpm' | 'yarn',
  depsInstalled?: boolean,
  hasCreatedShortcut?: boolean,
) {
  renderSuccess({
    headline: `${project.name} is ready to build.`,
    nextSteps: [
      outputContent`Run ${outputToken.genericShellCommand(
        `cd ${project.location}`,
      )}`.value,
      depsInstalled
        ? undefined
        : outputContent`Run ${outputToken.genericShellCommand(
            `${packageManager} install`,
          )} to install the dependencies`.value,
      outputContent`Run ${outputToken.packagejsonScript(
        packageManager,
        'dev',
      )} to start your local development server and start building`.value,
    ].filter((step): step is string => Boolean(step)),
    reference: [
      'Getting started with Hydrogen: https://shopify.dev/docs/custom-storefronts/hydrogen/building/begin-development',
      'Hydrogen project structure: https://shopify.dev/docs/custom-storefronts/hydrogen/project-structure',
      'Setting up Hydrogen environment variables: https://shopify.dev/docs/custom-storefronts/hydrogen/environment-variables',
    ],
  });
}

async function projectExists(projectDir: string) {
  return (
    (await fileExists(projectDir)) &&
    (await isDirectory(projectDir)) &&
    (await readdir(projectDir)).length > 0
  );
}

function supressNodeExperimentalWarnings() {
  const warningListener = process.listeners('warning')[0]!;
  if (warningListener) {
    process.removeAllListeners('warning');
    process.prependListener('warning', (warning) => {
      if (warning.name != 'ExperimentalWarning') {
        warningListener(warning);
      }
    });
  }
}
