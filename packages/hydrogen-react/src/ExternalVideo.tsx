import type {ExternalVideo as ExternalVideoType} from './storefront-api-types.js';
import type {Entries, PartialDeep} from 'type-fest';
import {forwardRef, IframeHTMLAttributes, type JSX} from 'react';

export interface ExternalVideoBaseProps {
  /**
   * An object with fields that correspond to the Storefront API's [ExternalVideo object](https://shopify.dev/api/storefront/reference/products/externalvideo).
   */
  data: PartialDeep<ExternalVideoType, {recurseIntoArrays: true}>;
  /** An object containing the options available for either
   * [YouTube](https://developers.google.com/youtube/player_parameters#Parameters) or
   * [Vimeo](https://vimeo.zendesk.com/hc/en-us/articles/360001494447-Using-Player-Parameters).
   */
  options?: YouTube | Vimeo;
}

export type ExternalVideoProps = Omit<
  IframeHTMLAttributes<HTMLIFrameElement>,
  'src'
> &
  ExternalVideoBaseProps;

/**
 * The `ExternalVideo` component renders an embedded video for the Storefront
 * API's [ExternalVideo object](https://shopify.dev/api/storefront/reference/products/externalvideo).
 */
export const ExternalVideo = forwardRef<HTMLIFrameElement, ExternalVideoProps>(
  (props, ref): JSX.Element => {
    const {
      data,
      options,
      id = data.id,
      frameBorder = '0',
      allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture',
      allowFullScreen = true,
      loading = 'lazy',
      ...passthroughProps
    } = props;

    if (!data.embedUrl) {
      throw new Error(`<ExternalVideo/> requires the 'embedUrl' property`);
    }

    let finalUrl: string = data.embedUrl;

    if (options) {
      const urlObject = new URL(data.embedUrl);
      for (const [key, value] of Object.entries(options) as Entries<
        typeof options
      >) {
        if (typeof value === 'undefined') {
          continue;
        }

        urlObject.searchParams.set(key, value.toString());
      }
      finalUrl = urlObject.toString();
    }

    return (
      <iframe
        {...passthroughProps}
        id={id ?? data.embedUrl}
        title={data.alt ?? data.id ?? 'external video'}
        frameBorder={frameBorder}
        allow={allow}
        allowFullScreen={allowFullScreen}
        src={finalUrl}
        loading={loading}
        ref={ref}
      ></iframe>
    );
  },
);

interface YouTube {
  autoplay?: 0 | 1;
  cc_lang_pref?: string;
  cc_load_policy?: 1;
  color?: 'red' | 'white';
  controls?: 0 | 1;
  disablekb?: 0 | 1;
  enablejsapi?: 0 | 1;
  end?: number;
  fs?: 0 | 1;
  hl?: string;
  iv_load_policy?: 1 | 3;
  list?: string;
  list_type?: 'playlist' | 'user_uploads';
  loop?: 0 | 1;
  modest_branding?: 1;
  origin?: string;
  playlist?: string;
  plays_inline?: 0 | 1;
  rel?: 0 | 1;
  start?: number;
  widget_referrer?: string;
}

type VimeoBoolean = 0 | 1 | boolean;

interface Vimeo {
  autopause?: VimeoBoolean;
  autoplay?: VimeoBoolean;
  background?: VimeoBoolean;
  byline?: VimeoBoolean;
  color?: string;
  controls?: VimeoBoolean;
  dnt?: VimeoBoolean;
  loop?: VimeoBoolean;
  muted?: VimeoBoolean;
  pip?: VimeoBoolean;
  playsinline?: VimeoBoolean;
  portrait?: VimeoBoolean;
  quality?: '240p' | '360p' | '540p' | '720p' | '1080p' | '2k' | '4k';
  speed?: VimeoBoolean;
  '#t'?: string;
  texttrack?: string;
  title?: VimeoBoolean;
  transparent?: VimeoBoolean;
}
