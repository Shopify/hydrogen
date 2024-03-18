import Command from '@shopify/cli-kit/node/base-command';
import {fileURLToPath} from 'node:url';
import {packageManagerFromUserAgent} from '@shopify/cli-kit/node/node-package-manager';
import {Flags} from '@oclif/core';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {
  commonFlags,
  parseProcessFlags,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {
  STYLING_CHOICES,
  type StylingChoice,
} from './../../lib/setups/css/index.js';
import {I18N_CHOICES, type I18nChoice} from '../../lib/setups/i18n/index.js';
import {supressNodeExperimentalWarnings} from '../../lib/process.js';
import {
  setupRemoteTemplate,
  setupLocalStarterTemplate,
  type InitOptions,
} from '../../lib/onboarding/index.js';
import {LANGUAGES} from '../../lib/onboarding/common.js';

const FLAG_MAP = {f: 'force'} as Record<string, string>;

export default class Init extends Command {
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
      default: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_MOCK_DATA',
    }),
    ...commonFlags.styling,
    ...commonFlags.markets,
    ...commonFlags.shortcut,
    routes: Flags.boolean({
      description: 'Generate routes for all pages.',
      env: 'SHOPIFY_HYDROGEN_FLAG_ROUTES',
      hidden: true,
      allowNo: true,
    }),
    git: Flags.boolean({
      description: 'Init Git and create initial commits.',
      env: 'SHOPIFY_HYDROGEN_FLAG_GIT',
      default: true,
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    // Rename markets => i18n
    const {
      flags: {markets, ..._flags},
    } = await this.parse(Init);
    const flags = {..._flags, i18n: markets};

    if (flags.i18n && !I18N_CHOICES.includes(flags.i18n as I18nChoice)) {
      throw new AbortError(
        `Invalid URL structure strategy: ${
          flags.i18n
        }. Must be one of ${I18N_CHOICES.join(', ')}`,
      );
    }

    if (
      flags.styling &&
      !STYLING_CHOICES.includes(flags.styling as StylingChoice)
    ) {
      throw new AbortError(
        `Invalid styling strategy: ${
          flags.styling
        }. Must be one of ${STYLING_CHOICES.join(', ')}`,
      );
    }

    await runInit(flagsToCamelObject(flags) as InitOptions);
  }
}

export async function runInit(
  options: InitOptions = parseProcessFlags(process.argv, FLAG_MAP),
) {
  supressNodeExperimentalWarnings();

  options.git ??= true;

  const showUpgrade = await checkHydrogenVersion(
    // Resolving the CLI package from a local directory might fail because
    // this code could be run from a global dependency (e.g. on `npm create`).
    // Therefore, pass the known path to the package.json directly from here:
    fileURLToPath(new URL('../../../package.json', import.meta.url)),
    'cli',
  );

  if (showUpgrade) {
    const packageManager = packageManagerFromUserAgent();
    showUpgrade(
      packageManager === 'unknown'
        ? ''
        : `Please use the latest version with \`${packageManager} create @shopify/hydrogen@latest\``,
    );
  }

  const controller = new AbortController();

  try {
    const template = options.template;

    return template
      ? await setupRemoteTemplate({...options, template}, controller)
      : await setupLocalStarterTemplate(options, controller);
  } catch (error) {
    controller.abort();
    throw error;
  }
}
