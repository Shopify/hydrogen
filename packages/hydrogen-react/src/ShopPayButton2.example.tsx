import {ShopifyProvider, ShopPayButton} from '@shopify/hydrogen-react';

export default function App() {
  return (
    <ShopifyProvider
      storeDomain="my-store"
      storefrontToken="abc123"
      storefrontApiVersion="2024-04"
      countryIsoCode="CA"
      languageIsoCode="EN"
    >
      <AddVariantQuantity1 variantId="gid://shopify/ProductVariant/1" />
    </ShopifyProvider>
  );
}

export function AddVariantQuantity1({variantId}: {variantId: string}) {
  return <ShopPayButton variantIds={[variantId]} />;
}
