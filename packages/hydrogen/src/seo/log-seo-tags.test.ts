import {expect, describe, it, vi, beforeEach, type Mock} from 'vitest';
import {logSeoTags} from './log-seo-tags';
import {CustomHeadTagObject} from './generate-seo-tags';

describe('logSeoTags', () => {
  const consoleMock = {
    log: vi.fn(),
    table: vi.fn(),
    warn: console.warn,
    error: console.error,
  };

  vi.stubGlobal('console', consoleMock);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => ({
      blob: () => new Blob(),
    })),
  );

  const lineBreak: [string] = [' '];
  const banner: ([string] | [string, number])[] = [
    lineBreak,
    ['SEO Meta Tags', 1],
    lineBreak,
  ];

  beforeEach(() => {
    consoleMock.log.mockClear();
    consoleMock.table.mockClear();
  });

  it('outputs the given meta tag objects in console logs', () => {
    // Given
    const input: CustomHeadTagObject[] = [
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
      ['meta', 1],
      ['og:type'],
      ['Snowdevil'],
      lineBreak,
      ['meta', 1],
      ['og:description'],
      ['A description'],
      lineBreak,
    ]);
  });

  it('outputs the JSON LD as a console table', () => {
    const jsonLdContent = {
      name: 'name',
      content: 'Snowdevil',
    };

    // Given
    const input: CustomHeadTagObject[] = [
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

  it('outputs images in the console', async () => {
    // Given
    const input: CustomHeadTagObject[] = [
      {
        key: 'meta-og:image:url',
        tag: 'meta',
        props: {
          property: 'og:image:url',
          content: 'https://example.com/image.png',
        },
      },
    ];

    // When
    logSeoTags(input);

    // Wait for the image to be fetched
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetch).toHaveBeenCalledWith('https://example.com/image.png');

    expectLogFixture([
      ...banner,
      ['meta', 1],
      ['og:image:url'],
      ['https://example.com/image.png'],
      lineBreak,
      ['Share image preview', 1],
      [' ', 1], // Image
      ['https://example.com/image.png'],
    ]);
  });
});

function expectLogFixture(
  expectedOutput: ([string, number] | [string])[],
  styles = expect.any(String),
  debug: boolean = false,
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

  if (debug) {
    (console.log as Mock).mock.calls.forEach((call) => {
      console.warn(...call);
    });
  }
}
