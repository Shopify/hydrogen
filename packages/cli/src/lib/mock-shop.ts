import {AbortError} from '@shopify/cli-kit/node/error';
import {fetch} from '@shopify/cli-kit/node/http';

export const MOCK_SHOP_APEX = 'mock.shop';
export const MOCK_SHOP_DIRECTORY_URL = 'https://mock.shop/llms.txt';

export type MockShopStore = {
  /** Host that serves the store, e.g. `pets.mock.shop`. */
  host: string;
  name: string;
  summary: string;
};

const DIRECTORY_LINE = /^- \[(.+?)\]\(https?:\/\/([^/)]+)\/api\)(?::\s*(.*))?$/;
const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Parses the store list from mock.shop's llms.txt directory. Each store is one
 * line: `- [Name](https://<host>/api): <summary>`.
 */
export function parseMockShopDirectory(text: string): MockShopStore[] {
  const stores: MockShopStore[] = [];

  for (const line of text.split('\n')) {
    const match = line.match(DIRECTORY_LINE);
    if (!match) continue;

    const [, name, host, summary = ''] = match;
    stores.push({name: name!.trim(), host: host!, summary: summary.trim()});
  }

  return stores;
}

/**
 * Turns whatever a user typed for a store (`pets`, `pets.mock.shop`,
 * `https://pets.mock.shop/api`) into the host that serves it. The bare apex
 * means the default store.
 */
export function normalizeMockShopStore(input: string): string {
  const value = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  if (value === '' || value === MOCK_SHOP_APEX) return MOCK_SHOP_APEX;
  if (value.endsWith(`.${MOCK_SHOP_APEX}`)) return value;
  if (DNS_LABEL.test(value)) return `${value}.${MOCK_SHOP_APEX}`;

  throw new AbortError(
    `"${input}" is not a mock.shop store.`,
    `Pass a store's subdomain (pets) or host (pets.mock.shop) from ${MOCK_SHOP_DIRECTORY_URL}.`,
  );
}

/**
 * Fetches the live store directory. Any failure yields an empty list so that
 * scaffolding never blocks on mock.shop being reachable.
 */
export async function fetchMockShopStores(
  fetchFn: typeof fetch = fetch,
  timeoutMs = 4000,
): Promise<MockShopStore[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(MOCK_SHOP_DIRECTORY_URL, {
      signal: controller.signal,
    });
    if (!response.ok) return [];
    return parseMockShopDirectory(await response.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
