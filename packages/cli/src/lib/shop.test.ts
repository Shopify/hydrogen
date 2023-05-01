import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {AbortError} from '@shopify/cli-kit/node/error';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {renderTextPrompt} from '@shopify/cli-kit/node/ui';

import {getHydrogenShop} from './shop.js';
import {getConfig, setShop} from './shopify-config.js';

vi.mock('@shopify/cli-kit/node/ui');
vi.mock('./shopify-config.js');

describe('getHydrogenShop()', () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockResolvedValue({});
  });

  afterEach(() => {
    mockAndCaptureOutput().clear();
    vi.clearAllMocks();
  });

  describe('when a shop is passed via flag', () => {
    it('returns the shop', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        const shop = await getHydrogenShop({shop: 'my-shop', path: tmpDir});

        expect(shop).toBe('my-shop');
      });
    });
  });

  describe('when a shop is not provided via flag', () => {
    describe('and there is no existing SHOP_NAME file', () => {
      it('prompts the user to enter a new name', async () => {
        await inTemporaryDirectory(async (tmpDir) => {
          vi.mocked(renderTextPrompt).mockResolvedValue('my-prompted-shop');

          const shop = await getHydrogenShop({path: tmpDir});

          expect(renderTextPrompt).toHaveBeenCalledWith({
            message:
              'Specify which Shop you would like to use (e.g. janes-goods.myshopify.com)',
            allowEmpty: false,
          });
          expect(shop).toBe('my-prompted-shop');
        });
      });

      describe('and the user does not enter a value', () => {
        it('throws an error', async () => {
          await inTemporaryDirectory(async (tmpDir) => {
            vi.mocked(renderTextPrompt).mockResolvedValue('');

            await expect(getHydrogenShop({path: tmpDir})).rejects.toThrow(
              AbortError,
            );
          });
        });
      });
    });

    describe('and there is an existing shop from the config file', () => {
      it('returns the shop', async () => {
        vi.mocked(getConfig).mockResolvedValue({shop: 'previous-shop'});

        await inTemporaryDirectory(async (tmpDir) => {
          const shop = await getHydrogenShop({path: tmpDir});

          expect(shop).toBe('previous-shop');
        });
      });
    });
  });

  describe('when the SHOP_NAME file does not exist', () => {
    it('gets created', async () => {
      await inTemporaryDirectory(async (tmpDir) => {
        await getHydrogenShop({shop: 'new-shop', path: tmpDir});

        expect(setShop).toHaveBeenCalledWith(tmpDir, 'new-shop');
      });
    });
  });

  describe('when the shop is different from the value in SHOP_NAME', () => {
    it('overwrites SHOP_NAME with the new value', async () => {
      vi.mocked(getConfig).mockResolvedValue({shop: 'previous-shop'});

      await inTemporaryDirectory(async (tmpDir) => {
        await getHydrogenShop({shop: 'new-shop', path: tmpDir});

        expect(setShop).toHaveBeenCalledWith(tmpDir, 'new-shop');
      });
    });
  });
});
