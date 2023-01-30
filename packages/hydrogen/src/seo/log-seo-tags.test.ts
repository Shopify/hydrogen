import {expect, describe, it, vi} from 'vitest';
import {logSeoTags} from './log-seo-tags';
import {HeadTag} from './generate-seo-tags';

describe('logSeoTags', () => {
  const consoleMock = {
    log: vi.fn(),
    table: vi.fn(),
  };

  vi.stubGlobal('console', consoleMock);

  const lineBreak: [string] = [' '];
  const banner: ([string] | [string, number])[] = [
    lineBreak,
    ['SEO Meta Tags', 1],
    lineBreak,
  ];

  it('outputs the given meta tag objects in console logs', () => {
    // Given
    const input: HeadTag[] = [
      {
        key: 'meta-og:title',
        tag: 'meta',
        props: {
          property: 'og:type',
          content: 'Snowdevil',
        },
      },
      {
        key: 'meta-og:description',
        tag: 'meta',
        props: {
          property: 'og:description',
          content: 'A description',
        },
      },
    ];

    // When
    logSeoTags(input);

    expectLogFixture([
      ...banner,
      ['meta', 2],
      ['og:type', 4],
      ['Snowdevil', 4],
      lineBreak,
      ['meta', 2],
      ['og:description', 4],
      ['A description', 4],
      lineBreak,
    ]);
  });

  it('outputs the JSON LD as a console table', () => {
    const jsonLdContent = {
      name: 'name',
      content: 'Snowdevil',
    };

    // Given
    const input: HeadTag[] = [
      {
        key: 'ld-json',
        tag: 'script',
        props: {},
        children: JSON.stringify(jsonLdContent),
      },
    ];

    // When
    logSeoTags(input);

    expect(console.table).toHaveBeenCalledWith(
      expect.objectContaining(jsonLdContent),
      ['name', 'content'],
    );
  });
});

function expectLogFixture(
  expectedOutput: ([string, number] | [string])[],
  styles = expect.any(String),
) {
  expectedOutput.forEach(([line, numStyles], index) => {
    const styleLines = numStyles
      ? Array.from({length: numStyles}).map(() => styles)
      : [];

    expect(console.log).toHaveBeenNthCalledWith(
      index + 1,
      expect.stringContaining(line),
      ...styleLines,
    );
  });
}
