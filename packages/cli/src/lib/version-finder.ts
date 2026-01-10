import {AbortError} from '@shopify/cli-kit/node/error';
import {fetch} from '@shopify/cli-kit/node/http';

interface GitHubTagResponse {
  object?: {
    sha: string;
    type: string;
    url?: string;
  };
}

interface GitHubRateLimitResponse {
  message?: string;
  documentation_url?: string;
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Shopify-Hydrogen-CLI',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function findCommitForHydrogenVersion(
  version: string,
): Promise<string | undefined> {
  try {
    const tagName = `@shopify/hydrogen@${version}`;
    const headers = getGitHubHeaders();

    const tagResponse = await fetch(
      `https://api.github.com/repos/Shopify/hydrogen/git/refs/tags/${tagName}`,
      {headers},
    );

    if (tagResponse.status === 403) {
      const rateLimitData =
        (await tagResponse.json()) as GitHubRateLimitResponse;
      if (rateLimitData.message?.includes('API rate limit exceeded')) {
        throw new AbortError(
          `GitHub API rate limit exceeded while looking for version ${version}.`,
          `Try again later or set a GITHUB_TOKEN environment variable to increase rate limits.`,
        );
      }
    }

    if (tagResponse.status === 404) {
      return undefined;
    }

    if (!tagResponse.ok) {
      throw new AbortError(
        `GitHub API error (${tagResponse.status}) while looking for version ${version}.`,
        `Please check your network connection and try again.`,
      );
    }

    const tagData = (await tagResponse.json()) as GitHubTagResponse;
    if (tagData.object?.sha) {
      if (tagData.object.type === 'tag' && tagData.object.url) {
        const tagObjResponse = await fetch(tagData.object.url, {headers});
        if (!tagObjResponse.ok) {
          return tagData.object.sha;
        }
        const tagObj = (await tagObjResponse.json()) as GitHubTagResponse;
        return tagObj.object?.sha;
      }
      return tagData.object.sha;
    }

    return undefined;
  } catch (error) {
    if (error instanceof AbortError) {
      throw error;
    }
    throw new AbortError(
      `Failed to find commit for version ${version}`,
      `Error: ${error}`,
    );
  }
}
