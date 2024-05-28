import Command from '@shopify/cli-kit/node/base-command';
import {fileURLToPath} from 'node:url';
import {
  packageManager,
  packageManagerFromUserAgent,
} from '@shopify/cli-kit/node/node-package-manager';
import {Flags} from '@oclif/core';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  commonFlags,
  parseProcessFlags,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {I18N_CHOICES, type I18nChoice} from '../../lib/setups/i18n/index.js';
import {supressNodeExperimentalWarnings} from '../../lib/process.js';
import {setupTemplate, type InitOptions} from '../../lib/onboarding/index.js';
import {LANGUAGES} from '../../lib/onboarding/common.js';
import {
  currentProcessIsGlobal,
  inferPackageManagerForGlobalCLI,
} from '@shopify/cli-kit/node/is-global';

const FLAG_MAP = {f: 'force'} as Record<string, string>;

export default class Init extends Command {
  static descriptionWithMarkdown = 'Creates a new Hydrogen storefront.';
  static description = 'Creates a new Hydrogen storefront.';
  static flags = {
    ...commonFlags.force,
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
        'Scaffolds project based on an existing template or example from the Hydrogen repository.',
      env: 'SHOPIFY_HYDROGEN_FLAG_TEMPLATE',
    }),
    ...commonFlags.installDeps,
    'mock-shop': Flags.boolean({
      description: 'Use mock.shop as the data source for the storefront.',
      env: 'SHOPIFY_HYDROGEN_FLAG_MOCK_DATA',
    }),
    ...commonFlags.markets,
    ...commonFlags.shortcut,
    routes: Flags.boolean({
      description: 'Generate routes for all pages.',
      env: 'SHOPIFY_HYDROGEN_FLAG_ROUTES',
      allowNo: true,
    }),
    git: Flags.boolean({
      description: 'Init Git and create initial commits.',
      env: 'SHOPIFY_HYDROGEN_FLAG_GIT',
      default: true,
      allowNo: true,
    }),
    quickstart: Flags.boolean({
      description:
        'Scaffolds a new Hydrogen project with a set of sensible defaults. Equivalent to `shopify hydrogen init --path hydrogen-quickstart --mock-shop --language js --shortcut --routes --markets none`',
      env: 'SHOPIFY_HYDROGEN_FLAG_QUICKSTART',
      default: false,
    }),
    'package-manager': Flags.string({
      env: 'SHOPIFY_HYDROGEN_FLAG_PACKAGE_MANAGER',
      hidden: true,
      options: ['npm', 'yarn', 'pnpm', 'unknown'],
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Init);
    await runInit(flagsToCamelObject(flags) as InitOptions);
  }
}

export async function runInit(
  {
    markets,
    ...options
  }: InitOptions & {markets?: InitOptions['i18n']} = parseProcessFlags(
    process.argv,
    FLAG_MAP,
  ),
) {
  supressNodeExperimentalWarnings();

  // Rename markets => i18n
  if (!options.i18n && markets) {
    options.i18n = markets;
  }

  if (options.i18n && !I18N_CHOICES.includes(options.i18n as I18nChoice)) {
    throw new AbortError(
      `Invalid URL structure strategy: ${
        options.i18n
      }. Must be one of ${I18N_CHOICES.join(', ')}`,
    );
  }

  options.git ??= true;

  /**
   * Quickstart options. A set of sensible defaults to streamline documentation.
   * Nullish coalescing assignment means you can still override individual options by flag:
   * $ h2 init --quickstart --language ts --no-install-deps
   */
  if (options.quickstart) {
    options.i18n ??= 'none';
    options.installDeps ??= true;
    options.language ??= 'js';
    options.mockShop ??= true;
    options.path ??= './hydrogen-quickstart';
    options.routes ??= true;
    options.shortcut ??= true;
  }

  // If the current process is global (shopify hydrogen init) we need to check for @shopify/cli version
  const isGlobal = currentProcessIsGlobal();
  const showUpgrade = await checkHydrogenVersion(
    // Resolving the CLI package from a local directory might fail because
    // this code could be run from a global dependency (e.g. on `npm create`).
    // Therefore, pass the known path to the package.json directly from here:
    fileURLToPath(new URL('../../../package.json', import.meta.url)),
    isGlobal ? 'cli' : 'cliHydrogen',
  );

  if (showUpgrade) {
    const packageManager =
      options.packageManager ??
      packageManagerFromUserAgent() ??
      inferPackageManagerForGlobalCLI();
    const globalInstallCommand =
      packageManager === 'yarn'
        ? `yarn global add @shopify/cli`
        : `${packageManager} install -g @shopify/cli`;
    const globalMessage = `Please install the latest Shopify CLI version with \`${globalInstallCommand}\` and try again.`;
    const localMessage = `Please use the latest version with \`${packageManager} create @shopify/hydrogen@latest\``;
    const message = isGlobal ? globalMessage : localMessage;
    showUpgrade(message);
  }

  return setupTemplate(options);
}
