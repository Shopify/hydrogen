import {writeJsonResult} from '../../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {
  envListJsonOutputSchema,
  toEnvironment,
} from '../../../lib/environments/types.js';
import Command from '../../../lib/hydrogen-command.js';
import {pluralize} from '@shopify/cli-kit/common/string';
import {
  outputContent,
  outputInfo,
  outputNewline,
} from '@shopify/cli-kit/node/output';
import {commonFlags} from '../../../lib/flags.js';
import {getStorefrontEnvironments} from '../../../lib/graphql/admin/list-environments.js';
import {createEnvironmentCliChoiceLabel} from '../../../lib/common.js';
import {renderMissingStorefront} from '../../../lib/render-errors.js';
import {login} from '../../../lib/auth.js';
import {getCliCommand} from '../../../lib/shell.js';
import {verifyLinkedStorefront} from '../../../lib/verify-linked-storefront.js';

export default class EnvList extends Command {
  static get jsonOutputSchema(): typeof envListJsonOutputSchema {
    return envListJsonOutputSchema;
  }

  static descriptionWithMarkdown =
    'Lists all environments available on the linked Hydrogen storefront.';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(EnvList);
    await runEnvList(flags, flags.json);
  }
}

interface EnvListOptions {
  path?: string;
}

export async function runEnvList(options: EnvListOptions, json?: boolean) {
  const result = await listEnvironments(options);
  if (
    !writeJsonResult(envListJsonOutputSchema, result, json) &&
    result.storefront
  )
    renderEnvironments(result);
  return result;
}

export async function listEnvironments({
  path: root = process.cwd(),
}: EnvListOptions): Promise<
  import('../../../lib/environments/types.js').EnvListResult
> {
  const [{session, config}, cliCommand] = await Promise.all([
    login(root),
    getCliCommand(),
  ]);

  const linkedStorefront = await verifyLinkedStorefront({
    root,
    session,
    config,
    cliCommand,
  });

  if (!linkedStorefront)
    return {status: 'cancelled', storefront: null, environments: []};

  config.storefront = linkedStorefront;

  const storefront = await getStorefrontEnvironments(
    session,
    config.storefront.id,
  );

  if (!storefront) {
    renderMissingStorefront({
      session,
      storefront: config.storefront,
      cliCommand,
    });

    return {status: 'skipped', storefront: null, environments: []};
  }

  // Make sure we always show the preview environment last because it doesn't
  // have a branch or a URL.
  const environments = [
    ...storefront.environments.filter((env) => env.type !== 'PREVIEW'),
    ...storefront.environments.filter((env) => env.type === 'PREVIEW'),
  ];
  return {
    status: 'success',
    storefront: {
      gid: storefront.id,
      name: config.storefront.title,
      productionUrl: storefront.productionUrl || null,
    },
    environments: environments.map(toEnvironment),
  };
}

function renderEnvironments(
  storefront: NonNullable<
    import('../../../lib/environments/types.js').EnvListResult
  >,
) {
  outputInfo(
    pluralizedEnvironments({
      environments: storefront.environments,
      storefrontTitle: storefront.storefront!.name,
    }).toString(),
  );

  storefront.environments.forEach(({name, handle, branch, type, url}) => {
    outputNewline();

    // If a custom domain is set it will be available on the storefront itself
    // so we want to use that value instead.
    const environmentUrl =
      type === 'PRODUCTION' ? storefront.storefront!.productionUrl : url;

    outputInfo(
      outputContent`${createEnvironmentCliChoiceLabel(name, handle, branch)}`
        .value,
    );
    if (environmentUrl) {
      outputInfo(outputContent`    ${environmentUrl}`.value);
    }
  });

  outputNewline();
}

const pluralizedEnvironments = ({
  environments,
  storefrontTitle,
}: {
  environments: any[];
  storefrontTitle: string;
}) => {
  return pluralize(
    environments,
    (environments) =>
      `Showing ${environments.length} environments for the Hydrogen storefront ${storefrontTitle}`,
    (_environment) =>
      `Showing 1 environment for the Hydrogen storefront ${storefrontTitle}`,
    () =>
      `There are no environments for the Hydrogen storefront ${storefrontTitle}`,
  );
};
