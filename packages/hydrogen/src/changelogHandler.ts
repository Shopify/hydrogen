const DEFAULT_GITHUB_CHANGELOG_URL =
  'https://raw.githubusercontent.com/Shopify/hydrogen/main/docs/changelog.json';

/**
 * A custom Remix loader handler that fetches the changelog.json from GitHub.
 * It is used by the `upgrade` command inside the route `https://hydrogen.shopify.dev/changelog.json`
 */
export async function changelogHandler({
  request,
  changelogUrl,
}: {
  request: Request;
  changelogUrl?: string;
}) {
  const searchParams = new URL(request.url).searchParams;
  const GITHUB_CHANGELOG_URL = changelogUrl || DEFAULT_GITHUB_CHANGELOG_URL;
  return fetch(GITHUB_CHANGELOG_URL);
}
