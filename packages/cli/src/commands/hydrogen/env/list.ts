import {Flags} from '@oclif/core';
import Command from '@shopify/cli-kit/node/base-command';
import {renderConfirmationPrompt, renderTable} from '@shopify/cli-kit/node/ui';
import {
  outputContent,
  outputToken,
  outputNewline,
} from '@shopify/cli-kit/node/output';

import {linkStorefront} from '../link.js';
import {adminRequest} from '../../../lib/graphql.js';
import {commonFlags} from '../../../lib/flags.js';
import {getHydrogenShop} from '../../../lib/shop.js';
import {getAdminSession} from '../../../lib/admin-session.js';
import {
  ListEnvironmentsQuery,
  ListEnvironmentsSchema,
} from '../../../lib/graphql/admin/list-environments.js';
import {getConfig} from '../../../lib/shopify-config.js';
import {
  renderMissingLink,
  renderMissingStorefront,
} from '../../../lib/render-errors.js';

export default class List extends Command {
  static description = 'List the environments on your Hydrogen storefront.';

  static hidden = true;

  static flags = {
    path: commonFlags.path,
    shop: commonFlags.shop,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(List);
    await listEnvironments(flags);
  }
}

interface Flags {
  path?: string;
  shop?: string;
}

export async function listEnvironments({path, shop: flagShop}: Flags) {
  const shop = await getHydrogenShop({path, shop: flagShop});
  const adminSession = await getAdminSession(shop);
  const actualPath = path ?? process.cwd();
  let configStorefront = (await getConfig(actualPath)).storefront;

  if (!configStorefront?.id) {
    renderMissingLink({adminSession});

    const runLink = await renderConfirmationPrompt({
      message: outputContent`Run ${outputToken.genericShellCommand(
        `npx shopify hydrogen link`,
      )}?`.value,
    });

    if (!runLink) {
      return;
    }

    await linkStorefront({path, shop: flagShop, silent: true});
  }

  configStorefront = (await getConfig(actualPath)).storefront;

  if (!configStorefront) {
    return;
  }

  const result: ListEnvironmentsSchema = await adminRequest(
    ListEnvironmentsQuery,
    adminSession,
    {
      id: configStorefront.id,
    },
  );

  const hydrogenStorefront = result.hydrogenStorefront;

  if (!hydrogenStorefront) {
    renderMissingStorefront({adminSession, storefront: configStorefront});
    return;
  }

  // Make sure we always show the preview environment last because it doesn't
  // have a branch or a URL.
  const previewEnvironmentIndex = hydrogenStorefront.environments.findIndex(
    (env) => env.type === 'PREVIEW',
  );
  const previewEnvironment = hydrogenStorefront.environments.splice(
    previewEnvironmentIndex,
    1,
  );
  hydrogenStorefront.environments.push(previewEnvironment[0]!);

  const rows = hydrogenStorefront.environments.map(
    ({branch, name, url, type}) => {
      // If a custom domain is set it will be available on the storefront itself
      // so we want to use that value instead.
      const environmentUrl =
        type === 'PRODUCTION' ? hydrogenStorefront.productionUrl : url;

      return {
        name,
        branch: branch ? branch : '-',
        url: environmentUrl ? environmentUrl : '-',
      };
    },
  );

  outputNewline();

  renderTable({
    rows,
    columns: {
      name: {
        header: 'Name',
        color: 'whiteBright',
      },
      branch: {
        header: 'Branch',
        color: 'yellow',
      },
      url: {
        header: 'URL',
        color: 'green',
      },
    },
  });
}
