import type { Handle } from "remix/component";

import { shopifyImageSrcSet, shopifyImageUrl } from "../../lib/public/image.ts";

export type ImageData = {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

/** A responsive `<img>` for a Storefront API image. Hydrogen ships helpers, not components. */
export function Image(
  handle: Handle<{
    data: ImageData;
    alt?: string;
    /** Square crops use `1`. Defaults to the image's own ratio. */
    aspectRatio?: number;
    sizes?: string;
    loading?: "eager" | "lazy";
    width?: number;
    height?: number;
  }>,
) {
  return () => {
    const { alt, aspectRatio, data, loading = "lazy", sizes, width, height } = handle.props;
    const ratio = aspectRatio ?? (data.width && data.height ? data.width / data.height : undefined);

    if (width) {
      const fixedHeight = height ?? (ratio ? Math.round(width / ratio) : undefined);
      return (
        <img
          alt={alt ?? data.altText ?? ""}
          src={shopifyImageUrl(data.url, { width, height: fixedHeight, crop: "center" })}
          srcSet={`${shopifyImageUrl(data.url, {
            width: width * 2,
            height: fixedHeight ? fixedHeight * 2 : undefined,
            crop: "center",
          })} 2x`}
          width={width}
          height={fixedHeight}
          loading={loading}
        />
      );
    }

    return (
      <img
        alt={alt ?? data.altText ?? ""}
        src={shopifyImageUrl(data.url, { width: 800 })}
        srcSet={shopifyImageSrcSet(data.url, { aspectRatio })}
        sizes={sizes ?? "100vw"}
        style={{
          width: "100%",
          ...(ratio ? { aspectRatio: String(ratio), objectFit: "cover" } : {}),
        }}
        width={data.width ?? undefined}
        height={data.height ?? undefined}
        loading={loading}
      />
    );
  };
}
