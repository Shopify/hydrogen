import { outputWarn } from '@shopify/cli-kit/node/output';
import { login } from './auth.js';
import { getCliCommand } from './shell.js';
import { renderMissingStorefront } from './render-errors.js';
import { getOxygenData } from './graphql/admin/get-oxygen-data.js';
import { verifyLinkedStorefront } from './verify-linked-storefront.js';

async function getOxygenDeploymentData({
  root
}) {
  const [{ session, config }, cliCommand] = await Promise.all([
    login(root),
    getCliCommand()
  ]);
  const linkedStorefront = await verifyLinkedStorefront({
    root,
    session,
    config,
    cliCommand
  });
  if (!linkedStorefront) return;
  config.storefront = linkedStorefront;
  const { storefront } = await getOxygenData(session, config.storefront.id);
  if (!storefront) {
    renderMissingStorefront({
      session,
      storefront: config.storefront,
      cliCommand
    });
    return;
  }
  if (!storefront.oxygenDeploymentToken) {
    outputWarn(`Could not retrieve a deployment token.`);
    return;
  }
  return storefront;
}

export { getOxygenDeploymentData };
