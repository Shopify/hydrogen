import {Flags} from '@oclif/core';
import type {FlagProps} from '@oclif/core/lib/interfaces/parser.js';
import {camelize} from '@shopify/cli-kit/common/string';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';
import colors from '@shopify/cli-kit/node/colors';
import type {CamelCasedProperties, PartialDeep} from 'type-fest';
import {STYLING_CHOICES} from './setups/css/index.js';
import {I18N_CHOICES} from './setups/i18n/index.js';

export const DEFAULT_APP_PORT = 3000;
export const DEFAULT_INSPECTOR_PORT = 9229;

export const commonFlags = {
  path: {
    path: Flags.string({
      description:
        'The path to the directory of the Hydrogen storefront. Defaults to the current directory where the command is run.',
      env: 'SHOPIFY_HYDROGEN_FLAG_PATH',
    }),
  },
  port: {
    port: Flags.integer({
      description: `The port to run the server on. Defaults to ${DEFAULT_APP_PORT}.`,
      env: 'SHOPIFY_HYDROGEN_FLAG_PORT',
    }),
  },
  legacyRuntime: {
    'legacy-runtime': Flags.boolean({
      description:
        'Runs the app in a Node.js sandbox instead of an Oxygen worker.',
      env: 'SHOPIFY_HYDROGEN_FLAG_LEGACY_RUNTIME',
    }),
  },
  force: {
    force: Flags.boolean({
      description:
        'Overwrites the destination directory and files if they already exist.',
      env: 'SHOPIFY_HYDROGEN_FLAG_FORCE',
      char: 'f',
    }),
  },
  shop: {
    shop: Flags.string({
      char: 's',
      description:
        'Shop URL. It can be the shop prefix (janes-apparel)' +
        ' or the full myshopify.com URL (janes-apparel.myshopify.com, https://janes-apparel.myshopify.com).',
      env: 'SHOPIFY_SHOP',
      parse: async (input) => normalizeStoreFqdn(input),
    }),
  },
  installDeps: {
    'install-deps': Flags.boolean({
      description:
        'Auto installs dependencies using the active package manager.',
      env: 'SHOPIFY_HYDROGEN_FLAG_INSTALL_DEPS',
      allowNo: true,
    }),
  },
  env: {
    env: Flags.string({
      description:
        'Specifies the environment to perform the operation using its handle. Fetch the handle using the `env list` command.',
      exclusive: ['env-branch'],
    }),
  },
  /**
   * @deprecated use `env` instead.
   */
  envBranch: {
    'env-branch': Flags.string({
      description:
        'Specifies the environment to perform the operation using its Git branch name.',
      env: 'SHOPIFY_HYDROGEN_ENVIRONMENT_BRANCH',
      deprecated: {
        to: 'env',
        message: '--env-branch is deprecated. Use --env instead.',
      },
    }),
  },
  envFile: {
    'env-file': Flags.string({
      description:
        "Path to an environment file to override existing environment variables. \
Defaults to the '.env' located in your project path `--path`.",
      required: false,
      default: '.env',
    }),
  },
  sourcemap: {
    sourcemap: Flags.boolean({
      description:
        'Controls whether server sourcemaps are generated. Default to `true`. Deactivate `--no-sourcemaps`.',
      env: 'SHOPIFY_HYDROGEN_FLAG_SOURCEMAP',
      default: true,
      allowNo: true,
    }),
  },
  codegen: {
    codegen: Flags.boolean({
      description:
        'Automatically generates GraphQL types for your project’s Storefront API queries.',
      required: false,
    }),
    'codegen-config-path': Flags.string({
      description:
        'Specifies a path to a codegen configuration file. Defaults to `<root>/codegen.ts` if this file exists.',
      required: false,
      dependsOn: ['codegen'],
    }),
  },
  styling: {
    styling: Flags.string({
      description: `Sets the styling strategy to use. One of ${STYLING_CHOICES.map(
        (item) => `\`${item}\``,
      ).join(', ')}.`,
      choices: STYLING_CHOICES,
      env: 'SHOPIFY_HYDROGEN_FLAG_STYLING',
    }),
  },
  markets: {
    markets: Flags.string({
      description: `Sets the URL structure to support multiple markets. Must be one of: ${I18N_CHOICES.map(
        (item) => `\`${item}\``,
      ).join(', ')}. Example: \`--markets subfolders\`.`,
      choices: I18N_CHOICES,
      env: 'SHOPIFY_HYDROGEN_FLAG_I18N',
    }),
  },
  shortcut: {
    shortcut: Flags.boolean({
      description:
        'Creates a global h2 shortcut for Shopify CLI using shell aliases. Deactivate with `--no-shortcut`.',
      env: 'SHOPIFY_HYDROGEN_FLAG_SHORTCUT',
      allowNo: true,
    }),
  },
  debug: {
    debug: Flags.boolean({
      description:
        'Enables inspector connections to the server with a debugger such as Visual Studio Code or Chrome DevTools.',
      env: 'SHOPIFY_HYDROGEN_FLAG_DEBUG',
    }),
  },
  inspectorPort: {
    'inspector-port': Flags.integer({
      description: `The port where the inspector is available. Defaults to ${DEFAULT_INSPECTOR_PORT}.`,
      env: 'SHOPIFY_HYDROGEN_FLAG_INSPECTOR_PORT',
    }),
  },
  diff: {
    diff: Flags.boolean({
      description:
        "Applies the current files on top of Hydrogen's starter template in a temporary directory.",
      required: false,
      hidden: true,
    }),
  },
  entry: {
    entry: Flags.string({
      description: 'Entry file for the worker. Defaults to `./server`.',
      env: 'SHOPIFY_HYDROGEN_FLAG_ENTRY',
    }),
  },
  lockfileCheck: {
    'lockfile-check': Flags.boolean({
      allowNo: true,
      default: true,
      description:
        'Checks that there is exactly one valid lockfile in the project. Defaults to `true`. Deactivate with `--no-lockfile-check`.',
      env: 'SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK',
    }),
  },
  disableRouteWarning: {
    'disable-route-warning': Flags.boolean({
      description: 'Disables any warnings about missing standard routes.',
      env: 'SHOPIFY_HYDROGEN_FLAG_DISABLE_ROUTE_WARNING',
    }),
  },
  customerAccountPush: {
    'customer-account-push__unstable': Flags.boolean({
      hidden: true,
      description:
        "Use tunneling for local development and push the tunneling domain to admin. Required to use Customer Account API's Oauth flow",
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_CUSTOMER_ACCOUNT_PUSH',
    }),
  },
  verbose: {
    verbose: Flags.boolean({
      description: "Outputs more information about the command's execution.",
      required: false,
      env: 'SHOPIFY_HYDROGEN_FLAG_VERBOSE',
    }),
  },
} satisfies Record<string, Record<Lowercase<string>, FlagProps>>;

