import Command from '@shopify/cli-kit/node/base-command';
import {renderTable} from '@shopify/cli-kit/node/ui';
import {outputContent, outputInfo} from '@shopify/cli-kit/node/output';

import {adminRequest, parseGid} from '../../lib/graphql.js';
import {commonFlags} from '../../lib/flags.js';
import {getHydrogenShop} from '../../lib/shop.js';
import {getAdminSession} from '../../lib/admin-session.js';
import {
  ListStorefrontsQuery,
  ListStorefrontsSchema,
  Deployment,
} from '../../lib/graphql/admin/list-storefronts.js';
import {logMissingStorefronts} from '../../lib/missing-storefronts.js';

export default class List extends Command {
  static description =
    'Returns a list of Hydrogen storefronts available on a given shop.';

  static hidden = true;

  static flags = {
    path: commonFlags.path,
    shop: commonFlags.shop,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(List);
    await listStorefronts(flags);
  }
}

interface Flags {
  path?: string;
  shop?: string;
}

export async function listStorefronts({path, shop: flagShop}: Flags) {
  const shop = await getHydrogenShop({path, shop: flagShop});
  const adminSession = await getAdminSession(shop);

  const result: ListStorefrontsSchema = await adminRequest(
    ListStorefrontsQuery,
    adminSession,
  );

  const storefrontsCount = result.hydrogenStorefronts.length;

  if (storefrontsCount > 0) {
    outputInfo(
      outputContent`Found ${storefrontsCount.toString()} Hydrogen storefronts on ${shop}:\n`
        .value,
    );

    const rows = result.hydrogenStorefronts.map(
      ({id, title, productionUrl, currentProductionDeployment}) => ({
        id: parseGid(id),
        title,
        productionUrl,
        currentDeployment: formatDeployment(currentProductionDeployment),
      }),
    );

    renderTable({
      rows,
      columns: {
        id: {
          header: 'ID',
        },
        title: {
          header: 'Name',
          color: 'whiteBright',
        },
        productionUrl: {
          header: 'Production URL',
        },
        currentDeployment: {
          header: 'Current deployment',
        },
      },
    });
  } else {
    logMissingStorefronts(adminSession);
  }
}

const dateFormat = new Intl.DateTimeFormat('default', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function formatDeployment(deployment: Deployment | null) {
  let message = '';

  if (!deployment) {
    return message;
  }

  message += dateFormat.format(new Date(deployment.createdAt));

  if (deployment.commitMessage) {
    const title = deployment.commitMessage.split(/\n/)[0];
    message += `, ${title}`;
  }

  return message;
}
