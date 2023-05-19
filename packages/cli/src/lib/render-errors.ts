import {renderFatalError} from '@shopify/cli-kit/node/ui';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import type {AdminSession} from '@shopify/cli-kit/node/session';

import {hydrogenStorefrontsUrl} from './admin-urls.js';
import {parseGid} from './graphql.js';

interface MissingStorefront {
  adminSession: AdminSession;
  storefront: {
    id: string;
    title: string;
  };
}
export function renderMissingStorefront({
  adminSession,
  storefront,
}: MissingStorefront) {
  renderFatalError({
    name: 'NoStorefrontError',
    type: 0,
    message: outputContent`${outputToken.errorText(
      'Couldn’t find Hydrogen storefront.',
    )}`.value,
    tryMessage: outputContent`Couldn’t find ${storefront.title} (ID: ${parseGid(
      storefront.id,
    )}) on ${
      adminSession.storeFqdn
    }. Check that the storefront exists and run ${outputToken.genericShellCommand(
      `npx shopify hydrogen link`,
    )} to link this project to it.\n\n${outputToken.link(
      'Hydrogen Storefronts Admin',
      hydrogenStorefrontsUrl(adminSession),
    )}`.value,
  });
}

interface MissingLink {
  adminSession: AdminSession;
}
export function renderMissingLink({adminSession}: MissingLink) {
  renderFatalError({
    name: 'NoLinkedStorefrontError',
    type: 0,
    message: `No linked Hydrogen storefront on ${adminSession.storeFqdn}`,
    tryMessage:
      outputContent`To pull environment variables, link this project to a Hydrogen storefront. To select a storefront to link, run ${outputToken.genericShellCommand(
        `npx shopify hydrogen link`,
      )}.`.value,
  });
}
