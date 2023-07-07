import {renderInfo} from '@shopify/cli-kit/node/ui';
import type {AdminSession} from '@shopify/cli-kit/node/session';

import {newHydrogenStorefrontUrl} from './admin-urls.js';

export function logMissingStorefronts(adminSession: AdminSession) {
  renderInfo({
    headline: 'Hydrogen storefronts',
    body: 'There are no Hydrogen storefronts on your Shop.',
    nextSteps: [
      `Ensure you have specified the correct shop (you specified: ${adminSession.storeFqdn})`,
      `Create a new Hydrogen storefront: ${newHydrogenStorefrontUrl(
        adminSession,
      )}`,
    ],
  });
}
