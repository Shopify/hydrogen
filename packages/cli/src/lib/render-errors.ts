import {renderFatalError} from '@shopify/cli-kit/node/ui';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import type {AdminSession} from './auth.js';

import {hydrogenStorefrontsUrl} from './admin-urls.js';
import {parseGid} from './gid.js';

interface MissingStorefront {
  session: AdminSession;
  storefront: {id: string; title: string};
  cliCommand: string;
}

export function renderMissingStorefront({
  session,
  storefront,
  cliCommand,
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
      session.storeFqdn
    }. Check that the storefront exists and run ${outputToken.genericShellCommand(
      `${cliCommand} link`,
    )} to link this project to it.\n\n${outputToken.link(
      'Hydrogen Storefronts Admin',
      hydrogenStorefrontsUrl(session),
    )}`.value,
  });
}

interface MissingLink {
  session: AdminSession;
  cliCommand: string;
}

export function renderMissingLink({session, cliCommand}: MissingLink) {
  renderFatalError({
    name: 'NoLinkedStorefrontError',
    type: 0,
    message: `No linked Hydrogen storefront on ${session.storeFqdn}`,
    tryMessage: [
      'To pull environment variables, link this project to a Hydrogen storefront. To select a storefront to link, run',
      {command: `${cliCommand} link`},
    ],
  });
}
