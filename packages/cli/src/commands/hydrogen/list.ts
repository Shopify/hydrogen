import {writeJsonResult} from '../../lib/json-output.js';
import {jsonFlag} from '@shopify/cli-kit/node/cli';
import {
  listJsonOutputSchema,
  toListResult,
} from '../../lib/storefronts/types.js';
import Command from '../../lib/hydrogen-command.js';
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
  static get jsonOutputSchema(): typeof listJsonOutputSchema {
    return listJsonOutputSchema;
  }

  static descriptionWithMarkdown =
    'Lists all remote Hydrogen storefronts available to link to your local development environment.';

  static description = this.descriptionForHelp();

  static flags = {
    ...jsonFlag,
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(List);
    await runList(flags, flags.json);
  }
}

interface Flags {
  path?: string;
}

export async function listStorefronts({path: root = process.cwd()}: Flags) {
  const {session} = await login(root);

  const storefronts = await getStorefrontsWithDeployment(session);

  return {shop: session.storeFqdn, storefronts};
}

export async function runList(options: Flags, json?: boolean) {
  const result = await listStorefronts(options);
  if (!writeJsonResult(listJsonOutputSchema, toListResult(result), json))
    await renderStorefronts(result, options.path);
  return result;
}

async function renderStorefronts(
  {shop, storefronts}: {shop: string; storefronts: HydrogenStorefront[]},
  root?: string,
) {
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
    renderInfo({
      headline: 'Hydrogen storefronts',
      body: 'There are no Hydrogen storefronts on your Shop.',
      nextSteps: [
        `Ensure you are logged in to the correct shop (currently: ${shop})`,
        `Create a new Hydrogen storefront: Run \`${await getCliCommand(
          root,
        )} link\` or visit ${newHydrogenStorefrontUrl({storeFqdn: shop})}`,
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
