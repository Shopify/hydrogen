import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
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
  static descriptionWithMarkdown =
    'Lists all environments available on the linked Hydrogen storefront.';

  static description =
    'List the environments on your linked Hydrogen storefront.';

  static flags = {
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(EnvList);
    await runEnvList(flags);
  }
}

interface Flags {
  path?: string;
}

export async function runEnvList({path: root = process.cwd()}: Flags) {
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

  if (!linkedStorefront) return;

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

    return;
  }

  // Make sure we always show the preview environment last because it doesn't
  // have a branch or a URL.
  const previewEnvironmentIndex = storefront.environments.findIndex(
    (env) => env.type === 'PREVIEW',
  );
  const previewEnvironment = storefront.environments.splice(
    previewEnvironmentIndex,
    1,
  );
  storefront.environments.push(previewEnvironment[0]!);

  outputInfo(
    pluralizedEnvironments({
      environments: storefront.environments,
      storefrontTitle: config.storefront.title,
    }).toString(),
  );

  storefront.environments.forEach(({name, handle, branch, type, url}) => {
    outputNewline();

    // If a custom domain is set it will be available on the storefront itself
    // so we want to use that value instead.
    const environmentUrl =
      type === 'PRODUCTION' ? storefront.productionUrl : url;

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
