import {getCustomerPrivacy} from '@shopify/hydrogen';
import {useEffect} from 'react';

export function MyComponent() {
  useEffect(() => {
    const customerPrivacy = getCustomerPrivacy();
    if (customerPrivacy) {
      console.log('Customer privacy:', customerPrivacy);
    }
  }, []);
}
