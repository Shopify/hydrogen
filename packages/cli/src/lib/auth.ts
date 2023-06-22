import {renderTextPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  logout as adminLogout,
  ensureAuthenticatedAdmin,
  type AdminSession,
} from '@shopify/cli-kit/node/session';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';
import {getShop, resetConfig, setShop} from './shopify-config.js';

export type {AdminSession};

export async function logout(root: string) {
  await adminLogout();
  await resetConfig(root);
}

export async function login(root: string, shop?: string | true) {
  if (typeof shop !== 'string') {
    if (shop === true) shop = await getShop(root);

    if (!shop) {
      shop = await renderTextPrompt({
        message:
          'Specify which Store you would like to use (e.g. {store}.myshopify.com)',
        allowEmpty: false,
      });
    }
  }

  shop = await normalizeStoreFqdn(shop);

  const session = await ensureAuthenticatedAdmin(shop).catch(() => {
    throw new AbortError('Unable to authenticate with Shopify', undefined, [
      `Ensure the shop that you specified is correct (you are trying to use: ${shop})`,
    ]);
  });

  const config = await setShop(root, session.storeFqdn);

  return {session, config};
}
