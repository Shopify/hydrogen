import type {Organization, Product, Thing} from 'schema-dts';
import {afterAll, describe, expect, it, vi} from 'vitest';
import {getSeoMeta} from './seo-meta';
import {SeoConfig} from './generate-seo-tags';

describe('generateSeoTags', () => {
  const consoleMock = {
    warn: vi.fn(),
  };

  vi.stubGlobal('console', consoleMock);

  afterAll(() => {
    vi.unstubAllGlobals();
  });

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
    const output = getSeoMeta(input);

    // Then
    expect(output).toMatchInlineSnapshot('[]');
  });

  describe('title', () => {
    it('should fill the title', () => {
      // Given
      const input = {
        title: 'Snowdevil',
      };

      // When
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            title: 'Snowdevil',
          },
          {
            property: 'og:title',
            content: 'Snowdevil',
          },

          {
            property: 'twitter:title',
            content: 'Snowdevil',
          },
        ]),
      );
    });

    it('should fill the title with a template', () => {
      // Given
      const input = {
        title: 'Snowdevil',
        titleTemplate: '%s - A headless storefront',
      };

      // When
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            title: 'Snowdevil - A headless storefront',
          },
          {
            property: 'og:title',
            content: 'Snowdevil - A headless storefront',
          },

          {
            property: 'twitter:title',
            content: 'Snowdevil - A headless storefront',
          },
        ]),
      );
    });

    it('should warn if the title is too long', () => {
      // Given
      const input = {
        title: 'Snowdevil'.padEnd(121, '.'), // 121 characters
      };

      // When
      getSeoMeta(input);

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
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            name: 'description',
            content: 'A headless storefront',
          },
          {
            property: 'og:description',
            content: 'A headless storefront',
          },
          {
            property: 'twitter:description',
            content: 'A headless storefront',
          },
        ]),
      );
    });

    it('should warn if the description is too long', () => {
      // Given
      const input = {
        description: ''.padEnd(156, '.'), // 156 characters
      };

      // When
      getSeoMeta(input);

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
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            href: 'https://hydrogen.shop/collections',
            rel: 'canonical',
            tagName: 'link',
          },
          {
            property: 'og:url',
            content: 'https://hydrogen.shop/collections',
          },
        ]),
      );
    });

    it('should warn if the url is not a url', () => {
      // Given
      const input = {
        url: 'not a url',
      };

      // When
      getSeoMeta(input);

      // Then

      expect(console.warn).toHaveBeenCalledWith(
        'Error in SEO input: `url` should be a valid URL',
      );
    });

    it('should remove URL parameters from the url', () => {
      // Given
      const input = {
        url: 'https://hydrogen.shop/products/snowboard?Size=154cm&Binding+mount=Nested&Material=Carbon-fiber',
      };

      // When
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            href: 'https://hydrogen.shop/products/snowboard',
            rel: 'canonical',
            tagName: 'link',
          },
        ]),
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
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            content: 'https://example.com/image.jpg',
            property: 'og:image',
          },
        ]),
      );
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
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            content: 'https://example.com/image-1.jpg',
            property: 'og:image',
          },
          {
            content: 'https://example.com/image-2.jpg',
            property: 'og:image',
          },
        ]),
      );
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
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            content: 'https://example.com/image-1.jpg',
            property: 'og:image:url',
          },
          {
            content: 100,
            property: 'og:image:height',
          },
          {
            content: 'https://example.com/image-1.jpg',
            property: 'og:image:secure_url',
          },
          {
            content: 'image/jpeg',
            property: 'og:image:type',
          },
        ]),
      );
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
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            content: 'https://example.com/image-1.jpg',
            property: 'og:image:url',
          },
          {
            content: 100,
            property: 'og:image:height',
          },
          {
            content: 'https://example.com/image-1.jpg',
            property: 'og:image:secure_url',
          },
          {
            content: 'image/jpeg',
            property: 'og:image:type',
          },
          {
            content: 'https://example.com/image-2.jpg',
            property: 'og:image:url',
          },
          {
            content: 'https://example.com/image-2.jpg',
            property: 'og:image:secure_url',
          },
          {
            content: 'image/jpeg',
            property: 'og:image:type',
          },
          {
            content: 100,
            property: 'og:image:width',
          },
        ]),
      );
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
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            content: 'https://example.com/image-1.jpg',
            property: 'og:image:url',
          },
          {
            content: 100,
            property: 'og:image:height',
          },
          {
            content: 'https://example.com/image-1.jpg',
            property: 'og:image:secure_url',
          },
          {
            content: 'image/jpeg',
            property: 'og:image:type',
          },
          {
            content: 'https://example.com/image-1.mp3',
            property: 'og:audio:url',
          },
          {
            content: 'https://example.com/image-1.mp3',
            property: 'og:audio:secure_url',
          },
          {
            content: 'audio/mpeg',
            property: 'og:audio:type',
          },
          {
            content: 'https://example.com/image-1.swf',
            property: 'og:video:url',
          },
          {
            content: 100,
            property: 'og:video:height',
          },
          {
            content: 'https://example.com/image-1.swf',
            property: 'og:video:secure_url',
          },
          {
            content: 'application/x-shockwave-flash',
            property: 'og:video:type',
          },
        ]),
      );
    });
  });

  describe('handle', () => {
    it('should fill the twitter:card and twitter:site meta tags', () => {
      // Given
      const input = {
        handle: '@shopify',
      };

      // When
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            content: '@shopify',
            property: 'twitter:creator',
          },
          {
            content: '@shopify',
            property: 'twitter:site',
          },
        ]),
      );
    });

    it('should warn if the handle is not a valid', () => {
      // Given
      const input = {
        handle: 'shopify',
      };

      // When
      getSeoMeta(input);

      // Then

      expect(console.warn).toHaveBeenCalledWith(
        'Error in SEO input: `handle` should start with `@`',
      );
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
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            tagName: 'link',
            href: 'https://hydrogen.shop.com/de/products/1234',
            hrefLang: 'de',
            rel: 'alternate',
          },
          {
            tagName: 'link',
            href: 'https://hydrogen.shop.com/fr/products/1234',
            hrefLang: 'fr-default',
            rel: 'alternate',
          },
        ]),
      );
    });
  });

  describe('robots', () => {
    it('should add a robots meta tag for noIndex and noFollow', () => {
      // Given
      const input = {
        robots: {
          noIndex: true,
          noFollow: true,
        },
      };

      // When
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            content: 'noindex,nofollow',
            name: 'robots',
          },
        ]),
      );
    });
  });

  it('should add a robots meta tag for index and follow', () => {
    // Given
    const input = {
      robots: {
        noIndex: false,
        noFollow: false,
      },
    };

    // When
    const output = getSeoMeta(input);

    // Then
    expect(output).toEqual(
      expect.arrayContaining([
        {
          content: 'index,follow',
          name: 'robots',
        },
      ]),
    );
  });

  it('should add all the robots meta tags', () => {
    // Given
    const input = {
      robots: {
        noIndex: true,
        noFollow: true,
        noArchive: true,
        noSnippet: true,
        noImageIndex: true,
        noTranslate: true,
        maxImagePreview: 'large' as const,
        maxSnippet: 100,
        maxVideoPreview: 100,
        unavailableAfter: '2023-01-01',
      },
    };

    // When
    const output = getSeoMeta(input);

    // Then
    expect(output).toEqual(
      expect.arrayContaining([
        {
          content:
            'noindex,nofollow,noarchive,noimageindex,nosnippet,notranslate,max-image-preview:large,max-snippet:100,max-video-preview:100,unavailable_after:2023-01-01',
          name: 'robots',
        },
      ]),
    );
  });

  describe('jsonLd', () => {
    it('should not generate jsonLd if not configured', () => {
      // Given
      const input = {
        jsonLd: {},
      } as SeoConfig<Thing>;

      // When
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(expect.arrayContaining([]));
    });

    it('should generate Organization jsonLd tag', () => {
      // Given
      const input = {
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Hydrogen',
          logo: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Logotype_086d64de-1273-4dbc-91c5-8d6d161d85d4.png?v=1655847948',
          sameAs: [
            'https://twitter.com/shopify',
            'https://facebook.com/shopify',
            'https://instagram.com/shopify',
            'https://youtube.com/shopify',
            'https://tiktok.com/@shopify',
          ],
          url: 'http://localhost:3000/products/the-full-stack',
        },
      } satisfies SeoConfig<Organization>;

      // When
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            'script:ld+json': input.jsonLd,
          },
        ]),
      );
    });

    it('should generate Product jsonLd tag', () => {
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
      } satisfies SeoConfig<Product>;

      // When
      const output = getSeoMeta(input);

      // Then
      expect(output).toEqual(
        expect.arrayContaining([
          {
            'script:ld+json': input.jsonLd,
          },
        ]),
      );
    });
  });

  it('should generate both Organization and Product jsonLd tags', () => {
    // Given
    const input = {
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Hydrogen',
          logo: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Logotype_086d64de-1273-4dbc-91c5-8d6d161d85d4.png?v=1655847948',
          sameAs: [
            'https://twitter.com/shopify',
            'https://facebook.com/shopify',
            'https://instagram.com/shopify',
            'https://youtube.com/shopify',
            'https://tiktok.com/@shopify',
          ],
          url: 'http://localhost:3000/products/the-full-stack',
        },
        {
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
      ],
    } satisfies SeoConfig<Organization | Product>;

    // When
    const output = getSeoMeta(input);

    // Then
    expect(output).toEqual(
      expect.arrayContaining([
        {
          'script:ld+json': input.jsonLd[0],
        },
        {
          'script:ld+json': input.jsonLd[1],
        },
      ]),
    );
  });
});
