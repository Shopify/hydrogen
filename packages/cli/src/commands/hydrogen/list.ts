import Command from '@shopify/cli-kit/node/base-command';
import {pluralize} from '@shopify/cli-kit/common/string';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputContent,
  outputInfo,
  outputNewline,
} from '@shopify/cli-kit/node/output';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../lib/flags.js';
import {parseGid} from '../../lib/gid.js';
import {
  type Deployment,
  type HydrogenStorefront,
  getStorefrontsWithDeployment,
} from '../../lib/graphql/admin/list-storefronts.js';
import {newHydrogenStorefrontUrl} from '../../lib/admin-urls.js';
import {login} from '../../lib/auth.js';
import {getCliCommand} from '../../lib/shell.js';

export default class List extends Command {
  static descriptionWithMarkdown =
    'Lists all remote Hydrogen storefronts available to link to your local development environment.';

  static description =
    'Returns a list of Hydrogen storefronts available on a given shop.';

  static flags = {
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(List);
    await runList(flags);
  }
}

interface Flags {
  path?: string;
}

export async function runList({path: root = process.cwd()}: Flags) {
  const {session} = await login(root);

  const storefronts = await getStorefrontsWithDeployment(session);

  if (storefronts.length > 0) {
    outputNewline();

    outputInfo(
      pluralizedStorefronts({
        storefronts,
        shop: session.storeFqdn,
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
    renderInfo({
      headline: 'Hydrogen storefronts',
      body: 'There are no Hydrogen storefronts on your Shop.',
      nextSteps: [
        `Ensure you are logged in to the correct shop (currently: ${session.storeFqdn})`,
        `Create a new Hydrogen storefront: Run \`${await getCliCommand(
          root,
        )} link\` or visit ${newHydrogenStorefrontUrl(session)}`,
      ],
    });
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
