import {json} from '@remix-run/server-runtime';

/**
 * A custom loader handler that fetches the changelog.json from GitHub.
 * It is used by the `upgrade` command inside `https://hydrogen.shopify.dev/changelog.json`
 */
export async function createChangelogHandler({request}: {request: Request}) {
  const searchParams = new URL(request.url).searchParams;

  const GITHUB_CHANGELOG_URL =
    'https://github.com/Shopify/hydrogen/blob/main/packages/cli/src/changelog.json';

  return async function changelogHandler() {
    const requestInit = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    try {
      const response = await fetch(GITHUB_CHANGELOG_URL, requestInit);
      const changelog = await response.json();
      return json(changelog);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return json(
        {error: `Failed to fetch changelog: ${message}`},
        {status: 500},
      );
    }
  };
}
