import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {copyFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {hyphenate} from '@shopify/cli-kit/common/string';
import colors from '@shopify/cli-kit/node/colors';
import {
  renderSuccess,
  renderSelectPrompt,
  renderConfirmationPrompt,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {
  createAbortHandler,
  handleCssStrategy,
  handleDependencies,
  handleLanguage,
  handleProjectLocation,
  handleStorefrontLink,
  type SetupSummary,
  type InitOptions,
  handleCliShortcut,
  handleI18n,
  handleRouteGeneration,
  createInitialCommit,
  renderProjectReady,
} from './common.js';
import {createStorefront} from '../graphql/admin/create-storefront.js';
import {waitForJob} from '../graphql/admin/fetch-job.js';
import {getStarterDir} from '../build.js';
import {replaceFileContent} from '../file.js';
import {setStorefront, setUserAccount} from '../shopify-config.js';
import {ALIAS_NAME, getCliCommand} from '../shell.js';

/**
 * Flow for setting up a project from the locally bundled starter template (hello-world).
 */
export async function setupLocalStarterTemplate(
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

  if (templateAction === 'mock') project.storefrontTitle = 'Mock.shop';

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
            `"${hyphenate(storefrontInfo?.title ?? project.name)}"`,
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

  const {createShortcut, showShortcutBanner} = await handleCliShortcut(
    controller,
    cliCommand,
    options.shortcut,
  );

  if (createShortcut) {
    backgroundWorkPromise = backgroundWorkPromise.then(async () => {
      setupSummary.hasCreatedShortcut = await createShortcut();
    });

    showShortcutBanner();
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

    const {routes, setupRoutes} = await handleRouteGeneration(
      controller,
      options.routes || true, // TODO: Remove default value when multi-select UI component is available
    );

    setupSummary.i18n = i18nStrategy;
    setupSummary.routes = routes;
    backgroundWorkPromise = backgroundWorkPromise.then(() =>
      Promise.all([
        setupI18n({
          rootDirectory: project.directory,
          serverEntryPoint: language === 'ts' ? 'server.ts' : 'server.js',
        }).catch((error) => {
          setupSummary.i18nError = error as AbortError;
        }),
        setupRoutes(project.directory, language, i18nStrategy).catch(
          (error) => {
            setupSummary.routesError = error as AbortError;
          },
        ),
      ]),
    );
  }

  // Directory files are all setup, commit them to git
  backgroundWorkPromise = backgroundWorkPromise.then(() =>
    createInitialCommit(project.directory),
  );

  await renderTasks(tasks);

  await renderProjectReady(project, setupSummary);
}
