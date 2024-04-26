import { getStorefronts } from './graphql/admin/link-storefront.js';
import { linkStorefront } from '../commands/hydrogen/link.js';
import { renderMissingLink } from './render-errors.js';

async function verifyLinkedStorefront({
  root,
  session,
  config,
  cliCommand
}) {
  const storefronts = await getStorefronts(session);
  let configuredStorefront = config.storefront?.id ? storefronts.find(({ id }) => id === config.storefront.id) : void 0;
  if (configuredStorefront) {
    return configuredStorefront;
  }
  renderMissingLink({ noStorefronts: !storefronts.length });
  return await linkStorefront(root, session, config, {
    force: true,
    cliCommand,
    storefronts
  });
}

export { verifyLinkedStorefront };
