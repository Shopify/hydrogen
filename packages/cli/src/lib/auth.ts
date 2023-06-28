import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  type AdminSession,
  logout as adminLogout,
  ensureAuthenticatedAdmin,
  ensureAuthenticatedBusinessPlatform,
} from '@shopify/cli-kit/node/session';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';
import {getConfig, resetConfig, setUserAccount} from './shopify-config.js';
import {muteAuthLogs} from './log.js';
import {getUserAccount} from './graphql/business-platform/user-account.js';

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
export async function login(root?: string, shop?: string | true) {
  const forcePrompt = shop === true;
  const existingConfig = root ? await getConfig(root) : {};
  let {email, shopName} = existingConfig;

  if (typeof shop !== 'string') {
    shop = existingConfig.shop;
  }

  if (shop) shop = await normalizeStoreFqdn(shop);

  muteAuthLogs();

  if (!shop || shop !== existingConfig.shop || forcePrompt) {
    const token = await ensureAuthenticatedBusinessPlatform().catch(() => {
      throw new AbortError(
        'Unable to authenticate with Shopify. Please report this issue.',
      );
    });

    const userAccount = await getUserAccount(token);

    const selected = await renderSelectPrompt({
      message: 'Select a shop to log in to',
      choices: userAccount.activeShops.map(({name, fqdn}) => ({
        label: `${name} (${fqdn})`,
        value: {name, fqdn},
      })),
    });

    shop = selected.fqdn;
    shopName = selected.name;
    email = userAccount.email;
  }

  const session = await ensureAuthenticatedAdmin(shop).catch(() => {
    throw new AbortError('Unable to authenticate with Shopify', undefined, [
      `Ensure the shop that you specified is correct (you are trying to use: ${shop})`,
    ]);
  });

  const config = root
    ? await setUserAccount(root, {shop, shopName, email})
    : {shop, shopName, email};

  return {session, config};
}
