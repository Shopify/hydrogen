import {renderInfo, renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  type AdminSession,
  logout as adminLogout,
  ensureAuthenticatedAdmin,
  ensureAuthenticatedBusinessPlatform,
} from '@shopify/cli-kit/node/session';
import {normalizeStoreFqdn} from '@shopify/cli-kit/node/context/fqdn';
import {getConfig, resetConfig, setShop} from './shopify-config.js';
import {muteAuthLogs} from './log.js';
import {getActiveShops} from './graphql/business-platform/active-shops.js';
import {renderTasks} from '@shopify/cli-kit/node/ui';
import ansiEscapes from 'ansi-escapes';

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
  if (shop === true) shop = (await getConfig(root)).shop;
  if (shop) shop = await normalizeStoreFqdn(shop);

  const hideLoginInfo = showLoginInfo();

  if (!shop) {
    const token = await ensureAuthenticatedBusinessPlatform().catch(() => {
      throw new AbortError(
        'Unable to authenticate with Shopify. Please report this issue.',
      );
    });

    const activeShops = await getActiveShops(token);

    await hideLoginInfo();

    shop = await renderSelectPrompt({
      message: 'Select a shop to log in to',
      choices: activeShops.map(({name, fqdn}) => ({
        label: `${name} (${fqdn})`,
        value: fqdn,
      })),
    });
  }

  const session = await ensureAuthenticatedAdmin(shop).catch(() => {
    throw new AbortError('Unable to authenticate with Shopify', undefined, [
      `Ensure the shop that you specified is correct (you are trying to use: ${shop})`,
    ]);
  });

  await hideLoginInfo();

  const config = await setShop(root, session.storeFqdn);

  return {session, config};
}

function showLoginInfo() {
  let deferredResolve: (value?: unknown) => void;
  const promise = new Promise((resolve) => {
    deferredResolve = resolve;
  });

  console.log('');

  let hasLoggedTimeout = false;
  let hasLoggedPressKey = false;

  const restoreLogs = muteAuthLogs({
    onKeyTimeout: (url) => {
      if (url) {
        hasLoggedTimeout = true;
        process.stdout.write(ansiEscapes.eraseLines(9));
        renderInfo({
          headline: 'Log in to Shopify',
          body: [
            `\nTimed out. Click to open your browser:`,
            {link: {url, label: 'Open'}},
          ],
        });
      }
    },
    onPressKey: () => {
      hasLoggedPressKey = true;
      renderInfo({
        headline: 'Log in to Shopify',
        body: 'Press any key to login with your default browser',
      });

      renderTasks([
        {
          title: 'Waiting for Shopify authentication',
          task: async () => {
            await promise;
          },
        },
      ]);
    },
  });

  promise.then(() => {
    restoreLogs();
    if (hasLoggedPressKey) {
      process.stdout.write(ansiEscapes.eraseLines(hasLoggedTimeout ? 12 : 10));
    }
  });

  return async () => {
    deferredResolve();
    // Without this timeout the process exits
    // right after `renderTasks` is done.
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
}
