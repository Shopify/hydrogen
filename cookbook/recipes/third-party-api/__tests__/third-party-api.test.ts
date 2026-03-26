import {describe, expect, it, vi} from 'vitest';

// Mock @shopify/hydrogen since it's not available in the cookbook test context
vi.mock('@shopify/hydrogen', () => ({
  createWithCache: vi.fn(),
  CacheLong: vi.fn(),
}));

import {minifyQuery} from '../ingredients/templates/skeleton/app/lib/createRickAndMortyClient.server';

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
    // The createRickAndMortyClient extracts display names via this regex
    // on the minified query string. We test the combined behavior.
    const extractDisplayName = (query: string) =>
      query.match(/^(query|mutation)\s\w+/)?.[0];

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
});
