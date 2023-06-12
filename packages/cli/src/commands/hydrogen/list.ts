import Command from '@shopify/cli-kit/node/base-command';
import {pluralize} from '@shopify/cli-kit/common/string';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputContent,
  outputInfo,
  outputNewline,
} from '@shopify/cli-kit/node/output';
import {commonFlags} from '../../lib/flags.js';
import {getHydrogenShop} from '../../lib/shop.js';
import {parseGid} from '../../lib/graphql.js';
import {
  type Deployment,
  type HydrogenStorefront,
  getStorefrontsWithDeployment,
} from '../../lib/graphql/admin/list-storefronts.js';
import {logMissingStorefronts} from '../../lib/missing-storefronts.js';

export default class List extends Command {
  static description =
    'Returns a list of Hydrogen storefronts available on a given shop.';

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

  const {storefronts, adminSession} = await getStorefrontsWithDeployment(shop);

  if (storefronts.length > 0) {
    outputNewline();

    outputInfo(
      pluralizedStorefronts({
        storefronts,
        shop,
      }).toString(),
    );

    storefronts.forEach(
      ({currentProductionDeployment, id, productionUrl, title}) => {
        outputNewline();

        outputInfo(
          outputContent`${colors.whiteBright(title)} ${colors.dim(
            `(id: ${parseGid(id)})`,
          )}`.value,
        );

        if (productionUrl) {
          outputInfo(
            outputContent`    ${colors.whiteBright(productionUrl)}`.value,
          );
        }

        if (currentProductionDeployment) {
          outputInfo(
            outputContent`    ${colors.dim(
              formatDeployment(currentProductionDeployment),
            )}`.value,
          );
        }
      },
    );
  } else {
    logMissingStorefronts(adminSession);
  }
}

const dateFormat = new Intl.DateTimeFormat('default', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

export function formatDeployment(deployment: Deployment) {
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

const pluralizedStorefronts = ({
  storefronts,
  shop,
}: {
  storefronts: HydrogenStorefront[];
  shop: string;
}) => {
  return pluralize(
    storefronts,
    (storefronts) =>
      `Showing ${storefronts.length} Hydrogen storefronts for the store ${shop}`,
    (_storefront) => `Showing 1 Hydrogen storefront for the store ${shop}`,
  );
};
