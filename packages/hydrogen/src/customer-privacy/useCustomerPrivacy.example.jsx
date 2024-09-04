import {useCustomerPrivacy} from '@shopify/hydrogen';
import {useEffect} from 'react';

export function MyComponent() {
  const {customerPrivacy, privacyBanner = null} = useCustomerPrivacy({
    storefrontAccessToken: '12345',
    checkoutDomain: 'checkout.example.com',
    onVisitorConsentCollected: (consent) => {
      console.log('Visitor consent collected:', consent);
    },
  });

  useEffect(() => {
    if (customerPrivacy) {
      // check if user has marketing consent
      console.log(
        'User marketing consent:',
        customerPrivacy.analyticsProcessingAllowed(),
      );

      // or set tracking consent
      customerPrivacy.setTrackingConsent(
        {
          marketing: true,
          analytics: true,
          preferences: true,
          sale_of_data: true,
        },
        (data) => {
          if (data?.error) {
            console.error('Error setting tracking consent:', data.error);
            return;
          }
          console.log('Tracking consent set');
        },
      );
    }

    if (privacyBanner) {
      privacyBanner.loadBanner();

      // or show banner with specific locale and country
      // privacyBanner.loadBanner({locale: 'FR', country: 'CA'});

      // or show consent preferences banner
      // privacyBanner.showPreferences()

      // or show consent preferences banner with specific locale and country
      // privacyBanner.showPreferences({locale: 'FR', country: 'CA'});
    }
  }, [customerPrivacy, privacyBanner]);
}
