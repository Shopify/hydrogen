import {renderTextPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  logout as adminLogout,
  ensureAuthenticatedAdmin,
  type AdminSession,
} from '@shopify/cli-kit/node/session';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';
import {getConfig, resetConfig, setShop} from './shopify-config.js';
import {muteAuthLogs} from './log.js';

export type {AdminSession};

/**
 * Logs out of the currently authenticated shop and resets the local config.
 * @param root Root of the project to read and write config to.
 */
export async function logout(root: string) {
  await adminLogout();
  await resetConfig(root);
}

/**
 * Logs in to the specified shop and saves the shop domain to the project.
 * @param root Root of the project to read and write config to.
 * @param shop Shop string to use for authentication or `true` to read
 * from the local Shopify config. If not provided, the user will be
 * prompted to enter a shop domain.
 */
export async function login(root: string, shop?: string | true) {
  if (typeof shop !== 'string') {
    if (shop === true) shop = (await getConfig(root)).shop;

    if (!shop) {
      shop = await renderTextPrompt({
        message:
          'Specify which Store you would like to use (e.g. {store}.myshopify.com)',
        allowEmpty: false,
      });
    }
  }

  shop = await normalizeStoreFqdn(shop);

  muteAuthLogs();

  const session = await ensureAuthenticatedAdmin(shop).catch(() => {
    throw new AbortError('Unable to authenticate with Shopify', undefined, [
      `Ensure the shop that you specified is correct (you are trying to use: ${shop})`,
    ]);
  });

  const config = await setShop(root, session.storeFqdn);

  return {session, config};
}
