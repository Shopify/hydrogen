import { readdir } from 'node:fs/promises';
import { packageManagerFromUserAgent, installNodeModules } from '@shopify/cli-kit/node/node-package-manager';
import { renderConfirmationPrompt, renderInfo, renderTextPrompt, renderSelectPrompt, renderFatalError, renderWarning, renderSuccess } from '@shopify/cli-kit/node/ui';
import { hyphenate, capitalize } from '@shopify/cli-kit/common/string';
import { joinPath, resolvePath, basename } from '@shopify/cli-kit/node/path';
import { initializeGitRepository, addAllToGitFromDirectory, createGitCommit } from '@shopify/cli-kit/node/git';
import { AbortError } from '@shopify/cli-kit/node/error';
import { rmdir, writeFile, fileExists, isDirectory } from '@shopify/cli-kit/node/fs';
import { outputDebug, formatPackageManagerCommand } from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import { login, renderLoginSuccess } from '../auth.js';
import { renderI18nPrompt, setupI18nStrategy, I18N_STRATEGY_NAME_MAP } from '../setups/i18n/index.js';
import { titleize } from '../string.js';
import { ALIAS_NAME, createPlatformShortcut } from '../shell.js';
import { transpileProject } from '../transpile/index.js';
import { CSS_STRATEGY_NAME_MAP } from '../setups/css/index.js';
import { renderRoutePrompt, generateRoutes, generateProjectFile } from '../setups/routes/generate.js';
import { execAsync } from '../process.js';
import { getStorefronts } from '../graphql/admin/link-storefront.js';

