import {renderTextPrompt} from '@shopify/cli-kit/node/ui';
import {AbortError} from '@shopify/cli-kit/node/error';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';

import {getConfig, setShop} from './shopify-config.js';

interface Flags {
  shop?: string;
  path?: string;
}

export async function getHydrogenShop(flags: Flags): Promise<string> {
  const {shop: flagShop, path: flagPath} = flags;
  const targetPath = flagPath ?? process.cwd();
  const {shop: configShop} = await getConfig(targetPath);

  let promptShop;
  if (!flagShop && !configShop) {
    promptShop = await renderTextPrompt({
      message:
        'Specify which Shop you would like to use (e.g. janes-goods.myshopify.com)',
      allowEmpty: false,
    });
  }

  const shop = flagShop || configShop || promptShop;

  if (!shop) {
    throw new AbortError(
      'A shop is required',
      `Specify the shop passing ${
        outputContent`${outputToken.genericShellCommand(
          `--shop={your_shop_url}}`,
        )}`.value
      } or set the ${
        outputContent`${outputToken.genericShellCommand('SHOPIFY_SHOP')}`.value
      } environment variable.`,
    );
  }

  if (!configShop || (flagShop && flagShop != configShop)) {
    await setShop(targetPath, shop);
  }

  return shop;
}
