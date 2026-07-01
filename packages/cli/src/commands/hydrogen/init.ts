import Command from '@shopify/cli-kit/node/base-command';
import {Flags} from '@oclif/core';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  commonFlags,
  parseProcessFlags,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {checkCurrentCLIVersion} from '../../lib/check-cli-version.js';
import {
  STYLING_CHOICES,
  type StylingChoice,
} from '../../lib/setups/css/index.js';
import {I18N_CHOICES, type I18nChoice} from '../../lib/setups/i18n/index.js';
import {supressNodeExperimentalWarnings} from '../../lib/process.js';
import {setupTemplate, type InitOptions} from '../../lib/onboarding/index.js';
import {LANGUAGES} from '../../lib/onboarding/common.js';

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
    link: Flags.boolean({
      description:
        'Link the storefront to a Shopify account instead of using mock.shop.',
      env: 'SHOPIFY_HYDROGEN_FLAG_LINK',
      exclusive: ['mock-shop'],
    }),
    'mock-shop': Flags.boolean({
      description: 'Use mock.shop as the data source for the storefront.',
      env: 'SHOPIFY_HYDROGEN_FLAG_MOCK_DATA',
      exclusive: ['link'],
    }),
    storefront: Flags.string({
      description: 'The name of an existing Hydrogen storefront to link.',
      env: 'SHOPIFY_HYDROGEN_STOREFRONT',
    }),
    'storefront-name': Flags.string({
      description: 'The name to use when creating a new Hydrogen storefront.',
      env: 'SHOPIFY_HYDROGEN_STOREFRONT_NAME',
      exclusive: ['storefront'],
    }),
    ...commonFlags.styling,
    ...commonFlags.markets,
    ...commonFlags.shortcut,
    git: Flags.boolean({
      description: 'Init Git and create initial commits.',
      env: 'SHOPIFY_HYDROGEN_FLAG_GIT',
      default: true,
      allowNo: true,
    }),
    quickstart: Flags.boolean({
      description:
        'Scaffolds a new Hydrogen project with a set of sensible defaults. Equivalent to `shopify hydrogen init --path hydrogen-quickstart --mock-shop --language js --shortcut --markets none`',
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

  if (
    options.styling &&
    !STYLING_CHOICES.includes(options.styling as StylingChoice)
  ) {
    throw new AbortError(
      `Invalid styling strategy: ${
        options.styling
      }. Must be one of ${STYLING_CHOICES.join(', ')}`,
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
    options.shortcut ??= true;
    // TODO: enable Tailwind once v4 is stable
    options.styling ??= 'none';
  }

  const hasLinkOption =
    options.link || options.storefront || options.storefrontName;

  if (options.mockShop && hasLinkOption) {
    throw new AbortError(
      '`--mock-shop` cannot be used with Shopify storefront linking flags.',
      'Use either `--mock-shop` or one of `--link`, `--storefront`, or `--storefront-name`.',
    );
  }

  if (options.storefront && options.storefrontName) {
    throw new AbortError(
      '`--storefront` cannot be used with `--storefront-name`.',
      'Use `--storefront` to link an existing storefront or `--storefront-name` to create a new one.',
    );
  }

  const showUpgrade = await checkCurrentCLIVersion();
  if (showUpgrade) {
    showUpgrade(options.packageManager);
  }

  return setupTemplate(options);
}
