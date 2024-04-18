import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

import {renderMissingLink} from './render-errors.js';
import {linkStorefront} from '../commands/hydrogen/link.js';
import {getStorefronts} from './graphql/admin/link-storefront.js';
import {verifyLinkedStorefront} from './verify-linked-storefront.js';

vi.mock('@shopify/cli-kit/node/ui');
vi.mock('./render-errors.js');
vi.mock('./graphql/admin/link-storefront.js');
vi.mock('../commands/hydrogen/link.js');

describe('verifyLinkedStorefront', async () => {
  const session = {
    token: '123',
    storeFqdn: 'www.snowdevil.com',
  };

  const config = {
    shop: 'snowdevil.myshopify.com',
    shopName: 'Snowdevil',
    email: 'merchant@shop.com',
    storefront: {
      id: '1',
      title: 'Snowboards',
    },
  };

  beforeEach(() => {
    vi.mocked(getStorefronts).mockResolvedValue([
      {
        id: config.storefront.id,
        title: config.storefront.title,
        parsedId: `gid://shopify/Storefront/${config.storefront.id}`,
        productionUrl: 'https://snowdevil.com',
      },
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders missing link if config.storefront is not set', async () => {
    await verifyLinkedStorefront({
      root: 'test-root',
      session,
      config: {
        ...config,
        storefront: undefined,
      },
      cliCommand: 'test',
    });

    expect(renderMissingLink).toHaveBeenCalled();
    expect(linkStorefront).toHaveBeenCalled();
  });

  it('renders missing link if config.storefront is set to an invalid storefront', async () => {
    await verifyLinkedStorefront({
      root: 'test-root',
      session,
      config: {
        ...config,
        storefront: {
          id: 'invalid',
          title: 'Invalid',
        },
      },
      cliCommand: 'test',
    });

    expect(renderMissingLink).toHaveBeenCalled();
    expect(linkStorefront).toHaveBeenCalled();
  });

  it('returns configured storefront if it is valid', async () => {
    const result = await verifyLinkedStorefront({
      root: 'test-root',
      session,
      config,
      cliCommand: 'test',
    });

    expect(result).toEqual({
      id: config.storefront.id,
      title: config.storefront.title,
      parsedId: `gid://shopify/Storefront/${config.storefront.id}`,
      productionUrl: 'https://snowdevil.com',
    });
  });
});
