import Command from '@shopify/cli-kit/node/base-command';
import { AbortController } from '@shopify/cli-kit/node/abort';
import { renderTasks } from '@shopify/cli-kit/node/ui';
import { resolvePath, basename, joinPath } from '@shopify/cli-kit/node/path';
import { fileExists, glob, copyFile } from '@shopify/cli-kit/node/fs';
import { commonFlags, overrideFlag, flagsToCamelObject } from '../../lib/flags.js';
import { renderI18nPrompt, setupI18nStrategy } from '../../lib/setups/i18n/index.js';
import { getRemixConfig } from '../../lib/remix-config.js';
import { handleRouteGeneration, generateProjectEntries, handleCliShortcut, renderProjectReady } from '../../lib/onboarding/common.js';
import { getCliCommand, ALIAS_NAME } from '../../lib/shell.js';
import { getTemplateAppFile } from '../../lib/build.js';

class Setup extends Command {
  static description = "Scaffold routes and core functionality.";
  static flags = {
    ...commonFlags.path,
    ...commonFlags.force,
    ...commonFlags.markets,
    ...commonFlags.shortcut,
    ...overrideFlag(commonFlags.installDeps, {
      "install-deps": { default: true }
    })
  };
  async run() {
    const { flags } = await this.parse(Setup);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();
    await runSetup({
      ...flagsToCamelObject(flags),
      directory
    });
  }
}
async function runSetup(options) {
  const controller = new AbortController();
  const { rootDirectory, appDirectory, serverEntryPoint } = await getRemixConfig(
    options.directory
  );
  const location = basename(rootDirectory);
  const cliCommandPromise = getCliCommand();
  let backgroundWorkPromise = Promise.resolve();
  const tasks = [
    {
      title: "Setting up project",
      task: async () => {
        await backgroundWorkPromise;
      }
    }
  ];
  const i18nStrategy = options.markets ? options.markets : await renderI18nPrompt({
    abortSignal: controller.signal,
    extraChoices: { none: "Set up later" }
  });
  const i18n = i18nStrategy === "none" ? void 0 : i18nStrategy;
  const { needsRouteGeneration, setupRoutes } = await handleRouteGeneration(
    controller
  );
  let routes;
  if (needsRouteGeneration) {
    const templateRoot = await getTemplateAppFile("..");
    const [typescript, dtsFiles] = await Promise.all([
      fileExists(joinPath(rootDirectory, "tsconfig.json")),
      glob("*.d.ts", { cwd: templateRoot })
    ]);
    backgroundWorkPromise = backgroundWorkPromise.then(
      () => Promise.all([
        ...dtsFiles.map(
          (filename) => copyFile(
            joinPath(templateRoot, filename),
            resolvePath(rootDirectory, filename)
          )
        ),
        // Copy app entries
        generateProjectEntries({
          rootDirectory,
          appDirectory,
          typescript
        })
      ])
    ).then(async () => {
      routes = await setupRoutes(
        rootDirectory,
        typescript ? "ts" : "js",
        i18n
      );
    });
  }
  if (i18n) {
    backgroundWorkPromise = backgroundWorkPromise.then(
      () => setupI18nStrategy(i18n, { rootDirectory, serverEntryPoint })
    );
  }
  let cliCommand = await Promise.resolve(cliCommandPromise);
  const { createShortcut, showShortcutBanner } = await handleCliShortcut(
    controller,
    cliCommand,
    options.shortcut
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
      directory: rootDirectory
    },
    {
      cliCommand,
      depsInstalled: true,
      packageManager: "npm",
      i18n,
      routes
    }
  );
}

export { Setup as default, runSetup };
