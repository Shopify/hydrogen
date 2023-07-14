import Command from '@shopify/cli-kit/node/base-command';
import {fileURLToPath} from 'node:url';
import {packageManagerUsedForCreating} from '@shopify/cli-kit/node/node-package-manager';
import {Flags} from '@oclif/core';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {
  commonFlags,
  parseProcessFlags,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {SETUP_CSS_STRATEGIES} from './../../lib/setups/css/index.js';
import {I18N_CHOICES} from '../../lib/setups/i18n/index.js';
import {supressNodeExperimentalWarnings} from '../../lib/process.js';
import {
  setupRemoteTemplate,
  setupLocalStarterTemplate,
  type InitOptions,
} from '../../lib/onboarding/index.js';
import {
  LANGUAGES,
  type I18nChoice,
  type StylingChoice,
} from '../../lib/onboarding/common.js';

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
      choices: Object.keys(LANGUAGES),
      env: 'SHOPIFY_HYDROGEN_FLAG_LANGUAGE',
    }),
    template: Flags.string({
      description:
        'Sets the template to use. Pass `demo-store` for a fully-featured store template or `hello-world` for a barebones project.',
      env: 'SHOPIFY_HYDROGEN_FLAG_TEMPLATE',
    }),
    'install-deps': commonFlags.installDeps,
    'mock-shop': Flags.boolean({
      description: 'Use mock.shop as the data source for the storefront.',
      default: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_MOCK_DATA',
    }),
    styling: commonFlags.styling,
    i18n: commonFlags.i18n,
    shortcut: commonFlags.shortcut,
    routes: Flags.boolean({
      description: 'Generate routes for all pages.',
      env: 'SHOPIFY_HYDROGEN_FLAG_ROUTES',
      hidden: true,
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