export function flagsToCamelObject<T extends Record<string, any>>(obj: T) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[camelize(key) as any] = value;
    return acc;
  }, {} as any) as CamelCasedProperties<T>;
}

/**
 * Parse process arguments into an object for use in the cli as flags.
 * This is used when starting the init command from create-hydrogen without Oclif.
 * @example
 * input: `node ./bin --force --no-install-deps --language js`
 * output: { force: true, installDeps: false,  language: 'js' }
 */
export function parseProcessFlags(
  processArgv: string[],
  flagMap: Record<string, string> = {},
) {
  const [, , ...args] = processArgv;

  const options = {} as Record<string, string | boolean>;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg?.startsWith('-')) {
      let key = arg.replace(/^\-{1,2}/, '');
      let value = !nextArg || nextArg.startsWith('-') ? true : nextArg;

      if (value === true && key.startsWith('no-')) {
        value = false;
        key = key.replace('no-', '');
      }

      options[flagMap[key] || key] = value;
    }
  }

  return flagsToCamelObject(options);
}

/**
 * Create a deprecated flag to prevent the CLI from crashing when a deprecated flag is used.
 * Displays an info message when the flag is used.
 * @param name The name of the flag.
 */
export function deprecated(name: string, {isBoolean = false} = {}) {
  const customFlag = Flags.custom<unknown>({
    parse: () => {
      renderInfo({
        headline: `The ${colors.bold(
          name,
        )} flag is deprecated and will be removed in a future version of Shopify Hydrogen CLI.`,
      });

      return Promise.resolve(' ');
    },
    hidden: true,
  });

  // Overwrite `type:'option'` to avoid requiring values for this flag
  return {
    ...customFlag(),
    type: (isBoolean ? 'boolean' : 'option') as unknown as 'option',
  };
}

export function overrideFlag<T extends Record<string, Record<string, any>>>(
  flags: T,
  extra: PartialDeep<T>,
) {
  return Object.entries(extra).reduce(
    (acc, [key, value]) => {
      acc[key as keyof T] = {...flags[key as keyof T], ...value};
      return acc;
    },
    {...flags},
  );
}
