import {expect, describe, it, vi} from 'vitest';
import {generateSeoTags, type Seo} from './generate-seo-tags';
import type {Product} from 'schema-dts';

describe('generateSeoTags', () => {
  const consoleMock = {
    warn: vi.fn(),
  };

  vi.stubGlobal('console', consoleMock);

  it('removes undefined values', () => {
    // Given
    const input = {
      title: undefined,
      titleTemplate: undefined,
      alternates: undefined,
      description: undefined,
      url: undefined,
      handle: undefined,
      jsonLd: undefined,
      media: undefined,
    };

    // When
    const output = generateSeoTags(input);

    // Then
    expect(output).toMatchInlineSnapshot(`
      [
        {
          "key": "meta-og:type",
          "props": {
            "content": "website",
            "property": "og:type",
          },
          "tag": "meta",
        },
        {
          "key": "meta-twitter:card",
          "props": {
            "content": "summary_large_image",
            "name": "twitter:card",
          },
          "tag": "meta",
        },
        {
          "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
          "key": "script-application/ld+json",
          "props": {
            "type": "application/ld+json",
          },
          "tag": "script",
        },
      ]
    `);
  });

  describe('title', () => {
    it('should fill the title', () => {
      // Given
      const input = {
        title: 'Snowdevil',
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "children": "Snowdevil",
            "key": "0-title",
            "props": {},
            "tag": "title",
          },
          {
            "key": "meta-og:title",
            "props": {
              "content": "Snowdevil",
              "property": "og:title",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:title",
            "props": {
              "content": "Snowdevil",
              "name": "twitter:title",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"name\\":\\"Snowdevil\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should fill the title with a template', () => {
      // Given
      const input = {
        title: 'Snowdevil',
        titleTemplate: '%s - A headless storefront',
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "children": "Snowdevil - A headless storefront",
            "key": "0-title",
            "props": {},
            "tag": "title",
          },
          {
            "key": "meta-og:title",
            "props": {
              "content": "Snowdevil - A headless storefront",
              "property": "og:title",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:title",
            "props": {
              "content": "Snowdevil - A headless storefront",
              "name": "twitter:title",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"name\\":\\"Snowdevil\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should warn if the title is too long', () => {
      // Given
      const input = {
        title: 'Snowdevil'.padEnd(121, '.'), // 121 characters
      };

      // When
      generateSeoTags(input);

      // Then

      expect(console.warn).toHaveBeenCalledWith(
        'Error in SEO input: `title` should not be longer than 120 characters',
      );
    });
  });

  describe('description', () => {
    it('should fill the description', () => {
      // Given
      const input = {
        description: 'A headless storefront',
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "meta-description",
            "props": {
              "content": "A headless storefront",
              "name": "description",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:description",
            "props": {
              "content": "A headless storefront",
              "property": "og:description",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:description",
            "props": {
              "content": "A headless storefront",
              "name": "twitter:description",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"description\\":\\"A headless storefront\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should warn if the description is too long', () => {
      // Given
      const input = {
        description: ''.padEnd(156, '.'), // 156 characters
      };

      // When
      generateSeoTags(input);

      // Then

      expect(console.warn).toHaveBeenCalledWith(
        'Error in SEO input: `description` should not be longer than 155 characters',
      );
    });
  });

  describe('url', () => {
    it('should fill the url', () => {
      // Given
      const input = {
        url: 'https://hydrogen.shop/collections',
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "link-canonical",
            "props": {
              "href": "https://hydrogen.shop/collections",
              "rel": "canonical",
            },
            "tag": "link",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:url",
            "props": {
              "content": "https://hydrogen.shop/collections",
              "property": "og:url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"ItemList\\",\\"url\\":\\"https://hydrogen.shop/collections\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should warn if the url is not a url', () => {
      // Given
      const input = {
        url: 'not a url',
      };

      // When
      generateSeoTags(input);

      // Then

      expect(console.warn).toHaveBeenCalledWith(
        'Error in SEO input: `url` should be a valid URL',
      );
    });
  });

  describe('media', () => {
    it('should add media tags when given only a string', () => {
      // Given
      const input = {
        media: 'https://example.com/image.jpg',
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "meta-og:image",
            "props": {
              "content": "https://example.com/image.jpg",
              "name": "og:image",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"image\\":\\"https://example.com/image.jpg\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should add media tags when given an array of strings', () => {
      // Given
      const input = {
        media: [
          'https://example.com/image-1.jpg',
          'https://example.com/image-2.jpg',
        ],
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "meta-og:image",
            "props": {
              "content": "https://example.com/image-1.jpg",
              "name": "og:image",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:image",
            "props": {
              "content": "https://example.com/image-2.jpg",
              "name": "og:image",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"image\\":\\"https://example.com/image-2.jpg\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should add media tags when given an object', () => {
      // Given
      const input = {
        media: {
          url: 'https://example.com/image-1.jpg',
          height: 100,
        },
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "meta-https://example.com/image-1.jpg-0-og:image:url",
            "props": {
              "content": "https://example.com/image-1.jpg",
              "property": "og:image:url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:height",
            "props": {
              "content": 100,
              "property": "og:image:height",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:secure_url",
            "props": {
              "content": "https://example.com/image-1.jpg",
              "property": "og:image:secure_url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:type",
            "props": {
              "content": "image/jpeg",
              "property": "og:image:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should add media tags when given an array of objects', () => {
      // Given
      const input = {
        media: [
          {
            url: 'https://example.com/image-1.jpg',
            height: 100,
          },
          {
            url: 'https://example.com/image-2.jpg',
            width: 100,
          },
        ],
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "meta-https://example.com/image-1.jpg-0-og:image:url",
            "props": {
              "content": "https://example.com/image-1.jpg",
              "property": "og:image:url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:height",
            "props": {
              "content": 100,
              "property": "og:image:height",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:secure_url",
            "props": {
              "content": "https://example.com/image-1.jpg",
              "property": "og:image:secure_url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:type",
            "props": {
              "content": "image/jpeg",
              "property": "og:image:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-2.jpg-0-og:image:url",
            "props": {
              "content": "https://example.com/image-2.jpg",
              "property": "og:image:url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-2.jpg-og:image:secure_url",
            "props": {
              "content": "https://example.com/image-2.jpg",
              "property": "og:image:secure_url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-2.jpg-og:image:type",
            "props": {
              "content": "image/jpeg",
              "property": "og:image:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-2.jpg-og:image:width",
            "props": {
              "content": 100,
              "property": "og:image:width",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should add media tags for multiple types of media', () => {
      // Given
      const input = {
        media: [
          {
            url: 'https://example.com/image-1.swf',
            height: 100,
            type: 'video' as const,
          },
          {
            url: 'https://example.com/image-1.mp3',
            type: 'audio' as const,
          },
          {
            url: 'https://example.com/image-1.jpg',
            type: 'image' as const,
            height: 100,
          },
        ],
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "meta-https://example.com/image-1.jpg-0-og:image:url",
            "props": {
              "content": "https://example.com/image-1.jpg",
              "property": "og:image:url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:height",
            "props": {
              "content": 100,
              "property": "og:image:height",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:secure_url",
            "props": {
              "content": "https://example.com/image-1.jpg",
              "property": "og:image:secure_url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-og:image:type",
            "props": {
              "content": "image/jpeg",
              "property": "og:image:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.mp3-0-og:audio:url",
            "props": {
              "content": "https://example.com/image-1.mp3",
              "property": "og:audio:url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.mp3-og:audio:secure_url",
            "props": {
              "content": "https://example.com/image-1.mp3",
              "property": "og:audio:secure_url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.mp3-og:audio:type",
            "props": {
              "content": "audio/mpeg",
              "property": "og:audio:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.swf-0-og:video:url",
            "props": {
              "content": "https://example.com/image-1.swf",
              "property": "og:video:url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.swf-og:video:height",
            "props": {
              "content": 100,
              "property": "og:video:height",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.swf-og:video:secure_url",
            "props": {
              "content": "https://example.com/image-1.swf",
              "property": "og:video:secure_url",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.swf-og:video:type",
            "props": {
              "content": "application/x-shockwave-flash",
              "property": "og:video:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });
  });

  describe('handle', () => {
    it('should fill the twitter:card and twitter:site meta tags', () => {
      // Given
      const input = {
        handle: '@shopify',
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:creator",
            "props": {
              "content": "@shopify",
              "name": "twitter:creator",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:site",
            "props": {
              "content": "@shopify",
              "name": "twitter:site",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should warn if the handle is not a valid', () => {
      // Given
      const input = {
        handle: 'shopify',
      };

      // When
      generateSeoTags(input);

      // Then

      expect(console.warn).toHaveBeenCalledWith(
        'Error in SEO input: `handle` should start with `@`',
      );
    });
  });

  describe('jsonLd', () => {
    it('should add additional jsonLd values', () => {
      // Given
      const input = {
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          aggregateRating: {
            '@type': 'AggregateRating',
            bestRating: '100',
            ratingCount: '24',
            ratingValue: '87',
          },
          offers: {
            '@type': 'AggregateOffer',
            highPrice: '$1495',
            lowPrice: '$1250',
            offerCount: '8',
            offers: [
              {
                '@type': 'Offer',
                url: 'hydrogen.shop/discounts/1234',
              },
            ],
          },
        },
      } satisfies Seo<Product>;

      // When
      const output = generateSeoTags<Product>(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Product\\",\\"aggregateRating\\":{\\"@type\\":\\"AggregateRating\\",\\"bestRating\\":\\"100\\",\\"ratingCount\\":\\"24\\",\\"ratingValue\\":\\"87\\"},\\"offers\\":{\\"@type\\":\\"AggregateOffer\\",\\"highPrice\\":\\"$1495\\",\\"lowPrice\\":\\"$1250\\",\\"offerCount\\":\\"8\\",\\"offers\\":[{\\"@type\\":\\"Offer\\",\\"url\\":\\"hydrogen.shop/discounts/1234\\"}]}}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });
  });

  describe('alternates', () => {
    it('should add alternate links for each alternate', () => {
      // Given
      const input = {
        alternates: [
          {
            url: 'https://hydrogen.shop.com/fr/products/1234',
            language: 'fr',
            default: true,
          },
          {
            url: 'https://hydrogen.shop.com/de/products/1234',
            language: 'de',
          },
        ],
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "link-alternate-de",
            "props": {
              "href": "https://hydrogen.shop.com/de/products/1234",
              "hrefLang": "de",
              "rel": "alternate",
            },
            "tag": "link",
          },
          {
            "key": "link-alternate-fr-default",
            "props": {
              "href": "https://hydrogen.shop.com/fr/products/1234",
              "hrefLang": "fr-default",
              "rel": "alternate",
            },
            "tag": "link",
          },
          {
            "key": "meta-og:type",
            "props": {
              "content": "website",
              "property": "og:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:card",
            "props": {
              "content": "summary_large_image",
              "name": "twitter:card",
            },
            "tag": "meta",
          },
          {
            "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
            "key": "script-application/ld+json",
            "props": {
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });
  });
});
