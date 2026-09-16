import {describe, expect, it, vi, beforeEach} from 'vitest';

// Mock @shopify/hydrogen since it's not available in the cookbook test context
const mockFetch = vi.fn();
vi.mock('@shopify/hydrogen', () => ({
  createWithCache: vi.fn(() => ({fetch: mockFetch})),
  CacheLong: vi.fn(),
}));

import {
  minifyQuery,
  OPERATION_NAME_PATTERN,
  createRickAndMortyClient,
} from '../ingredients/templates/skeleton/app/lib/createRickAndMortyClient.server';

describe('third-party-api recipe', () => {
  describe('minifyQuery', () => {
    it('removes GraphQL comments', () => {
      const query = `
        # This is a comment
        query Characters {
          characters { # inline comment
            results {
              name
            }
          }
        }
      `;

      const result = minifyQuery(query);

      // Supplementary to the positive assertions below; the .toContain checks
      // confirm the output still has the expected content, while this verifies
      // no comment markers survived minification.
      expect(result).not.toContain('#');
      expect(result).toContain('query Characters');
      expect(result).toContain('results { name }');
    });

    it('collapses whitespace into single spaces', () => {
      const query = `
        query   Characters   {
          characters    {
            results   {
              name
            }
          }
        }
      `;

      const result = minifyQuery(query);

      // Supplementary to the exact .toBe() match below, which is the
      // primary guard against whitespace collapsing regressions.
      expect(result).not.toMatch(/\s{2,}/);
      expect(result).toBe(
        'query Characters { characters { results { name } } }',
      );
    });

    it('trims leading and trailing whitespace', () => {
      const result = minifyQuery('  query Foo { bar }  ');
      expect(result).toBe('query Foo { bar }');
    });

    it('handles empty queries', () => {
      const result = minifyQuery('');
      expect(result).toBe('');
    });

    it('preserves query structure after minification', () => {
      const query = `#graphql:rickAndMorty
        query Characters($page: Int) {
          characters(page: $page) {
            results {
              name
              status
              species
              image
            }
          }
        }
      `;

      const result = minifyQuery(query);

      expect(result).toBe(
        'query Characters($page: Int) { characters(page: $page) { results { name status species image } } }',
      );
    });
  });

  describe('display name extraction', () => {
    const extractDisplayName = (query: string) =>
      query.match(OPERATION_NAME_PATTERN)?.[0];

    it('extracts query display name from minified query', () => {
      const minified = minifyQuery(`#graphql:rickAndMorty
        query Characters { characters { results { name } } }`);
      expect(extractDisplayName(minified)).toBe('query Characters');
    });

    it('extracts mutation display name', () => {
      const minified = 'mutation UpdateCharacter { updateCharacter { id } }';
      expect(extractDisplayName(minified)).toBe('mutation UpdateCharacter');
    });

    it('returns undefined for non-operation strings', () => {
      expect(extractDisplayName('{ characters { name } }')).toBeUndefined();
    });
  });

  describe('createRickAndMortyClient', () => {
    const TEST_QUERY =
      `#graphql:rickAndMorty query Characters { characters { results { name } } }` as const;

    function buildClient() {
      return createRickAndMortyClient({
        cache: {} as Cache,
        waitUntil: vi.fn() as unknown as ExecutionContext['waitUntil'],
        request: new Request('http://localhost'),
      });
    }

    beforeEach(() => {
      mockFetch.mockReset();
    });

    it('returns data.data on a successful response', async () => {
      const expected = {characters: {results: [{name: 'Rick'}]}};
      mockFetch.mockResolvedValue({
        data: {data: expected},
        response: {ok: true},
      });

      const client = buildClient();
      const result = await client.query(TEST_QUERY, {});

      expect(result).toEqual(expected);
    });

    it('throws with data.error message when response contains an error', async () => {
      mockFetch.mockResolvedValue({
        data: {error: 'Rate limit exceeded'},
        response: {ok: true},
      });

      const client = buildClient();

      await expect(client.query(TEST_QUERY, {})).rejects.toThrow(
        'Rate limit exceeded',
      );
    });

    it('throws with statusText when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        data: null,
        response: {ok: false, statusText: 'Service Unavailable'},
      });

      const client = buildClient();

      await expect(client.query(TEST_QUERY, {})).rejects.toThrow(
        'Error fetching from rick and morty api: Service Unavailable',
      );
    });
  });
});
