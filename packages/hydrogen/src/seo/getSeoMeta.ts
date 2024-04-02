import type {Thing} from 'schema-dts';
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
  /** An object that generates SEO metadata */
  seoInput: SeoConfig;
  /** Use this optional callback to override the default meta output. It is passed an argument containing all the meta to be generated. */
  overrideFn?: (meta: GetSeoMetaReturn) => GetSeoMetaReturn;
  /** Use this optional callback to append the default meta output. It is passed an argument containing all the meta to be generated. */
  appendFn?: (meta: GetSeoMetaReturn) => GetSeoMetaReturn;
};

type Nullable<T> = T | null;

/**
 * Generate a Remix meta array based on the seo property used by the `Seo` component.
 */
export function getSeoMeta<
  Schema extends Thing,
  T extends SeoConfig<Schema> = SeoConfig<Schema>,
>(
  seoInput: T,
  overrideFn?: Nullable<(meta: GetSeoMetaReturn) => GetSeoMetaReturn>,
  appendFn?: Nullable<(meta: GetSeoMetaReturn) => GetSeoMetaReturn>,
): GetSeoMetaReturn {
  let tagResults: GetSeoMetaReturn = [];

  for (const seoKey of Object.keys(seoInput)) {
    switch (seoKey) {
      case 'title': {
        const content = validate(schema.title, seoInput.title);
        const title = renderTitle(seoInput?.titleTemplate, content);

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
        const content = validate(schema.description, seoInput.description);

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
        const content = validate(schema.url, seoInput.url);

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
        const content = validate(schema.handle, seoInput.handle);

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
        const values = ensureArray(seoInput.media);

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
        const jsonLdBlocks = ensureArray(seoInput.jsonLd);
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
        const alternates = ensureArray(seoInput.alternates);

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
        if (!seoInput.robots) {
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
        } = seoInput.robots;

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

  // replace any parent meta with the same name or property with the override
  if (overrideFn) {
    let overrides = overrideFn([...tagResults]);

    if (overrides) {
      for (let override of overrides) {
        let index = tagResults.findIndex(
          (meta) =>
            ('name' in meta &&
              'name' in override &&
              meta.name === override.name) ||
            ('property' in meta &&
              'property' in override &&
              meta.property === override.property) ||
            ('title' in meta && 'title' in override),
        );
        if (index !== -1) {
          tagResults.splice(index, 1, override);
        }
      }
    }
  }

  // append any additional meta
  if (appendFn) {
    const results = appendFn([...tagResults]);

    if (results) {
      tagResults = tagResults.concat(results);
    }
  }

  return tagResults;
}
