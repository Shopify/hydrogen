import {describe, it, expect, vi, beforeEach} from 'vitest';
import {findCommitForHydrogenVersion} from './version-finder.js';
import {fetch} from '@shopify/cli-kit/node/http';
import {AbortError} from '@shopify/cli-kit/node/error';

vi.mock('@shopify/cli-kit/node/http', () => ({
  fetch: vi.fn(),
}));

describe('version-finder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findCommitForHydrogenVersion', () => {
    beforeEach(() => {
      delete process.env.GITHUB_TOKEN;
    });

    it('should find commit by hydrogen tag', async () => {
      // Mock GitHub API response for tag
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: {
            sha: 'abc123def456',
            type: 'commit',
          },
        }),
      } as any);

      const result = await findCommitForHydrogenVersion('2025.1.1');
      expect(result).toBe('abc123def456');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/Shopify/hydrogen/git/refs/tags/@shopify/hydrogen@2025.1.1',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Shopify-Hydrogen-CLI',
          }),
        }),
      );
    });

    it('should handle annotated tags by fetching the tag object', async () => {
      // Mock GitHub API response for annotated tag
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            object: {
              sha: 'tag-sha-123',
              type: 'tag',
              url: 'https://api.github.com/repos/Shopify/hydrogen/git/tags/tag-sha-123',
            },
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            object: {
              sha: 'commit-sha-456',
            },
          }),
        } as any);

      const result = await findCommitForHydrogenVersion('2025.1.1');
      expect(result).toBe('commit-sha-456');
    });

    it('should return undefined if version tag does not exist', async () => {
      // Mock GitHub API to return 404
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any);

      const result = await findCommitForHydrogenVersion('2040.7.9');
      expect(result).toBeUndefined();
    });

    it('should throw error for GitHub API rate limit', async () => {
      // Mock GitHub API to return 403 rate limit
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          message: 'API rate limit exceeded for 1.2.3.4',
        }),
      } as any);

      await expect(findCommitForHydrogenVersion('2025.1.1')).rejects.toThrow(
        new AbortError(
          'GitHub API rate limit exceeded while looking for version 2025.1.1.',
          'Try again later or set a GITHUB_TOKEN environment variable to increase rate limits.',
        ),
      );
    });

    it('should throw error for other GitHub API errors', async () => {
      // Mock GitHub API to return 500
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      await expect(findCommitForHydrogenVersion('2025.1.1')).rejects.toThrow(
        new AbortError(
          'GitHub API error (500) while looking for version 2025.1.1.',
          'Please check your network connection and try again.',
        ),
      );
    });

    it('should include GitHub token in headers when available', async () => {
      process.env.GITHUB_TOKEN = 'test-token-123';

      // Mock GitHub API response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: {
            sha: 'abc123',
            type: 'commit',
          },
        }),
      } as any);

      await findCommitForHydrogenVersion('2025.1.1');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/Shopify/hydrogen/git/refs/tags/@shopify/hydrogen@2025.1.1',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        }),
      );
    });

    it('should handle network errors gracefully', async () => {
      // Mock fetch to throw a network error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(findCommitForHydrogenVersion('2025.1.1')).rejects.toThrow(
        new AbortError(
          'Failed to find commit for version 2025.1.1',
          'Error: Error: Network error',
        ),
      );
    });
  });
});
