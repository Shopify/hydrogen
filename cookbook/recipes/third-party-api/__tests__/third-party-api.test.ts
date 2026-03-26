import {describe, expect, it} from 'vitest';

// minifyQuery is not exported, so we inline-test the same logic.
// If it becomes exported in the future, import it directly.
function minifyQuery<T extends string>(string: T) {
  return string
    .replace(/\s*#.*$/gm, '')
    .replace(/\s+/gm, ' ')
    .trim() as T;
}

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
    // The createRickAndMortyClient extracts display names via regex:
    // query.match(/^(query|mutation)\s\w+/)?.[0]
    const extractDisplayName = (query: string) =>
      query.match(/^(query|mutation)\s\w+/)?.[0];

    it('extracts query display name', () => {
      // In real usage, #graphql:rickAndMorty is on its own line followed by the query.
      // After minification, the comment line is stripped and the query starts with 'query'.
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
