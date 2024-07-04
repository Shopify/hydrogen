import { copy } from 'fs-extra/esm';
import { writeFile } from '@shopify/cli-kit/node/fs';
import { relativePath, joinPath } from '@shopify/cli-kit/node/path';
import { hyphenate } from '@shopify/cli-kit/common/string';
import colors from '@shopify/cli-kit/node/colors';
import { renderSelectPrompt, renderSuccess, renderConfirmationPrompt, renderTasks } from '@shopify/cli-kit/node/ui';
import { handleStorefrontLink, handleProjectLocation, createAbortHandler, generateProjectEntries, handleLanguage, createInitialCommit, handleCssStrategy, commitAll, handleDependencies, handleCliShortcut, handleI18n, handleRouteGeneration, renderProjectReady } from './common.js';
import { createStorefront } from '../graphql/admin/create-storefront.js';
import { waitForJob } from '../graphql/admin/fetch-job.js';
import { getStarterDir } from '../build.js';
import { replaceFileContent } from '../file.js';
import { setUserAccount, setStorefront } from '../shopify-config.js';
import { getCliCommand, ALIAS_NAME } from '../shell.js';
import { CSS_STRATEGY_NAME_MAP } from '../setups/css/index.js';

async function setupLocalStarterTemplate(options, controller) {
  const templateAction = options.mockShop ? "mock" : await renderSelectPrompt({
    message: "Connect to Shopify",
    choices: [
      {
        label: "Use sample data from mock.shop (You can connect a Shopify account later)",
        value: "mock"
      },
      { label: "Link your Shopify account", value: "link" }
    ],
    defaultValue: "mock",
    abortSignal: controller.signal
  });
  const storefrontInfo = templateAction === "link" ? await handleStorefrontLink(controller) : void 0;
  const project = await handleProjectLocation({
    ...options,
    storefrontInfo,
    controller
  });
  if (!project) return;
  if (templateAction === "mock") project.storefrontTitle = "Mock.shop";
  const abort = createAbortHandler(controller, project);
  const createStorefrontPromise = storefrontInfo && !storefrontInfo.id && createStorefront(storefrontInfo.session, storefrontInfo.title).then(async ({ storefront, jobId }) => {
    if (jobId) await waitForJob(storefrontInfo.session, jobId);
    return storefront;
  }).catch(abort);
  const templateDir = await getStarterDir();
  let backgroundWorkPromise = copy(
    templateDir,
    project.directory,
    // Filter out the `app` directory and server.ts, which will be generated later
    {
      filter: (filepath) => !/^(app\/|dist\/|node_modules\/|server\.ts)/i.test(
        relativePath(templateDir, filepath)
      )
    }
  ).then(
    () => (
      // Generate project entries and their file dependencies
      generateProjectEntries({
        rootDirectory: project.directory,
        appDirectory: joinPath(project.directory, "app"),
        typescript: true
        // Will be transpiled later
      })
    )
  ).catch(abort);
  const initMsg = {
    create: "Creating storefront",
    setup: `Setting up ${options.quickstart ? "Quickstart " : ""}project`,
    install: "Installing dependencies. This could take a few minutes"
  };
  const tasks = [
    {
      title: initMsg.create,
      task: async () => {
        await createStorefrontPromise;
      }
    },
    {
      title: initMsg.setup,
      task: async () => {
        await backgroundWorkPromise;
      }
    }
  ];
  const cliCommand = await getCliCommand();
  const envLeadingComment = `# The variables added in this file are only available locally in MiniOxygen.
# Run \`${cliCommand} link\` to also inject environment variables from your storefront,
# or \`${cliCommand} env pull\` to populate this file.`;
  backgroundWorkPromise = backgroundWorkPromise.then(() => {
    const promises = [
      // Add project name to package.json
      replaceFileContent(
        joinPath(project.directory, "package.json"),
        false,
        (content) => content.replace(
          /"name": "[^"]+"/,
          `"name": "${hyphenate(storefrontInfo?.title ?? project.name)}"`
        )
      )
    ];
    let storefrontToLink;
    if (storefrontInfo) {
      promises.push(
        // Save linked storefront in project
        setUserAccount(project.directory, storefrontInfo),
        // Write empty dotenv file to fallback to remote Oxygen variables
        writeFile(joinPath(project.directory, ".env"), envLeadingComment)
      );
      if (storefrontInfo.id) {
        storefrontToLink = { id: storefrontInfo.id, title: storefrontInfo.title };
      } else if (createStorefrontPromise) {
        promises.push(
          createStorefrontPromise.then((createdStorefront) => {
            storefrontToLink = createdStorefront;
          })
        );
      }
    } else if (templateAction === "mock") {
      promises.push(
        // Set required env vars
        writeFile(
          joinPath(project.directory, ".env"),
          envLeadingComment + "\n" + [["SESSION_SECRET", "foobar"]].map(([key, value]) => `${key}="${value}"`).join("\n") + "\n"
        )
      );
    }
    return Promise.all(promises).then(() => {
      if (storefrontToLink) {
        return setStorefront(project.directory, storefrontToLink);
      }
    }).catch(abort);
  });
  const { language, transpileProject } = await handleLanguage(
    project.directory,
    controller,
    options.language
  );
  backgroundWorkPromise = backgroundWorkPromise.then(() => transpileProject().catch(abort)).then(
    () => options.git ? createInitialCommit(project.directory) : void 0
  );
  const { setupCss, cssStrategy } = await handleCssStrategy(
    project.directory,
    controller,
    options.styling
  );
  if (cssStrategy) {
    backgroundWorkPromise = backgroundWorkPromise.then(() => setupCss().catch(abort)).then(
      () => options.git ? commitAll(
        project.directory,
        "Setup " + CSS_STRATEGY_NAME_MAP[cssStrategy]
      ) : void 0
    );
  }
  const { packageManager, shouldInstallDeps, installDeps } = await handleDependencies(
    project.directory,
    controller,
    options.packageManager,
    options.installDeps
  );
  const setupSummary = {
    language,
    packageManager,
    cssStrategy,
    depsInstalled: false,
    cliCommand: await getCliCommand("", packageManager)
  };
  if (shouldInstallDeps) {
    const installingDepsPromise = backgroundWorkPromise.then(async () => {
      try {
        await installDeps();
        setupSummary.depsInstalled = true;
      } catch (error) {
        setupSummary.depsError = error;
      }
    });
    tasks.push({
      title: initMsg.install,
      task: async () => {
        await installingDepsPromise;
      }
    });
  }
  const { createShortcut, showShortcutBanner } = await handleCliShortcut(
    controller,
    setupSummary.cliCommand,
    options.shortcut
  );
  if (createShortcut) {
    backgroundWorkPromise = backgroundWorkPromise.then(async () => {
      if (await createShortcut()) {
        setupSummary.cliCommand = ALIAS_NAME;
      }
    });
    showShortcutBanner();
  }
  if (options.quickstart) {
    console.log("\n");
  } else {
    renderSuccess({
      headline: [
        { userInput: storefrontInfo?.title ?? project.name },
        "is ready to build."
      ]
    });
  }
  const continueWithSetup = (options.i18n ?? options.routes) !== void 0 || await renderConfirmationPrompt({
    message: "Do you want to scaffold routes and core functionality?",
    confirmationMessage: "Yes, set up now",
    cancellationMessage: "No, set up later " + colors.dim(`(run \`${setupSummary.cliCommand} setup\`)`),
    abortSignal: controller.signal
  });
  if (continueWithSetup) {
    const { i18nStrategy, setupI18n } = await handleI18n(
      controller,
      setupSummary.cliCommand,
      options.i18n
    );
    const { setupRoutes } = await handleRouteGeneration(
      controller,
      options.routes ?? true
      // TODO: Remove default value when multi-select UI component is available
    );
    setupSummary.i18n = i18nStrategy;
    backgroundWorkPromise = backgroundWorkPromise.then(async () => {
      await setupI18n({
        rootDirectory: project.directory,
        serverEntryPoint: language === "ts" ? "server.ts" : "server.js"
      }).then(
        () => options.git ? commitAll(
          project.directory,
          `Setup markets support using ${i18nStrategy}`
        ) : void 0
      ).catch((error) => {
        setupSummary.i18nError = error;
      });
      await setupRoutes(project.directory, language, i18nStrategy).then((routes) => {
        setupSummary.routes = routes;
        if (options.git && routes) {
          return commitAll(
            project.directory,
            `Generate routes for core functionality`
          );
        }
      }).catch((error) => {
        setupSummary.routesError = error;
      });
    });
  }
  await renderTasks(tasks);
  if (options.git) {
    await commitAll(project.directory, "Lockfile");
  }
  await renderProjectReady(project, setupSummary);
  return {
    ...project,
    ...setupSummary
  };
}

export { setupLocalStarterTemplate };
