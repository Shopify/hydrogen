import { renderFatalError, renderInfo } from '@shopify/cli-kit/node/ui';
import { outputContent, outputToken } from '@shopify/cli-kit/node/output';
import { hydrogenStorefrontsUrl } from './admin-urls.js';
import { parseGid } from './gid.js';

function renderMissingStorefront({
  session,
  storefront,
  cliCommand
}) {
  renderFatalError({
    name: "NoStorefrontError",
    type: 0,
    message: outputContent`${outputToken.errorText(
      "Couldn\u2019t find Hydrogen storefront."
    )}`.value,
    skipOclifErrorHandling: true,
    tryMessage: outputContent`Couldn’t find ${storefront.title} (ID: ${parseGid(
      storefront.id
    )}) on ${session.storeFqdn}. Check that the storefront exists and run ${outputToken.genericShellCommand(
      `${cliCommand} link`
    )} to link this project to it.\n\n${outputToken.link(
      "Hydrogen Storefronts Admin",
      hydrogenStorefrontsUrl(session)
    )}`.value
  });
}
function renderMissingLink({ noStorefronts = false }) {
  const headline = noStorefronts ? "You don't have a Hydrogen storefront to link to" : "You haven't linked your project to a storefront yet";
  renderInfo({
    headline,
    body: [
      "Link your local environment to a Hydrogen storefront. Enable automatic environment variable injection and access to",
      { command: "env list" },
      ",",
      { command: "env pull" },
      ",",
      { command: "env push" },
      ", and",
      { command: "deploy" },
      "commands. Use",
      { command: `unlink` },
      "to disconnect from the storefront."
    ]
  });
}

export { renderMissingLink, renderMissingStorefront };
