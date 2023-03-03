import {Image, type ShopifyImageProps} from './Image.js';
import {Video} from './Video.js';
import {ExternalVideo} from './ExternalVideo.js';
import {ModelViewer} from './ModelViewer.js';
import type {MediaEdge as MediaEdgeType} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';
import type {ModelViewerElement} from '@google/model-viewer/lib/model-viewer.js';

type BaseProps = React.HTMLAttributes<
  HTMLImageElement | HTMLVideoElement | HTMLIFrameElement | ModelViewerElement
>;
export interface MediaFileProps extends BaseProps {
  /** An object with fields that correspond to the Storefront API's [Media object](https://shopify.dev/api/storefront/reference/products/media). */
  data: PartialDeep<MediaEdgeType['node'], {recurseIntoArrays: true}>;
  /** The options for the `Image`, `Video`, `ExternalVideo`, or `ModelViewer` components. */
  mediaOptions?: MediaOptions;
}

type MediaOptions = {
  /** Props that will only apply when an `<Image />` is rendered */
  image?: Omit<ShopifyImageProps, 'data'>;
  /** Props that will only apply when a `<Video />` is rendered */
  video?: Omit<React.ComponentProps<typeof Video>, 'data'>;
  /** Props that will only apply when an `<ExternalVideo />` is rendered */
  externalVideo?: Omit<
    React.ComponentProps<typeof ExternalVideo>['options'],
    'data'
  >;
  /** Props that will only apply when a `<ModelViewer />` is rendered */
  modelViewer?: Omit<typeof ModelViewer, 'data'>;
};

/**
 * The `MediaFile` component renders the media for the Storefront API's
 * [Media object](https://shopify.dev/api/storefront/reference/products/media). It renders an `Image`, a
 * `Video`, an `ExternalVideo`, or a `ModelViewer` depending on the `__typename` of the `data` prop.
 */
export function MediaFile({
  data,
  mediaOptions,
  ...passthroughProps
}: MediaFileProps): JSX.Element | null {
  switch (data.__typename) {
    case 'MediaImage': {
      if (!data.image) {
        const noDataImage = `<MediaFile/>: 'data.image' does not exist for __typename of 'MediaImage'; rendering 'null' by default.`;
        if (__HYDROGEN_DEV__) {
          throw new Error(noDataImage);
        } else {
          console.warn(noDataImage);
          return null;
        }
      }

      return (
        <Image
          {...passthroughProps}
          {...mediaOptions?.image}
          data={data.image}
        />
      );
    }
    case 'Video': {
      return (
        <Video {...passthroughProps} {...mediaOptions?.video} data={data} />
      );
    }
    case 'ExternalVideo': {
      return (
        <ExternalVideo
          {...passthroughProps}
          {...mediaOptions?.externalVideo}
          data={data}
        />
      );
    }
    case 'Model3d': {
      return (
        // @ts-expect-error There are issues with the inferred HTML attribute types here for ModelViewer (and contentEditable), but I think that's a little bit beyond me at the moment
        <ModelViewer
          {...passthroughProps}
          {...mediaOptions?.modelViewer}
          data={data}
        />
      );
    }
    default: {
      const typenameMissingMessage = `<MediaFile /> requires the '__typename' property to exist on the 'data' prop in order to render the matching sub-component for this type of media.`;
      if (__HYDROGEN_DEV__) {
        throw new Error(typenameMissingMessage);
      } else {
        console.error(`${typenameMissingMessage}  Rendering 'null' by default`);
        return null;
      }
    }
  }
}
