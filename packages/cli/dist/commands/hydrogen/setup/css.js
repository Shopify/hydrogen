import { resolvePath } from '@shopify/cli-kit/node/path';
import { commonFlags, overrideFlag, flagsToCamelObject } from '../../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import { renderTasks, renderSuccess } from '@shopify/cli-kit/node/ui';
import { getPackageManager, installNodeModules } from '@shopify/cli-kit/node/node-package-manager';
import { Args } from '@oclif/core';
import { hasRemixConfigFile, getRemixConfig } from '../../../lib/remix-config.js';
import { SETUP_CSS_STRATEGIES, renderCssPrompt, setupCssStrategy, CSS_STRATEGY_NAME_MAP } from '../../../lib/setups/css/index.js';
import { AbortError } from '@shopify/cli-kit/node/error';

class SetupCSS extends Command {
  static descriptionWithMarkdown = "Adds support for certain CSS strategies to your project.";
  static description = "Setup CSS strategies for your project.";
  static flags = {
    ...commonFlags.path,
    ...commonFlags.force,
    ...overrideFlag(commonFlags.installDeps, { "install-deps": { default: true } })
  };
  static args = {
    strategy: Args.string({
      name: "strategy",
      description: `The CSS strategy to setup. One of ${SETUP_CSS_STRATEGIES.join()}`,
      options: SETUP_CSS_STRATEGIES
    })
  };
  async run() {
    const { flags, args } = await this.parse(SetupCSS);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();
    await runSetupCSS({
      ...flagsToCamelObject(flags),
      strategy: args.strategy,
      directory
    });
  }
}
async function runSetupCSS({
  strategy: flagStrategy,
  directory,
  force = false,
  installDeps = true
}) {
  if (!await hasRemixConfigFile(directory)) {
    throw new AbortError(
      "No remix.config.js file found. This command is not supported in Vite projects."
    );
  }
  const remixConfigPromise = getRemixConfig(directory);
  const strategy = flagStrategy ? flagStrategy : await renderCssPrompt();
  const remixConfig = await remixConfigPromise;
  const setupOutput = await setupCssStrategy(strategy, remixConfig, force);
  if (!setupOutput)
    return;
  const { workPromise, generatedAssets, helpUrl } = setupOutput;
  const tasks = [
    {
      title: "Updating files",
      task: async () => {
        await workPromise;
      }
    }
  ];
  if (installDeps) {
    const gettingPkgManagerPromise = getPackageManager(
      remixConfig.rootDirectory
    );
    tasks.push({
      title: "Installing new dependencies",
      task: async () => {
        const packageManager = await gettingPkgManagerPromise;
        await installNodeModules({
          directory: remixConfig.rootDirectory,
          packageManager,
          args: []
        });
      }
    });
  }
  await renderTasks(tasks);
  renderSuccess({
    headline: `${CSS_STRATEGY_NAME_MAP[strategy]} setup complete.`,
    body: (generatedAssets.length > 0 ? "You can now modify CSS configuration in the following files:\n" + generatedAssets.map((file) => `  - ${file}`).join("\n") + "\n" : "") + `
For more information, visit ${helpUrl}.`
  });
}

export { SetupCSS as default, runSetupCSS };