const LANGUAGES = {
  js: "JavaScript",
  ts: "TypeScript"
};
async function handleI18n(controller, cliCommand, flagI18n) {
  let selection = flagI18n ?? await renderI18nPrompt({
    abortSignal: controller.signal,
    extraChoices: {
      none: "Set up later " + colors.dim(`(run \`${cliCommand} setup markets\`)`)
    }
  });
  const i18nStrategy = selection === "none" ? void 0 : selection;
  return {
    i18nStrategy,
    setupI18n: async (options) => {
      if (i18nStrategy) {
        await setupI18nStrategy(i18nStrategy, options);
      }
    }
  };
}
async function handleRouteGeneration(controller, flagRoutes) {
  const routesToScaffold = flagRoutes === true ? "all" : flagRoutes === false ? [] : await renderRoutePrompt({
    abortSignal: controller.signal
  });
  const needsRouteGeneration = routesToScaffold === "all" || routesToScaffold.length > 0;
  return {
    needsRouteGeneration,
    setupRoutes: async (directory, language, i18nStrategy) => {
      if (needsRouteGeneration) {
        const result = await generateRoutes(
          {
            routeName: routesToScaffold,
            directory,
            force: true,
            typescript: language === "ts",
            localePrefix: i18nStrategy === "subfolders" ? "locale" : false,
            signal: controller.signal
          },
          {
            rootDirectory: directory,
            appDirectory: joinPath(directory, "app")
          }
        );
        return result.routeGroups;
      }
    }
  };
}
function generateProjectEntries(options) {
  return Promise.all(
    ["root", "entry.server", "entry.client", "../server.ts"].map(
      (filename) => generateProjectFile(filename, options)
    )
  );
}
async function handleCliShortcut(controller, cliCommand, flagShortcut) {
  if (cliCommand === ALIAS_NAME)
    return {};
  const shouldCreateShortcut = flagShortcut ?? await renderConfirmationPrompt({
    confirmationMessage: "Yes",
    cancellationMessage: "No",
    message: [
      "Create a global",
      { command: ALIAS_NAME },
      "alias to run commands instead of",
      { command: cliCommand },
      "?"
    ],
    abortSignal: controller.signal
  });
  if (!shouldCreateShortcut)
    return {};
  return {
    createShortcut: async () => {
      try {
        const shortcuts = await createPlatformShortcut();
        return shortcuts.length > 0;
      } catch (error) {
        outputDebug(
          "Failed to create shortcut." + (error?.stack ?? error?.message ?? error)
        );
        return false;
      }
    },
    showShortcutBanner: () => renderInfo({
      body: `You'll need to restart your terminal session to make \`${ALIAS_NAME}\` alias available.`
    })
  };
}
async function handleStorefrontLink(controller) {
  const { session, config } = await login();
  renderLoginSuccess(config);
  const storefronts = await getStorefronts(session);
  let selectedStorefront = await handleStorefrontSelection(storefronts);
  let title;
  if (selectedStorefront) {
    title = selectedStorefront.title;
  } else {
    title = await renderTextPrompt({
      message: "New storefront name",
      defaultValue: titleize(config.shopName),
      abortSignal: controller.signal
    });
  }
  return {
    ...config,
    id: selectedStorefront?.id,
    title,
    session
  };
}
async function handleStorefrontSelection(storefronts) {
  const choices = [
    {
      label: "Create a new storefront",
      value: null
    },
    ...storefronts.map(({ id, title, productionUrl }) => ({
      label: `${title} (${productionUrl})`,
      value: id
    }))
  ];
  if (choices.length === 1) {
    return;
  }
  const storefrontId = await renderSelectPrompt({
    message: "Select a Hydrogen storefront to link",
    choices
  });
  return storefrontId ? storefronts.find(({ id }) => id === storefrontId) : void 0;
}
async function handleProjectLocation({
  storefrontInfo,
  controller,
  force,
  path: flagPath
}) {
  const storefrontDirectory = storefrontInfo && hyphenate(storefrontInfo.title);
  let location = flagPath ?? storefrontDirectory ?? await renderTextPrompt({
    message: "Where would you like to create your storefront?",
    defaultValue: "hydrogen-storefront",
    abortSignal: controller.signal
  });
  let directory = resolvePath(process.cwd(), location);
  if (await projectExists(directory)) {
    if (!force && storefrontDirectory) {
      location = await renderTextPrompt({
        message: `There's already a folder called \`${storefrontDirectory}\`. Where do you want to create the app?`,
        defaultValue: storefrontDirectory,
        abortSignal: controller.signal
      });
      directory = resolvePath(process.cwd(), location);
      if (!await projectExists(directory)) {
        force = true;
      }
    }
    if (!force) {
      const deleteFiles = await renderConfirmationPrompt({
        message: `The directory ${colors.cyan(
          location
        )} is not empty. Do you want to delete the existing files and continue?`,
        defaultValue: false,
        abortSignal: controller.signal
      });
      if (!deleteFiles) {
        renderInfo({
          body: `Destination path ${colors.cyan(
            location
          )} already exists and is not an empty directory. You may use \`--force\` or \`-f\` to override it.`
        });
        return;
      }
    }
    await rmdir(directory, { force: true });
  }
  return {
    name: basename(location),
    location,
    // User input. E.g. "./hydrogen-storefront"
    directory,
    // Absolute path to location
    storefrontTitle: storefrontInfo?.title
  };
}
async function handleLanguage(projectDir, controller, flagLanguage) {
  const language = flagLanguage ?? await renderSelectPrompt({
    message: "Select a language",
    choices: [
      { label: "JavaScript", value: "js" },
      { label: "TypeScript", value: "ts" }
    ],
    defaultValue: "js",
    abortSignal: controller.signal
  });
  return {
    language,
    async transpileProject() {
      if (language !== "ts") {
        await transpileProject(projectDir);
      }
    }
  };
}
async function handleCssStrategy(projectDir, controller, flagStyling) {
  return {};
}
async function handleDependencies(projectDir, controller, packageManagerFromFlag, shouldInstallDeps) {
  const detectedPackageManager = packageManagerFromFlag ?? packageManagerFromUserAgent();
  let actualPackageManager = "npm";
  if (shouldInstallDeps !== false) {
    if (detectedPackageManager === "unknown") {
      const result = await renderSelectPrompt({
        message: `Select package manager to install dependencies`,
        choices: [
          { label: "NPM", value: "npm" },
          { label: "PNPM", value: "pnpm" },
          { label: "Yarn v1", value: "yarn" },
          { label: "Skip and install later", value: "no" }
        ],
        defaultValue: "npm",
        abortSignal: controller.signal
      });
      if (result === "no") {
        shouldInstallDeps = false;
      } else {
        actualPackageManager = result;
        shouldInstallDeps = true;
      }
    } else if (shouldInstallDeps === void 0) {
      actualPackageManager = detectedPackageManager;
      shouldInstallDeps = await renderConfirmationPrompt({
        message: `Install dependencies with ${detectedPackageManager}?`,
        confirmationMessage: "Yes",
        cancellationMessage: "No",
        abortSignal: controller.signal
      });
    }
  }
  return {
    packageManager: actualPackageManager,
    shouldInstallDeps,
    installDeps: shouldInstallDeps ? async () => {
      await installNodeModules({
        directory: projectDir,
        packageManager: actualPackageManager,
        args: [],
        signal: controller.signal
      });
    } : () => {
    }
  };
}
const gitIgnoreContent = `
node_modules
/.cache
/build
/dist
/public/build
/.mf
.env
.shopify
`.slice(1);
async function createInitialCommit(directory) {
  try {
    await initializeGitRepository(directory);
    await writeFile(joinPath(directory, ".gitignore"), gitIgnoreContent);
    if (process.env.NODE_ENV === "test" && process.env.CI) {
      await execAsync(`git config --global user.name "hydrogen"`);
      await execAsync(`git config --global user.email "hydrogen@shopify.com"`);
    }
    return commitAll(directory, "Scaffold Storefront");
  } catch (error) {
    outputDebug(
      "Failed to initialize Git.\n" + error?.stack
    );
  }
}
async function commitAll(directory, message) {
  try {
    await addAllToGitFromDirectory(directory);
    await createGitCommit(message, { directory });
  } catch (error) {
    outputDebug(
      "Failed to commit code.\n" + error?.stack
    );
  }
}
async function renderProjectReady(project, {
  language,
  packageManager,
  depsInstalled,
  cssStrategy,
  cliCommand,
  routes,
  i18n,
  depsError,
  i18nError,
  routesError
}) {
  const hasErrors = Boolean(depsError || i18nError || routesError);
  const bodyLines = [];
  if (project.storefrontTitle) {
    bodyLines.push(["Shopify", project.storefrontTitle]);
  }
  if (language) {
    bodyLines.push(["Language", LANGUAGES[language]]);
  }
  if (cssStrategy) {
    bodyLines.push(["Styling", CSS_STRATEGY_NAME_MAP[cssStrategy]]);
  }
  if (!i18nError && i18n) {
    bodyLines.push(["Markets", I18N_STRATEGY_NAME_MAP[i18n].split(" (")[0]]);
  }
  let routeSummary = "";
  if (!routesError && routes && Object.keys(routes).length) {
    bodyLines.push(["Routes", ""]);
    for (let [routeName, routePaths] of Object.entries(routes)) {
      routePaths = Array.isArray(routePaths) ? routePaths : [routePaths];
      let urls = [
        ...new Set(routePaths.map((item) => "/" + normalizeRoutePath(item)))
      ].sort();
      if (urls.length > 2) {
        const prefixesSet = new Set(urls.map((url) => url.split("/")[1] ?? ""));
        urls = [...prefixesSet].map((item) => "/" + item + "/*");
      }
      routeSummary += `
    \u2022 ${capitalize(routeName)} ${colors.dim(
        "(" + urls.join(" & ") + ")"
      )}`;
    }
  }
  const padMin = 1 + bodyLines.reduce((max, [label]) => Math.max(max, label.length), 0);
  const render = hasErrors ? renderWarning : renderSuccess;
  render({
    headline: `Storefront setup complete` + (hasErrors ? " with errors (see warnings below)." : "!"),
    body: bodyLines.map(
      ([label, value]) => `  ${(label + ":").padEnd(padMin, " ")}  ${colors.dim(value)}`
    ).join("\n") + routeSummary,
    // Use `customSections` instead of `nextSteps` and `references`
    // here to enforce a newline between title and items.
    customSections: [
      hasErrors && {
        title: "Warnings\n",
        body: [
          {
            list: {
              items: [
                depsError && [
                  "Failed to install dependencies:",
                  { subdued: depsError.message }
                ],
                i18nError && [
                  "Failed to scaffold Markets:",
                  { subdued: i18nError.message }
                ],
                routesError && [
                  "Failed to scaffold routes:",
                  { subdued: routesError.message }
                ]
              ].filter((step) => Boolean(step))
            }
          }
        ]
      },
      {
        title: "Next steps\n",
        body: [
          {
            list: {
              items: [
                [
                  "Run",
                  {
                    command: [
                      project.directory === process.cwd() ? void 0 : `cd ${project.location.replace(/^\.\//, "")}`,
                      depsInstalled ? void 0 : `${packageManager} install`,
                      formatPackageManagerCommand(packageManager, "dev")
                    ].filter(Boolean).join(" && ")
                  }
                ]
              ].filter((step) => Boolean(step))
            }
          }
        ]
      }
    ].filter((step) => Boolean(step))
  });
}
function createAbortHandler(controller, project) {
  return async function abort(error) {
    controller.abort();
    await Promise.resolve();
    if (project?.directory) {
      await rmdir(project.directory, { force: true }).catch(() => {
      });
    }
    renderFatalError(
      new AbortError(
        "Failed to initialize project: " + error?.message,
        error?.tryMessage ?? error?.stack
      )
    );
    process.exit(1);
  };
}
async function projectExists(projectDir) {
  return await fileExists(projectDir) && await isDirectory(projectDir) && (await readdir(projectDir)).length > 0;
}
function normalizeRoutePath(routePath) {
  return routePath.replace(/(^|\.)_index$/, "").replace(/((^|\.)[^\.]+)_\./g, "$1.").replace(/\.(?!\w+\])/g, "/").replace(/\$$/g, ":catchAll").replace(/\$/g, ":").replace(/[\[\]]/g, "").replace(/:\w*Handle/i, ":handle");
}
function generateRandomName() {
  function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  const geographicalFeature = getRandomElement([
    "Bay",
    "Bend",
    "Cape",
    "Cliff",
    "Cove",
    "Creek",
    "Dale",
    "Dune",
    "Fjord",
    "Glade",
    "Gulf",
    "Hill",
    "Isle",
    "Knoll",
    "Lake",
    "Loch",
    "Mesa",
    "Peak",
    "Pond",
    "Quay",
    "Reef",
    "Ridge",
    "Rise",
    "River",
    "Road",
    "Shore",
    "Strait",
    "Stream",
    "Vale",
    "Valley",
    "View",
    "Vista"
  ]);
  const colorNames = getRandomElement([
    "Crimson",
    "Azure",
    "Coral",
    "Fuchsia",
    "Indigo",
    "Ivory",
    "Lavender",
    "Lime",
    "Magenta",
    "Maroon",
    "Orchid",
    "Peach",
    "Plum",
    "Quartz",
    "Salmon",
    "Teal",
    "Turquoise",
    "Violet",
    "Yellow",
    "Ebony",
    "Jade",
    "Lilac",
    "Mint",
    "Onyx",
    "Pearl",
    "Ruby",
    "Sapphire",
    "Topaz"
  ]);
  return `${colorNames} ${geographicalFeature}`;
}

export { LANGUAGES, commitAll, createAbortHandler, createInitialCommit, generateProjectEntries, generateRandomName, handleCliShortcut, handleCssStrategy, handleDependencies, handleI18n, handleLanguage, handleProjectLocation, handleRouteGeneration, handleStorefrontLink, handleStorefrontSelection, renderProjectReady };
