import {getStorefronts} from './graphql/admin/link-storefront.js';
import {linkStorefront} from '../commands/hydrogen/link.js';
import {type AdminSession} from './auth.js';
import {type ShopifyConfig} from './shopify-config.js';
import {renderMissingLink} from './render-errors.js';

export async function verifyLinkedStorefront({
  root,
  session,
  config,
  cliCommand,
}: {
  root: string;
  session: AdminSession;
  config: ShopifyConfig;
  cliCommand: string;
}) {
  const storefronts = await getStorefronts(session);

  let configuredStorefront = config.storefront?.id
    ? storefronts.find(({id}) => id === config.storefront!.id)
    : undefined;

  if (configuredStorefront) {
    return configuredStorefront;
  }

  renderMissingLink({noStorefronts: !storefronts.length});

  return await linkStorefront(root, session, config, {
    force: true,
    cliCommand,
    storefronts,
  });
}
