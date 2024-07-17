import {forwardRef, type HTMLAttributes} from 'react';
import {shopifyLoader} from './Image.js';
import type {Video as VideoType} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';

export interface VideoProps {
  /** An object with fields that correspond to the Storefront API's [Video object](https://shopify.dev/api/storefront/2024-07/objects/video). */
  data: PartialDeep<VideoType, {recurseIntoArrays: true}>;
  /** An object of image size options for the video's `previewImage`. Uses `shopifyImageLoader` to generate the `poster` URL. */
  previewImageOptions?: Parameters<typeof shopifyLoader>[0];
  /** Props that will be passed to the `video` element's `source` children elements. */
  sourceProps?: HTMLAttributes<HTMLSourceElement> & {
    'data-testid'?: string;
  };
}

/**
 * The `Video` component renders a `video` for the Storefront API's [Video object](https://shopify.dev/api/storefront/reference/products/video).
 */
export const Video = forwardRef<
  HTMLVideoElement,
  JSX.IntrinsicElements['video'] & VideoProps
>((props, ref): JSX.Element => {
  const {
    data,
    previewImageOptions,
    id = data.id,
    playsInline = true,
    controls = true,
    sourceProps = {},
    ...passthroughProps
  } = props;

  const posterUrl = shopifyLoader({
    src: data.previewImage?.url ?? '',
    ...previewImageOptions,
  });

  if (!data.sources) {
    throw new Error(`<Video/> requires a 'data.sources' array`);
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      {...passthroughProps}
      id={id}
      playsInline={playsInline}
      controls={controls}
      poster={posterUrl}
      ref={ref}
    >
      {data.sources.map((source) => {
        if (!(source?.url && source?.mimeType)) {
          throw new Error(`<Video/> needs 'source.url' and 'source.mimeType'`);
        }
        return (
          <source
            {...sourceProps}
            key={source.url}
            src={source.url}
            type={source.mimeType}
          />
        );
      })}
    </video>
  );
});
