import {getCustomerPrivacyRequired} from '@shopify/hydrogen';
import {useEffect} from 'react';

export function MyComponent() {
  useEffect(() => {
    // This throws if the customer privacy is not available.
    const customerPrivacy = getCustomerPrivacyRequired();
    console.log('Customer privacy:', customerPrivacy);
  }, []);
}
