import { resolvePath, dirname } from '@shopify/cli-kit/node/path';
import { fileExists, writeFile, readFile, mkdir } from '@shopify/cli-kit/node/fs';
import { AbortError } from '@shopify/cli-kit/node/error';

const SHOPIFY_DIR = ".shopify";
const SHOPIFY_DIR_PROJECT = "project.json";
async function resetConfig(root) {
  const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);
  if (!await fileExists(filePath)) {
    return;
  }
  await writeFile(filePath, JSON.stringify({}));
}
async function getConfig(root) {
  const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);
  if (!await fileExists(filePath)) {
    return {};
  }
  return JSON.parse(await readFile(filePath));
}
async function setUserAccount(root, { shop, shopName, email }) {
  const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);
  let existingConfig = {};
  if (await fileExists(filePath)) {
    existingConfig = JSON.parse(await readFile(filePath));
  } else {
    await mkdir(dirname(filePath));
  }
  const newConfig = {
    ...existingConfig,
    shop,
    shopName,
    email
  };
  await writeFile(filePath, JSON.stringify(newConfig));
  await ensureShopifyGitIgnore(root);
  return newConfig;
}
async function setStorefront(root, { id, title }) {
  try {
    const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);
    const existingConfig = JSON.parse(await readFile(filePath));
    const config = {
      ...existingConfig,
      storefront: { id, title }
    };
    await writeFile(filePath, JSON.stringify(config));
    await ensureShopifyGitIgnore(root);
    return config;
  } catch {
    throw new AbortError("Project configuration could not be found.");
  }
}
async function unsetStorefront(root) {
  try {
    const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);
    const existingConfig = JSON.parse(
      await readFile(filePath)
    );
    const config = {
      ...existingConfig,
      storefront: void 0
    };
    await writeFile(filePath, JSON.stringify(config));
    await ensureShopifyGitIgnore(root);
    return config;
  } catch {
    throw new AbortError("Project configuration could not be found.");
  }
}
async function ensureShopifyGitIgnore(root) {
  try {
    const gitIgnoreFilePath = resolvePath(root, ".gitignore");
    let gitIgnoreContents = await fileExists(gitIgnoreFilePath) ? await readFile(gitIgnoreFilePath) : "";
    if (gitIgnoreContents.includes(".shopify")) {
      return false;
    }
    if (gitIgnoreContents.length > 0) {
      gitIgnoreContents += `
`;
    }
    gitIgnoreContents += `${SHOPIFY_DIR}\r
`;
    await writeFile(gitIgnoreFilePath, gitIgnoreContents);
    return true;
  } catch {
    return false;
  }
}
async function setCustomerAccountConfig(root, customerAccountConfig) {
  try {
    const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);
    const existingConfig = JSON.parse(await readFile(filePath));
    const config = {
      ...existingConfig,
      storefront: {
        ...existingConfig.storefront,
        customerAccountConfig
      }
    };
    await writeFile(filePath, JSON.stringify(config));
    await ensureShopifyGitIgnore(root);
    return config;
  } catch {
    throw new AbortError("Project configuration could not be found.");
  }
}

export { SHOPIFY_DIR, SHOPIFY_DIR_PROJECT, ensureShopifyGitIgnore, getConfig, resetConfig, setCustomerAccountConfig, setStorefront, setUserAccount, unsetStorefront };
