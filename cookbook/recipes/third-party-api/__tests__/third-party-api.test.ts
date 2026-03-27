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
    // This regex is intentionally duplicated from createRickAndMortyClient.server.ts
    // (line ~47). Exporting it from the source would mean adding a public API surface
    // just for testing. The duplication is acceptable because (a) the regex is simple
    // and stable, and (b) these tests verify the combined minifyQuery + extraction
    // behavior rather than the regex in isolation.
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
