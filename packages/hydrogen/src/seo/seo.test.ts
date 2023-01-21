import {expect, describe, it} from 'vitest';
import {generateSeoTags} from './seo';

describe('generateSeoTags', () => {
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"name\\":\\"Snowdevil\\"}",
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"name\\":\\"Snowdevil - A headless storefront\\"}",
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"description\\":\\"A headless storefront\\"}",
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"ItemList\\",\\"url\\":\\"https://hydrogen.shop/collections\\"}",
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"image\\":\\"https://example.com/image.jpg\\"}",
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\",\\"image\\":\\"https://example.com/image-2.jpg\\"}",
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
          height: '100',
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
            "key": "meta-https://example.com/image-1.jpg-1-og:image:height",
            "props": {
              "content": "100",
              "property": "og:image:height",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-1-og:image:type",
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
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
            height: '100',
          },
          {
            url: 'https://example.com/image-2.jpg',
            width: '100',
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
            "key": "meta-https://example.com/image-1.jpg-1-og:image:height",
            "props": {
              "content": "100",
              "property": "og:image:height",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-1-og:image:type",
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
            "key": "meta-https://example.com/image-2.jpg-1-og:image:type",
            "props": {
              "content": "image/jpeg",
              "property": "og:image:type",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-2.jpg-1-og:image:width",
            "props": {
              "content": "100",
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
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
            height: '100',
            type: 'video',
          },
          {
            url: 'https://example.com/image-1.mp3',
            type: 'audio',
          },
          {
            url: 'https://example.com/image-1.jpg',
            type: 'image',
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
            "key": "meta-https://example.com/image-1.jpg-1-og:image:height",
            "props": {
              "content": 100,
              "property": "og:image:height",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.jpg-1-og:image:type",
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
            "key": "meta-https://example.com/image-1.mp3-1-og:audio:type",
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
            "key": "meta-https://example.com/image-1.swf-1-og:video:height",
            "props": {
              "content": "100",
              "property": "og:video:height",
            },
            "tag": "meta",
          },
          {
            "key": "meta-https://example.com/image-1.swf-1-og:video:type",
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
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
              "property": "twitter:creator",
            },
            "tag": "meta",
          },
          {
            "key": "meta-twitter:site",
            "props": {
              "content": "@shopify",
              "property": "twitter:site",
            },
            "tag": "meta",
          },
          {
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Thing\\"}",
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });
  });

  describe('ldJson', () => {
    it('should infer default values from the URL', () => {
      // Given
      const input = {
        ldJson: {},
        url: 'https://hydrogen.shopify.com/products/1234',
      };

      // When
      const output = generateSeoTags(input);

      // Then
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "key": "link-canonical",
            "props": {
              "href": "https://hydrogen.shopify.com/products/1234",
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
              "content": "https://hydrogen.shopify.com/products/1234",
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Product\\",\\"url\\":\\"https://hydrogen.shopify.com/products/1234\\"}",
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });

    it('should add additional ldJson values', () => {
      // Given
      const input = {
        ldJson: {
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
            "key": "script-application/ld+json",
            "props": {
              "children": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Product\\",\\"aggregateRating\\":{\\"@type\\":\\"AggregateRating\\",\\"bestRating\\":\\"100\\",\\"ratingCount\\":\\"24\\",\\"ratingValue\\":\\"87\\"},\\"offers\\":{\\"@type\\":\\"AggregateOffer\\",\\"highPrice\\":\\"$1495\\",\\"lowPrice\\":\\"$1250\\",\\"offerCount\\":\\"8\\",\\"offers\\":[{\\"@type\\":\\"Offer\\",\\"url\\":\\"hydrogen.shop/discounts/1234\\"}]}}",
              "type": "application/ld+json",
            },
            "tag": "script",
          },
        ]
      `);
    });
  });
});
