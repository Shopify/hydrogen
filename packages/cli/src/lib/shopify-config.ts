import {resolvePath, dirname} from '@shopify/cli-kit/node/path';
import {readFile, mkdir, fileExists, writeFile} from '@shopify/cli-kit/node/fs';
import {AbortError} from '@shopify/cli-kit/node/error';

export const SHOPIFY_DIR = '.shopify';
export const SHOPIFY_DIR_PROJECT = 'project.json';

export interface ShopifyConfig {
  shop: string;
  shopName: string;
  email: string;
  storefront?: {
    id: string;
    title: string;
  };
}

export async function resetConfig(root: string): Promise<void> {
  const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);

  if (!(await fileExists(filePath))) {
    return;
  }

  await writeFile(filePath, JSON.stringify({}));
}

export async function getConfig(root: string): Promise<Partial<ShopifyConfig>> {
  const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);

  if (!(await fileExists(filePath))) {
    return {};
  }

  return JSON.parse(await readFile(filePath));
}

export async function setUserAccount(
  root: string,
  {shop, shopName, email}: Omit<ShopifyConfig, 'storefront'>,
) {
  const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);

  let existingConfig: Partial<ShopifyConfig> = {};

  if (await fileExists(filePath)) {
    existingConfig = JSON.parse(await readFile(filePath));
  } else {
    await mkdir(dirname(filePath));
  }

  const newConfig = {
    ...existingConfig,
    shop,
    shopName,
    email,
  };

  await writeFile(filePath, JSON.stringify(newConfig));
  await ensureShopifyGitIgnore(root);

  return newConfig;
}

/**
 * Adds storefront information to the config
 *
 * @param root the target directory
 * @returns the updated config
 */
export async function setStorefront(
  root: string,
  {id, title}: NonNullable<ShopifyConfig['storefront']>,
) {
  try {
    const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);

    const existingConfig: ShopifyConfig = JSON.parse(await readFile(filePath));

    const config = {
      ...existingConfig,
      storefront: {id, title},
    };

    await writeFile(filePath, JSON.stringify(config));
    await ensureShopifyGitIgnore(root);

    return config;
  } catch {
    throw new AbortError('Project configuration could not be found.');
  }
}

/**
 * Removes storefront information from the config
 *
 * @param root the target directory
 * @returns the updated config
 */
export async function unsetStorefront(
  root: string,
): Promise<Partial<ShopifyConfig>> {
  try {
    const filePath = resolvePath(root, SHOPIFY_DIR, SHOPIFY_DIR_PROJECT);

    const existingConfig: Partial<ShopifyConfig> = JSON.parse(
      await readFile(filePath),
    );

    const config = {
      ...existingConfig,
      storefront: undefined,
    };

    await writeFile(filePath, JSON.stringify(config));
    await ensureShopifyGitIgnore(root);

    return config;
  } catch {
    throw new AbortError('Project configuration could not be found.');
  }
}

/**
 * Conditionally adds .shopify to the directory's .gitignore file
 * @param root
 * @returns A boolean; true if the .gitignore was updated, false if there was
 * an error or the .gitignore didn't need updating
 */
export async function ensureShopifyGitIgnore(root: string): Promise<boolean> {
  try {
    const gitIgnoreFilePath = resolvePath(root, '.gitignore');

    let gitIgnoreContents = (await fileExists(gitIgnoreFilePath))
      ? await readFile(gitIgnoreFilePath)
      : '';

    if (gitIgnoreContents.includes('.shopify')) {
      return false;
    }

    if (gitIgnoreContents.length > 0) {
      gitIgnoreContents += `\n`;
    }

    gitIgnoreContents += `${SHOPIFY_DIR}\r\n`;

    await writeFile(gitIgnoreFilePath, gitIgnoreContents);

    return true;
  } catch {
    return false;
  }
}
