import { renderSelectPrompt, renderInfo, renderTasks, renderSuccess } from '@shopify/cli-kit/node/ui';
import { AbortError } from '@shopify/cli-kit/node/error';
import { logout as logout$1, ensureAuthenticatedBusinessPlatform, ensureAuthenticatedAdmin } from '@shopify/cli-kit/node/session';
import { normalizeStoreFqdn } from '@shopify/cli-kit/node/context/fqdn';
import { outputContent, outputToken } from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import ansiEscapes from 'ansi-escapes';
import { resetConfig, getConfig, setUserAccount } from './shopify-config.js';
import { getUserAccount } from './graphql/business-platform/user-account.js';
import { muteAuthLogs } from './log.js';
import { deferPromise } from './defer.js';

async function logout(root) {
  await logout$1();
  await resetConfig(root);
}
async function login(root, shop) {
  const forcePrompt = shop === true;
  const existingConfig = root ? await getConfig(root) : {};
  let { email, shopName } = existingConfig;
  if (typeof shop !== "string") {
    shop = existingConfig.shop;
  }
  if (shop)
    shop = await normalizeStoreFqdn(shop);
  const hideLoginInfo = showLoginInfo();
  if (!shop || !shopName || !email || forcePrompt || shop !== existingConfig.shop) {
    const token = await ensureAuthenticatedBusinessPlatform().catch(() => {
      throw new AbortError(
        "Unable to authenticate with Shopify. Please report this issue."
      );
    });
    const userAccount = await getUserAccount(token);
    await hideLoginInfo();
    const preselected = !forcePrompt && shop && userAccount.activeShops.find(({ fqdn }) => shop === fqdn);
    const selected = preselected || await renderSelectPrompt({
      message: "Select a shop to log in to",
      choices: userAccount.activeShops.map(({ name, fqdn }) => ({
        label: `${name} (${fqdn})`,
        value: { name, fqdn }
      }))
    });
    shop = selected.fqdn;
    shopName = selected.name;
    email = userAccount.email;
  }
  const session = await ensureAuthenticatedAdmin(shop).catch(() => {
    throw new AbortError("Unable to authenticate with Shopify", void 0, [
      `Ensure the shop that you specified is correct (you are trying to use: ${shop})`
    ]);
  });
  await hideLoginInfo();
  const config = root ? await setUserAccount(root, { shop, shopName, email }) : { shop, shopName, email };
  return { session, config };
}
function showLoginInfo() {
  const deferred = deferPromise();
  console.log("");
  let hasLoggedTimeout = false;
  let hasLoggedPressKey = false;
  const restoreLogs = muteAuthLogs({
    onKeyTimeout: (link) => {
      if (link) {
        hasLoggedTimeout = true;
        process.stdout.write(ansiEscapes.eraseLines(9));
        try {
          const secureLink = link.replace("http://", "https://");
          const url = new URL(secureLink);
          const label = url.origin + "/..." + url.search.slice(-14);
          renderInfo({
            headline: "Log in to Shopify",
            body: outputContent`Timed out. Click to open your browser:\n${outputToken.link(
              colors.white(label),
              secureLink
            )}`.value
          });
        } catch {
        }
      }
    },
    onPressKey: () => {
      hasLoggedPressKey = true;
      renderInfo({
        headline: "Log in to Shopify",
        body: "Press any key to login with your default browser"
      });
      process.stdin.once("data", () => {
        renderTasks([
          {
            title: "Waiting for Shopify authentication",
            task: async () => {
              await deferred.promise;
            }
          }
        ]);
      });
    }
  });
  deferred.promise.then(() => {
    restoreLogs();
    if (hasLoggedPressKey) {
      process.stdout.write(ansiEscapes.eraseLines(hasLoggedTimeout ? 11 : 10));
    }
  });
  return async () => {
    deferred.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
}
function renderLoginSuccess(config) {
  renderSuccess({
    headline: "Shopify authentication complete",
    body: [
      "You are logged in to",
      { userInput: config.shopName ?? config.shop ?? "your store" },
      ...config.email ? ["as", { userInput: config.email }] : []
    ]
  });
}

export { login, logout, renderLoginSuccess };
