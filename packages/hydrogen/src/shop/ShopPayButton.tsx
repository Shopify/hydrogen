import {ShopPayButton as ShopPayButtonBase} from '@shopify/hydrogen-react';
import {ComponentProps} from 'react';

export function ShopPayButton(props: ComponentProps<typeof ShopPayButtonBase>) {
  return <ShopPayButtonBase channel="hydrogen" {...props} />;
}
