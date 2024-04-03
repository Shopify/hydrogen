import {
  ensureArray,
  inferMimeType,
  renderTitle,
  schema,
  validate,
  type SeoConfig,
} from './generate-seo-tags';
import {MetaFunction} from '@remix-run/react';

export type GetSeoMetaReturn = ReturnType<MetaFunction>;

type GetSeoMetaTypeForDocs = {
  /** `getSeoMeta` takes an arbitrary number of configuration object parameters. Values in each object are overwritten based on the object order. \`jsonLd\` properties are preserved between each configuration object. */
  seoInputs: SeoConfig[];
};

type SeoKey = keyof SeoConfig;

type Optional<T> = T | null | undefined;

/**
 * Generate a Remix meta array from one or more SEO configuration objects. This is useful to pass SEO configuration for the parent route(s) and the current route. Similar to `Object.assign()`, each property is overwritten based on the object order. The exception is `jsonLd`, which is preserved so that each route has it's own independent jsonLd meta data.
 */
export function getSeoMeta(
  ...seoInputs: Optional<SeoConfig>[]
): GetSeoMetaReturn {
  let tagResults: GetSeoMetaReturn = [];

  const dedupedSeoInput =
    seoInputs.reduce((acc, current) => {
      if (!current) return acc as SeoConfig;

      // remove seo properties with falsy values
      Object.keys(current).forEach(
        (key) => !current[key as SeoKey] && delete current[key as SeoKey],
      );

      const {jsonLd} = current;

      if (!jsonLd) {
        return {...acc, ...current} as SeoConfig;
      }

      // concatenate jsonLds if present
      if (!acc?.jsonLd) {
        return {...acc, ...current, jsonLd: [jsonLd]} as SeoConfig;
      } else {
        if (Array.isArray(jsonLd)) {
          return {
            ...acc,
            ...current,
            jsonLd: [...ensureArray(acc.jsonLd), ...jsonLd],
          } as SeoConfig;
        } else {
          return {
            ...acc,
            ...current,
            jsonLd: [...ensureArray(acc.jsonLd), jsonLd],
          } as SeoConfig;
        }
      }
    }, {}) || {};

  for (const seoKey of Object.keys(dedupedSeoInput)) {
    switch (seoKey) {
      case 'title': {
        const content = validate(schema.title, dedupedSeoInput.title);
        const title = renderTitle(dedupedSeoInput?.titleTemplate, content);

        if (!title) {
          break;
        }

        tagResults.push(
          {title},
          {property: 'og:title', content: title},
          {property: 'twitter:title', content: title},
        );

        break;
      }

      case 'description': {
        const content = validate(
          schema.description,
          dedupedSeoInput.description,
        );

        if (!content) {
          break;
        }

        tagResults.push(
          {
            name: 'description',
            content,
          },
          {
            property: 'og:description',
            content,
          },
          {
            property: 'twitter:description',
            content,
          },
        );

        break;
      }

      case 'url': {
        const content = validate(schema.url, dedupedSeoInput.url);

        if (!content) {
          break;
        }

        const urlWithoutParams = content.split('?')[0];
        const urlWithoutTrailingSlash = urlWithoutParams.replace(/\/$/, '');

        tagResults.push(
          {
            tagName: 'link',
            rel: 'canonical',
            href: urlWithoutTrailingSlash,
          },
          {
            property: 'og:url',
            content: urlWithoutTrailingSlash,
          },
        );

        break;
      }

      case 'handle': {
        const content = validate(schema.handle, dedupedSeoInput.handle);

        if (!content) {
          break;
        }

        tagResults.push(
          {property: 'twitter:site', content},
          {property: 'twitter:creator', content},
        );

        break;
      }

      case 'media': {
        let content;
        const values = ensureArray(dedupedSeoInput.media);

        for (const media of values) {
          if (typeof media === 'string') {
            tagResults.push({property: 'og:image', content: media});
          }

          if (media && typeof media === 'object') {
            const type = media.type || 'image';

            // Order matters here when adding multiple media tags @see https://ogp.me/#array
            const normalizedMedia = media
              ? {
                  url: media?.url,
                  secure_url: media?.url,
                  type: inferMimeType(media.url),
                  width: media?.width,
                  height: media?.height,
                  alt: media?.altText,
                }
              : {};

            for (const key of Object.keys(normalizedMedia)) {
              if (normalizedMedia[key as keyof typeof normalizedMedia]) {
                content = normalizedMedia[
                  key as keyof typeof normalizedMedia
                ] as string;

                tagResults.push({
                  property: `og:${type}:${key}`,
                  content,
                });
              }
            }
          }
        }
        break;
      }

      case 'jsonLd': {
        const jsonLdBlocks = ensureArray(dedupedSeoInput.jsonLd);
        let index = 0;
        for (const block of jsonLdBlocks) {
          if (typeof block !== 'object' || Object.keys(block).length === 0) {
            continue;
          }

          tagResults.push({
            'script:ld+json': block,
          });
        }

        break;
      }

      case 'alternates': {
        const alternates = ensureArray(dedupedSeoInput.alternates);

        for (const alternate of alternates) {
          if (!alternate) {
            continue;
          }

          const {language, url, default: defaultLang} = alternate;

          const hrefLang = language
            ? `${language}${defaultLang ? '-default' : ''}`
            : undefined;

          tagResults.push({
            tagName: 'link',
            rel: 'alternate',
            hrefLang,
            href: url,
          });
        }

        break;
      }

      case 'robots': {
        if (!dedupedSeoInput.robots) {
          break;
        }

        const {
          maxImagePreview,
          maxSnippet,
          maxVideoPreview,
          noArchive,
          noFollow,
          noImageIndex,
          noIndex,
          noSnippet,
          noTranslate,
          unavailableAfter,
        } = dedupedSeoInput.robots;

        const robotsParams = [
          noArchive && 'noarchive',
          noImageIndex && 'noimageindex',
          noSnippet && 'nosnippet',
          noTranslate && `notranslate`,
          maxImagePreview && `max-image-preview:${maxImagePreview}`,
          maxSnippet && `max-snippet:${maxSnippet}`,
          maxVideoPreview && `max-video-preview:${maxVideoPreview}`,
          unavailableAfter && `unavailable_after:${unavailableAfter}`,
        ];

        let robotsParam =
          (noIndex ? 'noindex' : 'index') +
          ',' +
          (noFollow ? 'nofollow' : 'follow');

        for (let param of robotsParams) {
          if (param) {
            robotsParam += `,${param}`;
          }
        }

        tagResults.push({name: 'robots', content: robotsParam});

        break;
      }

      default: {
        // TODO: We should be able to catch unaccounted for keys at compile time
        // let exhaustiveCheck: never = seoKey;

        break;
      }
    }
  }

  return tagResults;
}
