import {resolvePath} from '@shopify/cli-kit/node/path';
import {commonFlags, deprecated, flagsToCamelObject} from '../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';

import {
  copyShopifyConfig,
  prepareDiffDirectory,
} from '../../lib/template-diff.js';

import {hasViteConfig} from '../../lib/vite-config.js';
import {runClassicCompilerDev} from '../../lib/classic-compiler/dev.js';

export default class Dev extends Command {
  static descriptionWithMarkdown = `Runs a Hydrogen storefront in a local runtime that emulates an Oxygen worker for development.

  If your project is [linked](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-link) to a Hydrogen storefront, then its environment variables will be loaded with the runtime.`;

  static description =
    'Runs Hydrogen storefront in an Oxygen worker for development.';
  static flags = {
    ...commonFlags.path,
    ...commonFlags.port,
    worker: deprecated('--worker', {isBoolean: true}),
    ...commonFlags.legacyRuntime,
    ...commonFlags.codegen,
    ...commonFlags.sourcemap,
    'disable-virtual-routes': Flags.boolean({
      description:
        "Disable rendering fallback routes when a route file doesn't exist.",
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_VIRTUAL_ROUTES',
      default: false,
    }),
    ...commonFlags.debug,
    ...commonFlags.inspectorPort,
    ...commonFlags.env,
    ...commonFlags.envBranch,
    'disable-version-check': Flags.boolean({
      description: 'Skip the version check when running `hydrogen dev`',
      default: false,
      required: false,
    }),
    ...commonFlags.diff,
    ...commonFlags.customerAccountPush,
    ...commonFlags.verbose,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Dev);
    const originalDirectory = flags.path
      ? resolvePath(flags.path)
      : process.cwd();
    let directory = originalDirectory;

    if (flags.diff) {
      directory = await prepareDiffDirectory(directory, true);
    }

    const devParams = {
      ...flagsToCamelObject(flags),
      customerAccountPush: flags['customer-account-push__unstable'],
      path: directory,
      cliConfig: this.config,
    };

    const {close} = (await hasViteConfig(directory ?? process.cwd()))
      ? await import('./dev-vite.js').then(({runViteDev}) =>
          runViteDev(devParams),
        )
      : await runClassicCompilerDev(devParams);

    // Note: Shopify CLI is hooking into process events and calling process.exit.
    // This means we are unable to hook into 'beforeExit' or 'SIGINT" events
    // to cleanup resources. In addition, Miniflare uses `exit-hook` dependency
    // to do the same thing. This is a workaround to ensure we cleanup resources:
    let closingPromise: Promise<void>;
    const processExit = process.exit;
    // @ts-expect-error - Async function
    process.exit = async (code?: number | undefined) => {
      // This function will be called multiple times,
      // but we only want to cleanup resources once.
      closingPromise ??= close();
      await closingPromise;
      return processExit(code);
    };

    if (flags.diff) {
      await copyShopifyConfig(directory, originalDirectory);
    }
  }
}
