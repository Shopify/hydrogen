import type {Story} from '@ladle/react';
import {
  ShopifyProvider,
  useShop,
  type ShopifyProviderProps,
} from './ShopifyProvider.js';

const Template: Story<{
  storeDomain: string;
  storefrontToken: string;
  version: string;
}> = ({storeDomain, storefrontToken, version}) => {
  const config: ShopifyProviderProps = {
    storeDomain,
    storefrontToken,
    storefrontApiVersion: version,
    countryIsoCode: 'CA',
    languageIsoCode: 'EN',
  };
  return (
    <ShopifyProvider {...config}>
      <TemplateChildren />
    </ShopifyProvider>
  );
};

const TemplateChildren = () => {
  const shopValues = useShop();
  return (
    <>
      Use the Controls tab change these values on the fly
      {(Object.keys(shopValues) as Array<keyof typeof shopValues>).map(
        (key) => {
          return (
            <p key={key}>
              <>
                <strong>{key}: </strong>
                {typeof shopValues[key] === 'string'
                  ? shopValues[key]
                  : JSON.stringify(shopValues[key])}
              </>
            </p>
          );
        }
      )}
    </>
  );
};

export const Default = Template.bind({});
Default.args = {
  storeDomain: 'notashop.myshopify.com',
  storefrontToken: 'abc123',
  version: '2023-01',
};
